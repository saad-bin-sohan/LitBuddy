import { Client } from '@stomp/stompjs';
import { WS_URL, apiJson } from './api/httpClient';

// Gate verbose logging to development builds only.
// import.meta.env.DEV is set by Vite during local development;
// it is false in production builds.
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

let stompClient = null;
let subscriptions = {};

function normalizeWsUrl(rawUrl) {
  if (!rawUrl) return '/ws';
  return rawUrl.replace(/\/+$/, '');
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
      // Pass token in STOMP CONNECT frame headers, NOT in the URL.
      // The URL-based approach logged tokens in every server access log.
      stompClient.connectHeaders = {
        passcode: wsToken,
      };
      stompClient.webSocketFactory = () => new WebSocket(wsUrl);
    },
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,   // ← ADD THIS
    heartbeatOutgoing: 10000,   // ← ADD THIS
    debug: isDev ? (str) => console.log('[STOMP]', str) : () => {},
    onConnect: () => {
      if (isDev) console.log('[STOMP] Connected to server');
    },
    onDisconnect: () => {
      if (isDev) console.log('[STOMP] Disconnected from server');
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
    if (isDev) console.warn('STOMP client not connected, cannot subscribe to:', destination);
    return null;
  }

  try {
    // If a subscription for this destination already exists, clean it up first.
    // Without this, re-subscribing (e.g. on route change or React StrictMode
    // double-invoke) leaks the old server-side subscription handle.
    if (subscriptions[destination]) {
      try {
        subscriptions[destination].unsubscribe();
      } catch (cleanupErr) {
        console.error('[STOMP] Error cleaning up existing subscription:', destination, cleanupErr);
      }
      delete subscriptions[destination];
    }

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
    if (isDev) console.log(`[STOMP] Subscribed to: ${destination}`);
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
      if (isDev) console.log(`[STOMP] Unsubscribed from: ${destination}`);
    } catch (err) {
      console.error('Error unsubscribing from:', destination, err);
    }
  }
}

export function send(destination, body) {
  if (!stompClient || !stompClient.connected) {
    if (isDev) console.warn('STOMP client not connected, cannot send to:', destination);
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
    if (isDev) console.log('[STOMP] Disconnected');
  }
}

export function isStompReady() {
  return stompClient && stompClient.connected;
}
