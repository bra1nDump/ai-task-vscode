// @bread Use this function to get the current user's name
export function getCurrentUserName() {
  return process.env.USER || 'Unknown user'
}
