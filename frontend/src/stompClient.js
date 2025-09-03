// frontend/src/stompClient.js
import { Client } from '@stomp/stompjs';

let stompClient = null;
let subscriptions = {};

function backendBase() {
  const raw = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
  return raw.replace(/\/api\/?$/, '');
}

export function initStomp(token) {
  if (stompClient && stompClient.connected) return stompClient;

  // Use WebSocket directly instead of SockJS for better STOMP compatibility
  const wsUrl = `${backendBase().replace('http', 'ws')}/ws?token=${token}`;
  
  stompClient = new Client({
    webSocketFactory: () => new WebSocket(wsUrl),
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
        callback(message.body); // fallback to raw body
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
      body: JSON.stringify(body) 
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
