// @bread Get user name from environment
export function getCurrentUserName() {
  return process.env.USER || 'Unknown user'
}
