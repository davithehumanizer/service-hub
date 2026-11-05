const net = require('net');

const client = new net.Socket();
const PORT = 3002;
const HOST = 'localhost';

client.connect(PORT, HOST, () => {
  console.log('Repairers-management is up');
  process.exit(0);
});

client.on('error', () => {
  console.error('Repairers-management is down');
  process.exit(1);
});
