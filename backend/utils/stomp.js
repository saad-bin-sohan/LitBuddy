// backend/utils/stomp.js
const stompit = require('stompit');
const { logger } = require('./logger');

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
      logger.error({ err }, 'stomp_legacy.connection_failed');
      setTimeout(connect, 5000); // retry after 5s
      return;
    }
    client = c;
    logger.info('stomp_legacy.connected');

    client.on('error', (e) => {
      logger.error({ err: e }, 'stomp_legacy.client_error');
      client = null;
      setTimeout(connect, 5000);
    });
  });
}

function publish(destination, body, headers = {}) {
  if (!client) {
    logger.error({ destination }, 'stomp_legacy.publish_dropped_client_not_connected');
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
