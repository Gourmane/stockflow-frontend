import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import type { Pagination } from '../src/types/api'
import type { Product } from '../src/types/product'
import { deferred, employee, mockApi, ok, product, renderRoute } from './support'

function page(items: Product[], currentPage: number, total: number): Pagination<Product> {
  const path = 'https://stockflow-api.test/api/products'
  const perPage = 10
  const lastPage = Math.max(1, Math.ceil(total / perPage))
  const pageUrl = (number: number) => path + '?page=' + number
  const prev = currentPage > 1 ? pageUrl(currentPage - 1) : null
  const next = currentPage < lastPage ? pageUrl(currentPage + 1) : null
  const from = items.length ? (currentPage - 1) * perPage + 1 : null
  return {
    data: items,
    current_page: currentPage,
    first_page_url: pageUrl(1),
    from,
    last_page: lastPage,
    last_page_url: pageUrl(lastPage),
    links: [
      { url: prev, label: '&laquo; Previous', active: false },
      ...Array.from({ length: lastPage }, (_, index) => ({
        url: pageUrl(index + 1), label: String(index + 1), page: index + 1, active: index + 1 === currentPage,
      })),
      { url: next, label: 'Next &raquo;', active: false },
    ],
    next_page_url: next,
    path,
    per_page: perPage,
    prev_page_url: prev,
    to: from === null ? null : from + items.length - 1,
    total,
  }
}

it('shows the requested product page and replaces its rows when the user goes forward', async () => {
  const user = userEvent.setup()
  const firstPage = [product, ...Array.from({ length: 9 }, (_, index) => ({
    ...product, id: 20 + index, sku: 'SKU-' + index, name: 'Câble ' + index,
  }))]
  const secondPage = [{ ...product, id: 30, sku: 'HDMI-30', name: 'Câble HDMI' }]
  const request = mockApi(({ url, params }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/products' && params.page === 1) return ok(page(firstPage, 1, 11))
    if (url === '/products' && params.page === 2) return ok(page(secondPage, 2, 11))
    throw new Error('Unexpected endpoint or page: ' + url)
  })

  renderRoute('/products')
  await screen.findByRole('link', { name: 'Câble USB-C' })
  expect(screen.getByText('USB-C-12')).toBeDefined()
  await user.click(screen.getByRole('button', { name: 'Suivant' }))

  const productLink = await screen.findByRole('link', { name: 'Câble HDMI' })
  expect(productLink.getAttribute('href')).toBe('/products/30?page=2')
  expect(screen.queryByRole('link', { name: 'Câble USB-C' })).toBeNull()
  expect(screen.getByText('Page 2 sur 2')).toBeDefined()
  expect(request.mock.calls.filter(([config]) => config.url === '/products').map(([config]) => config.params.page))
    .toEqual([1, 2])
})

it('shows loading, a recoverable catalog error and the empty state after retry', async () => {
  const user = userEvent.setup()
  const firstLoad = deferred<{ status: number; data: unknown }>()
  let attempts = 0
  mockApi(({ url }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/products') {
      attempts += 1
      return attempts === 1 ? firstLoad.promise : ok(page([], 1, 0))
    }
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute('/products')
  await screen.findByText('Chargement des produits…')
  firstLoad.resolve({ status: 500, data: { message: 'Server Error' } })

  await screen.findByText('Impossible de charger les produits.')
  await user.click(screen.getByRole('button', { name: 'Réessayer' }))

  await screen.findByText('Aucun produit')
  expect(screen.queryByText('Impossible de charger les produits.')).toBeNull()
  expect(attempts).toBe(2)
})

it('validates required product fields and displays a duplicate SKU on the matching input', async () => {
  const user = userEvent.setup()
  const duplicateSku = 'The sku has already been taken.'
  const request = mockApi(({ url, method }) => {
    if (url === '/me') return ok({ user: { ...employee, role: 'admin' } })
    if (url === '/categories') return ok({ data: [product.category] })
    if (method === 'post' && url === '/products') {
      return { status: 422, data: { message: duplicateSku, errors: { sku: [duplicateSku] } } }
    }
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute('/products/new')
  const submit = await screen.findByRole('button', { name: 'Créer le produit' })
  await user.click(submit)

  await screen.findByText('Saisissez un nom.')
  expect(screen.getByText('Sélectionnez une catégorie.')).toBeDefined()
  expect(request.mock.calls.some(([config]) => config.method === 'post')).toBe(false)

  await user.type(screen.getByLabelText('Nom du produit'), 'Câble de remplacement')
  await user.type(screen.getByLabelText('SKU'), product.sku)
  await user.selectOptions(screen.getByLabelText('Catégorie'), String(product.category_id))
  await user.click(submit)

  await screen.findByText(duplicateSku)
  expect(screen.getByLabelText('SKU').getAttribute('aria-invalid')).toBe('true')
  const submitted = request.mock.calls.filter(([config]) => config.method === 'post')
  expect(submitted).toHaveLength(1)
  expect(JSON.parse(submitted[0][0].data)).toEqual({
    category_id: 3, sku: product.sku, name: 'Câble de remplacement', min_stock: 0,
    brand: null, unit_price: null, image_url: null,
  })
})
