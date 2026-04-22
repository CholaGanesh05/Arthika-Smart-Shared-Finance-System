import { io } from 'socket.io-client'
import { getSocketUrl } from './api'

let socket

export function getSocket() {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  }

  return socket
}
