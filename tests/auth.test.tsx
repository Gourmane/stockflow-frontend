import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError } from 'axios'
import { expect, it } from 'vitest'
import api from '../src/api/axios'
import { deferred, employee, mockApi, ok, renderRoute, unauthorized } from './support'

const dashboard = {
  total_products: 0,
  total_units: 0,
  low_stock_count: 0,
  out_of_stock_count: 0,
  recent_movements: [],
}

const loginButton = { name: 'Se connecter' }
const logoutButton = { name: 'Déconnexion' }
const expiredNotice = 'Votre session a expiré. Veuillez vous reconnecter.'

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

it.each([
  { logoutStatus: 200, expected: ['/me', '/dashboard', '/logout'] },
  { logoutStatus: 401, expected: ['/me', '/dashboard', '/logout'] },
  { logoutStatus: 419, expected: ['/me', '/dashboard', '/logout', '/sanctum/csrf-cookie', '/logout'] },
])('restores the session and handles HTTP $logoutStatus on logout', async ({ logoutStatus, expected }) => {
  const user = userEvent.setup()
  let logoutAttempts = 0
  const request = mockApi(({ url }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/dashboard') return ok(dashboard)
    if (url === '/logout') {
      const status = logoutAttempts++ === 0 ? logoutStatus : 200
      return { status, data: { message: 'Logout response' } }
    }
    if (url === '/sanctum/csrf-cookie') return { status: 204, data: null }
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute('/dashboard')
  await screen.findByText('Aucun mouvement de stock enregistré')
  await user.click(screen.getByRole('button', logoutButton))

  await screen.findByRole('button', loginButton)
  expect(request.mock.calls.map(([config]) => config.url)).toEqual(expected)
  expect(request.mock.calls[2][0].method).toBe('post')
  expect(screen.queryByText(expiredNotice)).toBeNull()
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

it.each([
  { path: '/dashboard', endpoint: '/dashboard', role: 'employee' },
  { path: '/products', endpoint: '/products', role: 'employee' },
  { path: '/stock-movements', endpoint: '/stock-movements', role: 'employee' },
  { path: '/employees', endpoint: '/users', role: 'admin' },
] as const)('clears the authenticated session and returns to login from $path on HTTP 401', async ({ path, endpoint, role }) => {
  const request = mockApi(({ url }) => {
    if (url === '/me') return ok({ user: { ...employee, role } })
    if (url === endpoint) return unauthorized()
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute(path)

  await screen.findByRole('button', loginButton)
  await screen.findByText(expiredNotice)
  expect(screen.queryByRole('button', logoutButton)).toBeNull()
  expect(request.mock.calls.map(([config]) => config.url)).toEqual(['/me', endpoint])
})

it('redirects once and returns the Axios errors for concurrent HTTP 401 responses', async () => {
  const reply = deferred<ReturnType<typeof unauthorized>>()
  const request = mockApi(({ url }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/dashboard') return ok(dashboard)
    if (url === '/products' || url === '/stock-movements') return reply.promise
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute('/dashboard', true)
  await screen.findByText('Aucun mouvement de stock enregistré')

  const responses = Promise.allSettled([api.get('/products'), api.get('/stock-movements')])
  await waitFor(() => expect(request).toHaveBeenCalledTimes(4))
  await act(async () => {
    reply.resolve(unauthorized())
    expect(await responses).toMatchObject([
      { status: 'rejected', reason: { isAxiosError: true, response: { status: 401 }, config: { url: '/products' } } },
      { status: 'rejected', reason: { isAxiosError: true, response: { status: 401 }, config: { url: '/stock-movements' } } },
    ])
  })

  await screen.findByRole('button', loginButton)
  expect(screen.getAllByText(expiredNotice)).toHaveLength(1)
  expect(request.mock.calls.map(([config]) => config.url)).toEqual(['/me', '/dashboard', '/products', '/stock-movements'])
})

it('keeps the new session when an old request returns HTTP 401 after signing in again', async () => {
  const oldReply = deferred<ReturnType<typeof unauthorized>>()
  const request = mockApi(({ url }) => {
    if (url === '/me') return ok({ user: employee })
    if (url === '/dashboard') return ok(dashboard)
    if (url === '/products') return oldReply.promise
    if (url === '/stock-movements') return unauthorized()
    if (url === '/sanctum/csrf-cookie') return { status: 204, data: null }
    if (url === '/login') return ok({ message: 'Login successful', user: employee })
    throw new Error('Unexpected endpoint: ' + url)
  })

  renderRoute('/dashboard')
  await screen.findByText('Aucun mouvement de stock enregistré')
  const oldResponse = api.get('/products').catch((error: unknown) => error)
  await waitFor(() => expect(request).toHaveBeenCalledTimes(3))

  await act(async () => {
    await expect(api.get('/stock-movements')).rejects.toMatchObject({ response: { status: 401 } })
  })
  await screen.findByText(expiredNotice)
  await submitLogin()
  await screen.findByText('Aucun mouvement de stock enregistré')

  await act(async () => {
    oldReply.resolve(unauthorized())
    expect(await oldResponse).toMatchObject({ response: { status: 401 } })
  })
  expect(screen.getByRole('button', logoutButton)).toBeDefined()
  expect(screen.queryByRole('button', loginButton)).toBeNull()
  expect(request.mock.calls.map(([config]) => config.url)).toEqual([
    '/me', '/dashboard', '/products', '/stock-movements', '/sanctum/csrf-cookie', '/login', '/me', '/dashboard',
  ])
})

it.each([
  { status: 403, message: 'Vous n’avez pas accès aux produits.' },
  { status: 419, message: 'La vérification de sécurité a échoué. Réessayez.' },
  { status: 429, message: 'Impossible de charger les produits.' },
  { status: 500, message: 'Impossible de charger les produits.' },
  { status: undefined, message: 'Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.' },
])('retains the authenticated session and shows the products error for status $status', async ({ status, message }) => {
  const request = mockApi((config) => {
    if (config.url === '/me') return ok({ user: employee })
    if (config.url === '/products') {
      if (status === undefined) throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)
      return { status, data: null }
    }
    throw new Error('Unexpected endpoint: ' + config.url)
  })

  renderRoute('/products')

  await screen.findByText(message)
  expect(screen.getByRole('button', logoutButton)).toBeDefined()
  expect(screen.queryByRole('button', loginButton)).toBeNull()
  expect(request.mock.calls.map(([config]) => config.url)).toEqual(['/me', '/products'])
})
