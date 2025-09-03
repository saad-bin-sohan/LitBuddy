// backend/utils/stomp.js
const stompit = require('stompit');

let client = null;

function connect() {
  const connectOptions = {
    host: process.env.STOMP_HOST || 'localhost',
    port: process.env.STOMP_PORT || 61613,
    connectHeaders: {
      host: '/',
      login: process.env.STOMP_USER || 'guest',
      passcode: process.env.STOMP_PASS || 'guest',
    },
  };

  stompit.connect(connectOptions, (err, c) => {
    if (err) {
      console.error('STOMP connection error:', err.message);
      setTimeout(connect, 5000); // retry after 5s
      return;
    }
    client = c;
    console.log('Connected to STOMP broker');

    client.on('error', (e) => {
      console.error('STOMP client error:', e.message);
      client = null;
      setTimeout(connect, 5000);
    });
  });
}

function publish(destination, body, headers = {}) {
  if (!client) {
    console.error('STOMP client not connected. Dropping message to', destination);
    return;
  }
  const frame = client.send({
    destination,
    'content-type': 'application/json',
    ...headers,
  });
  frame.write(JSON.stringify(body));
  frame.end();
}

function getClient() {
  return client;
}

module.exports = { connect, publish, getClient };