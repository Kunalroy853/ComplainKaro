import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import jwt from 'jsonwebtoken';

interface ConnectedClient {
  ws: WebSocket;
  role: 'warden' | 'student';
  userId: string;
}

const clients = new Set<ConnectedClient>();

export function initWebSocketServer(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Authenticate via token in query string
    const url = new URL(req.url || '', `http://localhost`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Missing auth token');
      return;
    }

    let decoded: { userId: string; role: 'student' | 'warden' };
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as typeof decoded;
    } catch {
      ws.close(4003, 'Invalid token');
      return;
    }

    const client: ConnectedClient = {
      ws,
      role: decoded.role,
      userId: decoded.userId,
    };
    clients.add(client);

    console.log(JSON.stringify({
      level: 'info',
      stage: 'websocket',
      event: 'client_connected',
      role: decoded.role,
      userId: decoded.userId,
      total_clients: clients.size,
    }));

    ws.on('close', () => {
      clients.delete(client);
      console.log(JSON.stringify({
        level: 'info',
        stage: 'websocket',
        event: 'client_disconnected',
        role: decoded.role,
        total_clients: clients.size,
      }));
    });

    ws.on('error', (err) => {
      console.error(JSON.stringify({
        level: 'error',
        stage: 'websocket',
        error: err.message,
      }));
      clients.delete(client);
    });

    // Send a welcome ping
    ws.send(JSON.stringify({ type: 'connected', message: 'VocalLabs WebSocket ready' }));
  });

  return wss;
}

// ─── Push helpers ─────────────────────────────────────────────────────────────

function broadcast(event: object, targetRole?: 'warden' | 'student'): void {
  const payload = JSON.stringify(event);
  let sent = 0;
  for (const client of clients) {
    if (client.ws.readyState !== WebSocket.OPEN) continue;
    if (targetRole && client.role !== targetRole) continue;
    client.ws.send(payload);
    sent++;
  }
  console.log(JSON.stringify({
    level: 'info',
    stage: 'websocket',
    event: 'broadcast',
    type: (event as any).type,
    recipients: sent,
    target_role: targetRole || 'all',
  }));
}

/** Push a new ticket to all connected wardens */
export function pushNewTicket(ticket: object): void {
  broadcast({ type: 'ticket:new', data: ticket }, 'warden');
}

/** Push a duplicate event (parent ticket updated) to all connected wardens */
export function pushDuplicateTicket(parentTicket: object, duplicateId: string): void {
  broadcast({ type: 'ticket:duplicate', data: { parentTicket, duplicateId } }, 'warden');
}

/** Push a ticket resolved event to all connected clients */
export function pushTicketResolved(ticketId: string): void {
  broadcast({ type: 'ticket:resolved', data: { ticketId } });
}

/** Push a ticket deleted event to all connected clients */
export function pushTicketDeleted(ticketId: string): void {
  broadcast({ type: 'ticket:deleted', data: { ticketId } });
}
