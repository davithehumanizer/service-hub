const net = require('net');

const client = new net.Socket();
const PORT = 3012;
const HOST = 'localhost';

client.connect(PORT, HOST, () => {
  console.log('Spare-Parts-Service is up');
  process.exit(0);
});

client.on('error', () => {
  console.error('Spare-Parts-Service is down');
  process.exit(1);
});
