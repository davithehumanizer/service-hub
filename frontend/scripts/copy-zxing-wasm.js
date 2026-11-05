// The library fetches its wasm from jsDelivr by default. A demo venue's
// network, or a CSP, can block that — so it is served from our own origin.
// See BarcodeScanner.tsx, which overrides locateFile to match.
const fs = require('fs');
const path = require('path');

const src = path.join(
  __dirname, '..', 'node_modules', 'zxing-wasm', 'dist', 'reader',
  'zxing_reader.wasm',
);
const destDir = path.join(__dirname, '..', 'public', 'wasm');
fs.mkdirSync(destDir, { recursive: true });
const dest = path.join(destDir, path.basename(src));
fs.copyFileSync(src, dest);
console.log('copied %s -> public/wasm/', path.basename(src));
