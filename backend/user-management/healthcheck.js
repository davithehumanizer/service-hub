const net = require('net');

const client = new net.Socket();
const PORT = 3001;
const HOST = 'localhost';

client.connect(PORT, HOST, () => {
  console.log('User-management is up');
  process.exit(0);
});

client.on('error', () => {
  console.error('User-management is down');
  process.exit(1);
});
