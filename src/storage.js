// Browser-only UI data, not real authentication. No passwords or tokens.
export const ACCOUNTS_KEY = 'login-motion-lab.accounts.v2'
export const SESSION_KEY = 'login-motion-lab.session.v2'
function validProfile(value) {
  return value && typeof value === 'object' &&
    typeof value.name === 'string' && value.name.trim().length >= 2 && value.name.length <= 60 &&
    typeof value.email === 'string' && value.email.length <= 100 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch { return false }
}
function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function removeKey(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch { return false }
}
export function readAccounts() {
  const value = readJSON(ACCOUNTS_KEY)
  if (!Array.isArray(value)) return []
  return value.filter(validProfile).map(({ name, email }) => ({ name, email }))
}
export function saveAccounts(accounts) {
  if (!Array.isArray(accounts) || !accounts.every(validProfile)) return false
  return writeJSON(ACCOUNTS_KEY, accounts.map(({ name, email }) => ({ name, email })))
}
export function readSession() {
  const value = readJSON(SESSION_KEY)
  return value && typeof value.email === 'string' ? value.email : null
}
export function saveSession(email) { return writeJSON(SESSION_KEY, { email }) }
export function clearSession() { return removeKey(SESSION_KEY) }
