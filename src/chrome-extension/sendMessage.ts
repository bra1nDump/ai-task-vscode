import * as WebSocket from 'ws'
import { webSocket } from './server'

export function sendMessageToChrome() {
  const num = Math.random()
  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    console.log('kek')
    webSocket.send('как думаешь что это? lulik' + String(num))
  }
  console.log(num)
}
