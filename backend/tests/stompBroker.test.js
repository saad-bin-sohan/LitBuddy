const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { once } = require('events');
const WebSocket = require('ws');

const stompBroker = require('../utils/stompBroker');

function toUtf8String(data) {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
  }
  return String(data || '');
}

function createFrame(command, headers = {}, body = '') {
  const normalizedBody = body == null ? '' : String(body);
  const normalizedHeaders = { ...headers };

  if (normalizedBody && normalizedHeaders['content-length'] == null) {
    normalizedHeaders['content-length'] = Buffer.byteLength(normalizedBody, 'utf8');
  }

  let frame = `${command}\n`;
  for (const [key, value] of Object.entries(normalizedHeaders)) {
    frame += `${key}:${value}\n`;
  }
  frame += `\n${normalizedBody}\0`;

  return frame;
}

function parseFrame(rawFrame) {
  const delimiterIndex = rawFrame.indexOf('\n\n');
  const headerPart = delimiterIndex >= 0 ? rawFrame.slice(0, delimiterIndex) : rawFrame;
  const body = delimiterIndex >= 0 ? rawFrame.slice(delimiterIndex + 2) : '';

  const lines = headerPart.split(/\r?\n/);
  const command = (lines.shift() || '').trim();
  const headers = {};

  for (const line of lines) {
    if (!line) continue;
    const sep = line.indexOf(':');
    if (sep <= 0) continue;
    headers[line.slice(0, sep)] = line.slice(sep + 1);
  }

  return { command, headers, body };
}

function waitForOpen(ws, timeoutMs = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('timeout waiting for websocket open'));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      ws.off('open', onOpen);
      ws.off('error', onError);
    };

    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };

    ws.once('open', onOpen);
    ws.once('error', onError);
  });
}

function createFrameCollector(ws) {
  let buffer = '';
  const queue = [];
  const waiters = [];

  ws.on('message', (data) => {
    buffer += toUtf8String(data);

    while (true) {
      const frameEnd = buffer.indexOf('\0');
      if (frameEnd < 0) break;

      const rawFrame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 1);

      if (!rawFrame.trim()) continue;

      const frame = parseFrame(rawFrame);
      if (waiters.length > 0) {
        const waiter = waiters.shift();
        clearTimeout(waiter.timer);
        waiter.resolve(frame);
      } else {
        queue.push(frame);
      }
    }
  });

  ws.on('error', (err) => {
    while (waiters.length > 0) {
      const waiter = waiters.shift();
      clearTimeout(waiter.timer);
      waiter.reject(err);
    }
  });

  return {
    next(timeoutMs = 1000) {
      if (queue.length > 0) {
        return Promise.resolve(queue.shift());
      }

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = waiters.findIndex((waiter) => waiter.resolve === resolve);
          if (index >= 0) waiters.splice(index, 1);
          reject(new Error('timeout waiting for STOMP frame'));
        }, timeoutMs);

        waiters.push({ resolve, reject, timer });
      });
    },
  };
}

test('stomp broker supports connect, subscribe, publish, and unsubscribe', async (t) => {
  const server = http.createServer((req, res) => {
    res.statusCode = 404;
    res.end('Not Found');
  });

  stompBroker.initServer(server, {
    verifyToken: async (token) => {
      if (token === 'valid-token') return { _id: 'user-1' };
      return null;
    },
    allowedOrigins: new Set(['http://localhost:3000']),
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  const { port } = server.address();
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`, {
    headers: {
      Origin: 'http://localhost:3000',
    },
  });

  t.after(() => {
    if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
      ws.terminate();
    }
  });

  await waitForOpen(ws);
  const frames = createFrameCollector(ws);

  ws.send(
    createFrame('CONNECT', {
      'accept-version': '1.2',
      'heart-beat': '0,0',
      passcode: 'valid-token',
    })
  );

  const connectedFrame = await frames.next();
  assert.equal(connectedFrame.command, 'CONNECTED');
  assert.equal(connectedFrame.headers.version, '1.2');

  ws.send(
    createFrame('SUBSCRIBE', {
      id: 'sub-1',
      destination: '/topic/test',
      ack: 'auto',
      receipt: 'subscribe-receipt',
    })
  );

  const subscribeReceipt = await frames.next();
  assert.equal(subscribeReceipt.command, 'RECEIPT');
  assert.equal(subscribeReceipt.headers['receipt-id'], 'subscribe-receipt');

  stompBroker.publish('/topic/test', { ok: true });
  const messageFrame = await frames.next();

  assert.equal(messageFrame.command, 'MESSAGE');
  assert.equal(messageFrame.headers.destination, '/topic/test');
  assert.equal(messageFrame.headers.subscription, 'sub-1');
  assert.deepEqual(JSON.parse(messageFrame.body), { ok: true });

  ws.send(
    createFrame('UNSUBSCRIBE', {
      id: 'sub-1',
      receipt: 'unsubscribe-receipt',
    })
  );

  const unsubscribeReceipt = await frames.next();
  assert.equal(unsubscribeReceipt.command, 'RECEIPT');
  assert.equal(unsubscribeReceipt.headers['receipt-id'], 'unsubscribe-receipt');

  stompBroker.publish('/topic/test', { ok: false });
  await assert.rejects(frames.next(200), /timeout waiting for STOMP frame/);

  ws.close();
  await once(ws, 'close');
});
