const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

let wss = null;
let connections = new Map(); // Map connectionId to connection info
let subscriptions = new Map(); // Map destination to array of connectionIds

function initServer(server, options = {}) {
  wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    verifyClient: (info) => {
      // Extract token from query string or headers
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token') || 
                   info.req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) return false;
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        info.req.userId = decoded.id;
        return true;
      } catch (err) {
        return false;
      }
    }
  });

  wss.on('connection', (ws, req) => {
    const connectionId = Date.now() + Math.random();
    const userId = req.userId;
    
    console.log(`STOMP WebSocket connected: user ${userId}`);
    
    // Store connection info
    connections.set(connectionId, {
      ws,
      userId,
      subscriptions: new Set()
    });

    // Send CONNECTED frame
    ws.send(JSON.stringify({
      command: 'CONNECTED',
      version: '1.2',
      headers: {
        'heart-beat': '0,0',
        'server': 'LitBuddy-STOMP/1.0'
      }
    }));

    ws.on('message', (data) => {
      try {
        const frame = JSON.parse(data.toString());
        handleStompFrame(connectionId, frame);
      } catch (err) {
        console.error('Error parsing STOMP frame:', err);
      }
    });

    ws.on('close', () => {
      console.log(`STOMP WebSocket disconnected: user ${userId}`);
      // Remove all subscriptions for this connection
      const connection = connections.get(connectionId);
      if (connection) {
        connection.subscriptions.forEach(destination => {
          removeSubscription(destination, connectionId);
        });
      }
      connections.delete(connectionId);
    });

    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });

  return { wss, publish };
}

function handleStompFrame(connectionId, frame) {
  const connection = connections.get(connectionId);
  if (!connection) return;

  switch (frame.command) {
    case 'SUBSCRIBE':
      const destination = frame.headers.destination;
      if (destination) {
        addSubscription(destination, connectionId);
        console.log(`User ${connection.userId} subscribed to ${destination}`);
      }
      break;
      
    case 'SEND':
      // Handle client sending messages (if needed)
      console.log(`User ${connection.userId} sent message to ${frame.headers.destination}`);
      break;
      
    case 'DISCONNECT':
      // Connection will be closed by WebSocket close event
      break;
  }
}

function addSubscription(destination, connectionId) {
  if (!subscriptions.has(destination)) {
    subscriptions.set(destination, new Set());
  }
  subscriptions.get(destination).add(connectionId);
  
  const connection = connections.get(connectionId);
  if (connection) {
    connection.subscriptions.add(destination);
  }
}

function removeSubscription(destination, connectionId) {
  const destSubs = subscriptions.get(destination);
  if (destSubs) {
    destSubs.delete(connectionId);
    if (destSubs.size === 0) {
      subscriptions.delete(destination);
    }
  }
}

function publish(destination, body, headers = {}) {
  if (!wss) {
    console.warn('STOMP broker not initialized');
    return;
  }

  const messageBody = typeof body === 'string' ? body : JSON.stringify(body);
  const frame = {
    command: 'MESSAGE',
    headers: {
      destination,
      'content-type': 'application/json',
      'message-id': Date.now() + Math.random(),
      ...headers
    },
    body: messageBody
  };

  const destSubs = subscriptions.get(destination);
  if (destSubs) {
    destSubs.forEach(connectionId => {
      const connection = connections.get(connectionId);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(JSON.stringify(frame));
        } catch (err) {
          console.error('Error sending STOMP message:', err);
        }
      }
    });
  }
}

function getConnectionCount() {
  return connections.size;
}

function getSubscriptionCount() {
  return subscriptions.size;
}

module.exports = { 
  initServer, 
  publish, 
  getConnectionCount, 
  getSubscriptionCount 
};
