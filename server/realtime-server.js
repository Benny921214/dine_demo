// Simple WebSocket relay server for multi-device group sync.
// It keeps track of which sockets joined which group and forwards
// P2P-style messages to peers in the same group.
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8787);

const wss = new WebSocketServer({ port: PORT });
const groups = new Map(); // groupId -> Set<WebSocket>

const sendJson = (ws, data) => {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
};

const removeFromGroup = (ws, groupId) => {
  const set = groups.get(groupId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) {
    groups.delete(groupId);
  }
};

wss.on('connection', (ws) => {
  let joinedGroup = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (err) {
      console.error('Invalid JSON from client', err);
      return;
    }

    // Client asks to join a group so we know where to broadcast.
    if (msg.type === 'JOIN_GROUP' && msg.groupId) {
      joinedGroup = msg.groupId;
      const peers = groups.get(joinedGroup) || new Set();
      peers.add(ws);
      groups.set(joinedGroup, peers);

      // Optional acknowledgement so client can show status if needed.
      sendJson(ws, { type: 'JOINED', groupId: joinedGroup });
      return;
    }

    // Relay P2P message to everyone else in the same group.
    if (msg.type === 'P2P_MESSAGE' && msg.data?.groupId) {
      const targetGroup = msg.data.groupId;
      const peers = groups.get(targetGroup) || new Set();
      for (const peer of peers) {
        if (peer !== ws) {
          sendJson(peer, { type: 'P2P_MESSAGE', data: msg.data });
        }
      }
    }
  });

  ws.on('close', () => {
    if (joinedGroup) {
      removeFromGroup(ws, joinedGroup);
    }
  });
});

console.log(`Realtime relay server listening on ws://localhost:${PORT}`);
