import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import api from '../src/api/axios'

beforeEach(() => {
  api.defaults.adapter = () => Promise.reject(new Error('Test did not install an API mock'))
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
})
