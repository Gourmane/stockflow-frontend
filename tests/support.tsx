import { render } from '@testing-library/react'
import { AxiosError } from 'axios'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import App from '../src/App'
import api from '../src/api/axios'
import { AuthProvider } from '../src/context/AuthProvider'
import type { User } from '../src/types/auth'
import type { Product } from '../src/types/product'

export const employee: User = {
  id: 7,
  name: 'Test Employee',
  email: 'employee@example.test',
  role: 'employee',
  is_active: true,
}

export const product: Product = {
  id: 12,
  category_id: 3,
  category: { id: 3, name: 'Câbles', created_at: null, updated_at: null },
  sku: 'USB-C-12',
  name: 'Câble USB-C',
  brand: null,
  unit_price: '15.00',
  quantity: 10,
  min_stock: 2,
  is_active: 1,
  image_url: null,
  created_at: null,
  updated_at: null,
}

export function renderRoute(path: string, reactStrictMode = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
    { reactStrictMode },
  )
}

type ApiReply = { status: number; data: unknown }

export function mockApi(
  respond: (request: InternalAxiosRequestConfig) => ApiReply | Promise<ApiReply>,
) {
  const adapter = vi.fn<AxiosAdapter>(async (config) => {
    const { status, data } = await respond(config)
    const response: AxiosResponse = { config, data, status, statusText: '', headers: {} }
    if (status >= 400) {
      throw new AxiosError('Mock HTTP error', undefined, config, undefined, response)
    }
    return response
  })

  api.defaults.adapter = adapter
  return adapter
}

export function ok(data: unknown): ApiReply {
  return { status: 200, data }
}

export function unauthorized(): ApiReply {
  return { status: 401, data: { message: 'Unauthenticated.' } }
}

export function deferred<T>() {
  let resolve: (value: T) => void
  const promise = new Promise<T>((complete) => { resolve = complete })

  return { promise, resolve: (value: T) => resolve(value) }
}
