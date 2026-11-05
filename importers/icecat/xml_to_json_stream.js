#!/usr/bin/env node

/**
 * Convert FeaturesList.xml to JSON using streaming parser
 * This avoids loading the entire file in memory
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

async function streamXmlToJson(xmlPath, outputPath) {
  console.log(`Streaming XML from ${xmlPath}...`);
  
  const nameMap = {};
  const signMap = {};
  
  const fileStream = fs.createReadStream(xmlPath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let currentFeature = null;
  let currentFeatureId = null;
  let currentFeatureName = null;
  let inMeasure = false;
  let processedCount = 0;
  let lineCount = 0;
  
  for await (const line of rl) {
    lineCount++;
    
    if (lineCount % 100000 === 0) {
      console.log(`Processed ${lineCount} lines, ${processedCount} features...`);
    }
    
    const trimmed = line.trim();
    
    // Detect Feature start
    if (trimmed.startsWith('<Feature ') || trimmed.startsWith('<Feature>')) {
      currentFeature = trimmed;
      currentFeatureId = null;
      currentFeatureName = null;
      
      // Try to extract ID from opening tag
      const idMatch = trimmed.match(/ID="(\d+)"/);
      if (idMatch) {
        currentFeatureId = idMatch[1];
      }
    }
    
    // Extract Feature ID if not found yet
    if (currentFeature && !currentFeatureId && trimmed.includes('<ID>')) {
      const match = trimmed.match(/<ID>(\d+)<\/ID>/);
      if (match) {
        currentFeatureId = match[1];
      }
    }
    
    // Extract English feature name
    if (currentFeature && trimmed.includes('langid="1"') && trimmed.includes('<Name')) {
      const match = trimmed.match(/<Name[^>]*>([^<]+)<\/Name>/);
      if (match) {
        currentFeatureName = match[1];
      }
    }
    
    // Detect Measure section
    if (trimmed.includes('<Measure')) {
      inMeasure = true;
    }
    
    // Extract signs from Measure section
    if (inMeasure && trimmed.includes('langid="1"') && trimmed.includes('<Sign')) {
      const idMatch = trimmed.match(/ID="(\d+)"/);
      const textMatch = trimmed.match(/<Sign[^>]*>([^<]+)<\/Sign>/);
      
      if (idMatch && textMatch) {
        signMap[idMatch[1]] = textMatch[1];
      }
    }
    
    if (trimmed.includes('</Measure>')) {
      inMeasure = false;
    }
    
    // Feature end
    if (trimmed.includes('</Feature>')) {
      if (currentFeatureId && currentFeatureName) {
        nameMap[currentFeatureId] = currentFeatureName;
        processedCount++;
      }
      currentFeature = null;
      currentFeatureId = null;
      currentFeatureName = null;
    }
  }
  
  console.log(`\nProcessed ${lineCount} lines`);
  console.log(`Extracted ${processedCount} features with names`);
  console.log(`Extracted ${Object.keys(signMap).length} signs`);
  
  // Create output
  const output = {
    nameMap,
    signMap,
    metadata: {
      totalLines: lineCount,
      processedFeatures: processedCount,
      totalSigns: Object.keys(signMap).length,
      generatedAt: new Date().toISOString(),
      sourceFile: path.basename(xmlPath)
    }
  };
  
  // Write JSON
  console.log(`\nWriting JSON to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  
  const jsonSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
  console.log(`JSON file size: ${jsonSize} MB`);
  
  console.log('\n✅ Conversion complete!');
}

async function main() {
  const args = parseArgs();
  
  if (!args.input) {
    console.error('Error: --input argument is required');
    console.log('\nUsage:');
    console.log('  node xml_to_json_stream.js --input data/FeaturesList.xml --output data/features.json');
    process.exit(1);
  }
  
  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output || 'features.json');
  
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }
  
  try {
    await streamXmlToJson(inputPath, outputPath);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
