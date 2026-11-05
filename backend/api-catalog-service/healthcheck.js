const net = require('net');

const client = new net.Socket();
const PORT = 3011;
const HOST = 'localhost';

client.connect(PORT, HOST, () => {
  console.log('API Catalog Service is up');
  process.exit(0);
});

client.on('error', () => {
  console.error('API Catalog Service is down');
  process.exit(1);
});
