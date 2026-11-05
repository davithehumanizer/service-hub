const net = require('net');

const client = new net.Socket();
const PORT = 3005;
const HOST = 'localhost';

client.connect(PORT, HOST, () => {
  console.log('Ownership Service is up');
  process.exit(0);
});

client.on('error', () => {
  console.error('Ownership Service is down');
  process.exit(1);
});
