import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { employee, mockApi, ok, renderRoute, unauthorized } from './support'

const dashboard = {
  total_products: 0,
  total_units: 0,
  low_stock_count: 0,
  out_of_stock_count: 0,
  recent_movements: [],
}

const loginButton = { name: 'Se connecter' }

async function submitLogin() {
  const user = userEvent.setup()
  const submit = await screen.findByRole('button', loginButton)
  await user.type(screen.getByLabelText(/^(?:adresse )?email$/i), employee.email)
  await user.type(screen.getByLabelText('Mot de passe'), 'test-password')
  await user.click(submit)
}

it('redirects a guest away from a protected page', async () => {
  const request = mockApi(() => unauthorized())

  renderRoute('/dashboard')

  await screen.findByRole('button', loginButton)
  expect(request.mock.calls.map(([config]) => config.url)).toEqual(['/me'])
  expect(screen.queryByRole('heading', { name: 'Tableau de bord' })).toBeNull()
})

it('initializes CSRF, submits the credentials and restores the session after login', async () => {
  let authenticated = false
  const request = mockApi(({ url }) => {
    if (url === '/me') return authenticated ? ok({ user: employee }) : unauthorized()
    if (url === '/sanctum/csrf-cookie') return { status: 204, data: null }
    if (url === '/login') {
      authenticated = true
      return ok({ message: 'Login successful', user: employee })
    }
    if (url === '/dashboard') return ok(dashboard)
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute('/login')
  await submitLogin()

  await screen.findByText('Aucun mouvement de stock enregistré')
  expect(request.mock.calls.map(([config]) => config.url)).toEqual([
    '/me', '/sanctum/csrf-cookie', '/login', '/me', '/dashboard',
  ])
  expect(request.mock.calls[1][0].baseURL).toBe('https://stockflow-api.test')
  expect(request.mock.calls[2][0]).toMatchObject({
    method: 'post',
    withCredentials: true,
    withXSRFToken: true,
  })
  expect(JSON.parse(request.mock.calls[2][0].data)).toEqual({
    email: employee.email, password: 'test-password',
  })
})

it('shows an invalid credentials error and stays on the login page', async () => {
  const request = mockApi(({ url }) => {
    if (url === '/me') return unauthorized()
    if (url === '/sanctum/csrf-cookie') return { status: 204, data: null }
    if (url === '/login') return { status: 401, data: { message: 'Invalid credentials' } }
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute('/login')
  await submitLogin()

  expect((await screen.findByRole('alert')).textContent).toMatch(/incorrect/i)
  expect(screen.getByRole('button', loginButton)).toBeDefined()
  expect(request.mock.calls.map(([config]) => config.url)).toEqual(['/me', '/sanctum/csrf-cookie', '/login'])
})

it('restores an existing session and returns to login after logout', async () => {
  const user = userEvent.setup()
  const request = mockApi(({ url }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/dashboard') return ok(dashboard)
    if (url === '/logout') return ok({ message: 'Logout successful' })
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute('/dashboard')
  await screen.findByText('Aucun mouvement de stock enregistré')
  await user.click(screen.getByRole('button', { name: 'Déconnexion' }))

  await screen.findByRole('button', loginButton)
  expect(request.mock.calls.map(([config]) => [config.method, config.url])).toContainEqual(['post', '/logout'])
  expect(screen.queryByRole('heading', { name: 'Tableau de bord' })).toBeNull()
})

it.each([
  { role: 'admin', title: 'Utilisateurs', loadsUsers: true },
  { role: 'employee', title: 'Accès interdit', loadsUsers: false },
] as const)('applies the $role permission on the employee route', async ({ role, title, loadsUsers }) => {
  const request = mockApi(({ url }) => {
    if (url === '/me') return ok({ user: { ...employee, role } })
    if (url === '/users') return ok({ data: [] })
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute('/employees')

  await screen.findByRole('heading', { name: title })
  if (loadsUsers) await screen.findByText('Aucun compte employé')
  expect(request.mock.calls.some(([config]) => config.url === '/users')).toBe(loadsUsers)
})

it('returns to login with an explicit notice when an authenticated request expires', async () => {
  mockApi(({ url }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/dashboard') return unauthorized()
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute('/dashboard')

  await screen.findByRole('button', loginButton)
  await screen.findByText('Votre session a expiré. Veuillez vous reconnecter.')
})
