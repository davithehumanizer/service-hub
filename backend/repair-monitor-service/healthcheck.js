const net = require("net");

const client = new net.Socket();
const PORT = 3013;
const HOST = "localhost";

client.connect(PORT, HOST, () => {
  console.log("Repair Monitor Service is up");
  process.exit(0);
});

client.on("error", () => {
  console.error("Repair Monitor Service is down");
  process.exit(1);
});
