
import { P2PMessage, P2PMessageType, UserProfile } from '../types';

const CHANNEL_NAME = 'dine_decide_p2p_v1';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8787';

class P2PService {
  private channel: BroadcastChannel;
  private listeners: ((msg: P2PMessage) => void)[] = [];
  private socket?: WebSocket;
  private isSocketReady = false;
  private reconnectTimer?: number;
  private activeGroupId?: string;
  private activeUser?: UserProfile;

  constructor() {
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event) => {
      this.notifyListeners(event.data);
    };
    this.connectSocket();
  }

  // Register the group/user so the server knows where to route messages.
  public joinGroup(groupId: string, user: UserProfile) {
    this.activeGroupId = groupId;
    this.activeUser = user;
    this.sendJoinHandshake();
  }

  private connectSocket() {
    try {
      this.socket = new WebSocket(WS_URL);
    } catch (err) {
      console.warn('Realtime server not reachable, falling back to local BroadcastChannel only.', err);
      return;
    }

    this.socket.onopen = () => {
      this.isSocketReady = true;
      this.sendJoinHandshake();
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'P2P_MESSAGE' && data.data) {
          this.notifyListeners(data.data as P2PMessage);
        }
      } catch (err) {
        console.error('Failed to parse realtime message', err);
      }
    };

    const scheduleReconnect = () => {
      this.isSocketReady = false;
      if (this.reconnectTimer) return;
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = undefined;
        this.connectSocket();
      }, 2000);
    };

    this.socket.onclose = scheduleReconnect;
    this.socket.onerror = scheduleReconnect;
  }

  private sendJoinHandshake() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    if (!this.activeGroupId || !this.activeUser) return;
    this.socket.send(
      JSON.stringify({
        type: 'JOIN_GROUP',
        groupId: this.activeGroupId,
        user: this.activeUser,
      })
    );
  }

  // Send a message to remote peers via WebSocket and to local tabs via BroadcastChannel.
  public send(type: P2PMessageType, groupId: string, senderId: string, payload?: any) {
    const message: P2PMessage = { type, groupId, senderId, payload };

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: 'P2P_MESSAGE', data: message }));
    }

    this.channel.postMessage(message);
  }

  // Subscribe to messages
  public subscribe(callback: (msg: P2PMessage) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(msg: P2PMessage) {
    this.listeners.forEach(l => l(msg));
  }
}

// Singleton instance
export const p2p = new P2PService();
