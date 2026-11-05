#!/usr/bin/env node

/**
 * Split a large CSV file into smaller chunks
 * Usage: node split_csv.js --input files.index.csv --lines 10000 --output chunks/
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      out[key] = val;
    }
  }
  return out;
}

async function splitCsv(inputFile, linesPerFile, outputDir) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(inputFile),
    crlfDelay: Infinity
  });

  let lineCount = 0;
  let fileCount = 1;
  let currentLines = [];
  let header = null;

  console.log(`Splitting ${inputFile} into chunks of ${linesPerFile} lines...`);

  for await (const line of rl) {
    // Save header
    if (!header) {
      header = line;
      continue;
    }

    currentLines.push(line);
    lineCount++;

    // Write chunk when reaching the limit
    if (currentLines.length >= linesPerFile) {
      const outputFile = path.join(outputDir, `chunk_${String(fileCount).padStart(4, '0')}.csv`);
      const content = [header, ...currentLines].join('\n') + '\n';
      fs.writeFileSync(outputFile, content, 'utf8');
      
      console.log(`✓ Created ${outputFile} (${currentLines.length} lines)`);
      
      currentLines = [];
      fileCount++;
    }
  }

  // Write remaining lines
  if (currentLines.length > 0) {
    const outputFile = path.join(outputDir, `chunk_${String(fileCount).padStart(4, '0')}.csv`);
    const content = [header, ...currentLines].join('\n') + '\n';
    fs.writeFileSync(outputFile, content, 'utf8');
    
    console.log(`✓ Created ${outputFile} (${currentLines.length} lines)`);
  }

  console.log(`\n✅ Done! Created ${fileCount} chunk files in ${outputDir}`);
  console.log(`Total lines processed: ${lineCount}`);
}

async function main() {
  const args = parseArgs();

  if (!args.input) {
    console.error('Error: --input argument is required');
    console.log('\nUsage:');
    console.log('  node split_csv.js --input files.index.csv --lines 10000 --output chunks/');
    console.log('\nOptions:');
    console.log('  --input    Input CSV file to split');
    console.log('  --lines    Number of lines per chunk (default: 10000)');
    console.log('  --output   Output directory for chunks (default: ./chunks/)');
    process.exit(1);
  }

  const inputFile = args.input;
  const linesPerFile = parseInt(args.lines || '10000', 10);
  const outputDir = args.output || './chunks';

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  await splitCsv(inputFile, linesPerFile, outputDir);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
