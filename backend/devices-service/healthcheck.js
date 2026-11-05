const net = require('net');

const client = new net.Socket();
const PORT = 3003;
const HOST = 'localhost';

client.connect(PORT, HOST, () => {
  console.log('Devices-Service is up');
  process.exit(0);
});

client.on('error', () => {
  console.error('Devices-Service is down');
  process.exit(1);
});
