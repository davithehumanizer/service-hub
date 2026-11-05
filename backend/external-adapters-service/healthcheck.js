const net = require('net');

const client = new net.Socket();
const PORT = 3008;
const HOST = 'localhost';

client.connect(PORT, HOST, () => {
  console.log('External-Adapters-Service is up');
  process.exit(0);
});

client.on('error', () => {
  console.error('External-Adapters-Service is down');
  process.exit(1);
});
