import * as WebSocket from 'ws'

export function startWebSocketServer() {
  const port = 3228
  const server = new WebSocket.Server({ port }, () => {
    console.log(`WebSocket started at port ${port}`)
  })

  server.on('connection', (ws: WebSocket) => {
    ws.on('message', (message: string) => {
      console.log(`Message received: ${message}`)
      ws.send('lulik' + String(Math.random()))
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
