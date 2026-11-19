let accessToken = null

export const accessTokenStore = {
  set(token) {
    accessToken = token ?? null
    return accessToken
  },
  get() {
    return accessToken
  },
  clear() {
    accessToken = null
    return accessToken
  },
}
