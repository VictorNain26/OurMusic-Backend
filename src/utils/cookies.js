export function createRefreshCookie(token) {
  return `refresh=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`;
}

export function clearRefreshCookie() {
  return `refresh=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`;
}
