import axios from 'axios'
import { accessTokenStore } from '../utils/accessTokenStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

const shouldSkipAuth = (config = {}) => {
  const url = String(config.url || '').toLowerCase()

  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  )
}

let refreshPromise = null

api.interceptors.request.use((config) => {
  if (shouldSkipAuth(config)) {
    return config
  }

  const token = accessTokenStore.get()
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {}

    if (
      error.response?.status === 401 &&
      !originalRequest.__isRetry &&
      !shouldSkipAuth(originalRequest)
    ) {
      originalRequest.__isRetry = true

      try {
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh')
        }

        const response = await refreshPromise
        const nextToken = response?.data?.data?.accessToken

        if (!nextToken) {
          throw new Error('Missing access token after refresh')
        }

        accessTokenStore.set(nextToken)

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${nextToken}`,
        }

        return api(originalRequest)
      } catch (refreshError) {
        accessTokenStore.clear()
        window.dispatchEvent(new CustomEvent('auth:expired'))
        return Promise.reject(refreshError)
      } finally {
        refreshPromise = null
      }
    }

    return Promise.reject(error)
  },
)

export { API_BASE_URL }
export default api
