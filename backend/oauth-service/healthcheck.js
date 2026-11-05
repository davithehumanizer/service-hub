const net = require('net');

const client = new net.Socket();
const PORT = 3006;
const HOST = 'localhost';

client.connect(PORT, HOST, () => {
  console.log('OAuth Service is up');
  process.exit(0);
});

client.on('error', () => {
  console.error('OAuth Service is down');
  process.exit(1);
});
