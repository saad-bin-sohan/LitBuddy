import { Client } from '@stomp/stompjs';
import { WS_URL, apiJson } from './api/httpClient';

let stompClient = null;
let subscriptions = {};

function normalizeWsUrl(rawUrl) {
  if (!rawUrl) return '/ws';
  return rawUrl.replace(/\/+$/, '');
}

function withQueryToken(url, token) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

async function fetchWsToken() {
  const data = await apiJson('/auth/ws-token');
  if (!data || !data.token) {
    throw new Error('Failed to fetch websocket token');
  }
  return data.token;
}

export function initStomp() {
  if (stompClient && (stompClient.connected || stompClient.active)) return stompClient;

  const wsUrl = normalizeWsUrl(WS_URL);

  stompClient = new Client({
    beforeConnect: async () => {
      const wsToken = await fetchWsToken();
      const tokenizedUrl = withQueryToken(wsUrl, wsToken);
      stompClient.webSocketFactory = () => new WebSocket(tokenizedUrl);
    },
    connectHeaders: {},
    reconnectDelay: 5000,
    debug: (str) => console.log('[STOMP]', str),
    onConnect: () => {
      console.log('[STOMP] Connected to server');
    },
    onDisconnect: () => {
      console.log('[STOMP] Disconnected from server');
    },
    onStompError: (frame) => {
      console.error('[STOMP] Error:', frame);
    },
  });

  stompClient.activate();
  return stompClient;
}

export function getStompClient() {
  return stompClient;
}

export function subscribe(destination, callback) {
  if (!stompClient || !stompClient.connected) {
    console.warn('STOMP client not connected, cannot subscribe to:', destination);
    return null;
  }

  try {
    const sub = stompClient.subscribe(destination, (message) => {
      try {
        const payload = JSON.parse(message.body);
        callback(payload);
      } catch (err) {
        console.error('Error parsing STOMP message:', err);
        callback(message.body);
      }
    });

    subscriptions[destination] = sub;
    console.log(`[STOMP] Subscribed to: ${destination}`);
    return sub;
  } catch (err) {
    console.error('Error subscribing to:', destination, err);
    return null;
  }
}

export function unsubscribe(destination) {
  if (subscriptions[destination]) {
    try {
      subscriptions[destination].unsubscribe();
      delete subscriptions[destination];
      console.log(`[STOMP] Unsubscribed from: ${destination}`);
    } catch (err) {
      console.error('Error unsubscribing from:', destination, err);
    }
  }
}

export function send(destination, body) {
  if (!stompClient || !stompClient.connected) {
    console.warn('STOMP client not connected, cannot send to:', destination);
    return;
  }

  try {
    stompClient.publish({
      destination,
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('Error sending STOMP message:', err);
  }
}

export function disconnectStomp() {
  if (stompClient) {
    stompClient.deactivate();
    stompClient = null;
    subscriptions = {};
    console.log('[STOMP] Disconnected');
  }
}

export function isStompReady() {
  return stompClient && stompClient.connected;
}
