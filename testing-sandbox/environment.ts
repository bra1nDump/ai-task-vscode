const userMap = {
  // @bread Add a especial entry -1 for 'Unknown user'
  '1': 'John',
  '2': 'Jane',
  '3': 'Bob',
  '4': 'Alice',
  '5': 'Eve',
  '6': 'Mallory',
  '7': 'Trent',
  '8': 'Carol',
  '9': 'Dave',
  '10': 'Victor',
}

// @bread Use this function to get the current user's name. If user id was not supplied, default to user id for unknown user
export function getCurrentUserName() {
  return userMap[process.env.USER_ID!]
}
