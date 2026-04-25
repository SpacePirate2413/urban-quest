import type { WebSocket } from 'ws';

// Map of userId -> Set of connected WebSocket clients
const clients = new Map<string, Set<WebSocket>>();

export function registerClient(userId: string, socket: WebSocket) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(socket);

  socket.on('close', () => {
    const userSockets = clients.get(userId);
    if (userSockets) {
      userSockets.delete(socket);
      if (userSockets.size === 0) {
        clients.delete(userId);
      }
    }
  });
}

export function notifyUser(userId: string, event: string, payload: Record<string, unknown>) {
  const userSockets = clients.get(userId);
  if (!userSockets) return;

  const message = JSON.stringify({ event, ...payload });
  for (const socket of userSockets) {
    if (socket.readyState === 1) { // WebSocket.OPEN
      socket.send(message);
    }
  }
}
