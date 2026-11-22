import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import type { CreateStockMovementPayload } from '../src/types/stockMovement'
import { deferred, employee, mockApi, ok, product, renderRoute } from './support'

const route = '/stock-movements/new/12'
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

function created(payload: CreateStockMovementPayload) {
  return {
    status: 201,
    data: {
      message: 'Stock movement created successfully',
      data: { id: 115, user_id: employee.id, ...payload },
    },
  }
}

it('submits one stock entry on a double click and displays the refreshed balance', async () => {
  const user = userEvent.setup()
  const finishPost = deferred<void>()
  let stock = product.quantity
  const request = mockApi(async ({ url, method, data }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/products/12') return ok({ data: { ...product, quantity: stock } })
    if (method === 'post' && url === '/stock-movements') {
      const payload: CreateStockMovementPayload = JSON.parse(data)
      await finishPost.promise
      stock += payload.quantity
      return created(payload)
    }
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute(route)
  await user.type(await screen.findByLabelText('Quantité'), '3')
  await user.dblClick(screen.getByRole('button', { name: 'Enregistrer' }))

  expect((screen.getByRole('button', { name: 'Enregistrement…' }) as HTMLButtonElement).disabled).toBe(true)
  const submissions = request.mock.calls.filter(([config]) => config.method === 'post')
  expect(submissions).toHaveLength(1)
  expect(JSON.parse(submissions[0][0].data)).toEqual({
    idempotency_key: expect.stringMatching(uuid),
    product_id: 12, type: 'in', quantity: 3, note: null,
  })

  finishPost.resolve()
  await screen.findByText('Mouvement enregistré.')
  await screen.findByText('Stock disponible : 13')
})

it('validates the quantity and prevents a withdrawal above the displayed stock', async () => {
  const user = userEvent.setup()
  const request = mockApi(({ url }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/products/12') return ok({ data: product })
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute(route)
  const quantity = await screen.findByLabelText('Quantité')
  await user.selectOptions(screen.getByLabelText('Type de mouvement'), 'out')
  await user.type(quantity, '0')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  await screen.findByText('Saisissez un entier strictement positif.')

  await user.clear(quantity)
  await user.type(quantity, '11')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  await screen.findByText('La quantité dépasse le stock disponible.')
  expect(request.mock.calls.some(([config]) => config.method === 'post')).toBe(false)
})

it('displays the API quantity error when concurrent stock changes invalidate a withdrawal', async () => {
  const user = userEvent.setup()
  let stock = product.quantity
  mockApi(({ url, method }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/products/12') return ok({ data: { ...product, quantity: stock } })
    if (method === 'post' && url === '/stock-movements') {
      stock = 2
      return { status: 422, data: { message: 'Insufficient stock.', errors: { quantity: ['Insufficient stock.'] } } }
    }
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute(route)
  await user.type(await screen.findByLabelText('Quantité'), '5')
  await user.selectOptions(screen.getByLabelText('Type de mouvement'), 'out')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

  await screen.findByText('Insufficient stock.')
  await screen.findByText('Stock disponible : 2')
  expect(screen.queryByText('Mouvement enregistré.')).toBeNull()
})

it('retries an uncertain result with exactly the original movement payload', async () => {
  const user = userEvent.setup()
  const submissions: CreateStockMovementPayload[] = []
  mockApi(({ url, method, data }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/products/12') return ok({ data: product })
    if (method === 'post' && url === '/stock-movements') {
      const payload: CreateStockMovementPayload = JSON.parse(data)
      submissions.push(payload)
      if (submissions.length === 1) return { status: 503, data: { message: 'Service Unavailable' } }
      return created(payload)
    }
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute(route)
  await user.type(await screen.findByLabelText('Quantité'), '4')
  await user.type(screen.getByLabelText('Note (facultative)'), 'Livraison')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
  await screen.findByText(/les informations du mouvement ont été conservées/i)
  await user.click(screen.getByRole('button', { name: 'Réessayer ce mouvement' }))

  await screen.findByText('Mouvement enregistré.')
  expect(submissions).toHaveLength(2)
  expect(submissions[1]).toEqual(submissions[0])
  expect(submissions[1].idempotency_key).toMatch(uuid)
})

it.each([401, 409])('does not replay a stock movement rejected with HTTP %i', async (status) => {
  const user = userEvent.setup()
  const request = mockApi(({ url, method }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/products/12') return ok({ data: product })
    if (method === 'post' && url === '/stock-movements') return { status, data: null }
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute(route)
  await user.type(await screen.findByLabelText('Quantité'), '3')
  await user.click(screen.getByRole('button', { name: 'Enregistrer' }))

  if (status === 401) {
    await screen.findByRole('button', { name: 'Se connecter' })
  } else {
    await screen.findByText(/cette clé correspond déjà à un autre mouvement/i)
    expect(screen.getByRole('button', { name: 'Déconnexion' })).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Réessayer ce mouvement' })).toBeNull()
  }
  expect(request.mock.calls.map(([config]) => [config.method, config.url])).toEqual([
    ['get', '/me'], ['get', '/products/12'], ['post', '/stock-movements'],
  ])
  expect(sessionStorage.length).toBe(0)
})
