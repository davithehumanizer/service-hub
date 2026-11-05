#!/usr/bin/env node

/**
 * Analyze XML structure to understand how to parse it
 */

const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const xmlPath = process.argv[2] || 'data/FeaturesList.xml';

console.log(`Reading first 50KB of ${xmlPath}...`);

// Read just the beginning of the file
const fd = fs.openSync(xmlPath, 'r');
const buffer = Buffer.alloc(50000);
fs.readSync(fd, buffer, 0, 50000, 0);
fs.closeSync(fd);

const sample = buffer.toString('utf8');

console.log('\n=== First 2000 characters ===');
console.log(sample.substring(0, 2000));

console.log('\n=== Parsing sample ===');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

try {
  // Try to parse just a small sample
  const lines = sample.split('\n');
  let xmlSample = '';
  let depth = 0;
  
  for (const line of lines) {
    xmlSample += line + '\n';
    if (line.includes('<')) depth++;
    if (line.includes('</')) depth--;
    
    // Stop after we have a complete element
    if (depth === 0 && xmlSample.includes('</')) {
      break;
    }
  }
  
  console.log('\n=== Sample to parse ===');
  console.log(xmlSample);
  
  const parsed = parser.parse(xmlSample);
  console.log('\n=== Parsed structure ===');
  console.log(JSON.stringify(parsed, null, 2).substring(0, 3000));
  
  console.log('\n=== Root keys ===');
  console.log(Object.keys(parsed));
  
} catch (e) {
  console.error('Parse error:', e.message);
}
