import * as WebSocket from 'ws'
import getPort from 'get-port'

export let webSocket: WebSocket | null = null

export async function startWebSocketServer() {
  const portsRange = [3228, 3229, 3230, 3231, 3232]

  const port = await getPort({ port: portsRange })

  const server = new WebSocket.Server({ port }, () => {
    console.log(`WebSocket started at port ${port}`)
  })

  server.on('connection', (ws: WebSocket) => {
    webSocket = ws
    ws.on('message', (message: string) => {
      console.log(`Message received: ${message}`)
    })

    ws.on('error', (error: Error) => {
      console.error(`Error: ${error.message}`)
    })

    ws.on('close', () => {
      console.log('Connection closed')
    })

    ws.send('Hello from server!')
  })
}
