const net = require('net');

const client = new net.Socket();
const PORT = 3004;
const HOST = 'localhost';

client.connect(PORT, HOST, () => {
  console.log('Notifications Service is up');
  process.exit(0);
});

client.on('error', () => {
  console.error('Notifications Service is down');
  process.exit(1);
});
