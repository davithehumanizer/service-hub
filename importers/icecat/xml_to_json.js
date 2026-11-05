#!/usr/bin/env node

/**
 * Convert FeaturesList.xml to optimized JSON
 * Extracts only English feature names and signs to reduce file size
 * 
 * Usage: node xml_to_json.js --input data/FeaturesList.xml --output data/features.json
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

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

function extractEnglishName(nameData) {
  if (!nameData) return null;
  
  const names = Array.isArray(nameData) ? nameData : [nameData];
  
  // Find English name (langid=1 or Language='EN')
  const enName = names.find(n => 
    String(n?.langid || n?.Language || n?.language) === '1' ||
    String(n?.langid) === '1' ||
    String(n?.Language) === 'EN'
  );
  
  if (enName) {
    return typeof enName === 'string' 
      ? enName 
      : enName.Value || enName['#text'] || enName[''] || null;
  }
  
  // Fallback to first name if no English found
  if (names.length > 0) {
    const first = names[0];
    return typeof first === 'string' 
      ? first 
      : first.Value || first['#text'] || first[''] || null;
  }
  
  return null;
}

function extractEnglishSign(signData) {
  if (!signData) return null;
  
  const signs = Array.isArray(signData) ? signData : [signData];
  
  // Find English sign (langid=1 or Language='EN')
  const enSign = signs.find(s => {
    const lang = String(s.langid || s.Language || s.language || '');
    return lang === '1' || lang.toUpperCase() === 'EN';
  });
  
  if (enSign) {
    const signId = enSign.ID || enSign.Id || enSign.id || enSign['@_ID'] || enSign['@_Id'];
    const signText = typeof enSign === 'string' 
      ? enSign 
      : enSign.Value || enSign['#text'] || enSign[''] || null;
    
    return { id: signId, text: signText };
  }
  
  return null;
}

function processFeature(feature) {
  if (!feature) return null;
  
  // Extract Feature ID
  const featureId = 
    feature.ID ||
    feature.Id ||
    feature.FeatureID ||
    feature.FeatureId ||
    feature['@_ID'] ||
    feature['@_Id'];
  
  if (!featureId) return null;
  
  // Extract English feature name
  let featureName = null;
  
  // Try Names.Name first
  if (feature.Names && feature.Names.Name) {
    featureName = extractEnglishName(feature.Names.Name);
  }
  
  // Try direct Name property
  if (!featureName && feature.Name) {
    featureName = extractEnglishName(feature.Name);
  }
  
  // Extract signs from Measure
  const signs = [];
  const measures = feature.Measure 
    ? (Array.isArray(feature.Measure) ? feature.Measure : [feature.Measure])
    : [];
  
  for (const measure of measures) {
    if (measure.Signs && measure.Signs.Sign) {
      const signData = Array.isArray(measure.Signs.Sign) 
        ? measure.Signs.Sign 
        : [measure.Signs.Sign];
      
      for (const s of signData) {
        const sign = extractEnglishSign([s]);
        if (sign && sign.id && sign.text) {
          signs.push(sign);
        }
      }
    }
  }
  
  return {
    id: String(featureId),
    name: featureName,
    signs: signs
  };
}

function convertXmlToJson(xmlPath, outputPath) {
  console.log(`Reading XML from ${xmlPath}...`);
  
  const xmlContent = fs.readFileSync(xmlPath, 'utf8');
  const fileSize = (xmlContent.length / 1024 / 1024).toFixed(2);
  console.log(`XML file size: ${fileSize} MB`);
  
  console.log('Parsing XML...');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: '_',
    parseAttributeValue: true,
    trimValues: true,
  });
  
  const parsed = parser.parse(xmlContent);
  
  // Find features in the parsed structure
  let features = [];
  
  // Try common paths
  if (parsed.FeaturesList && parsed.FeaturesList.Feature) {
    features = Array.isArray(parsed.FeaturesList.Feature) 
      ? parsed.FeaturesList.Feature 
      : [parsed.FeaturesList.Feature];
  } else if (parsed.Features && parsed.Features.Feature) {
    features = Array.isArray(parsed.Features.Feature) 
      ? parsed.Features.Feature 
      : [parsed.Features.Feature];
  }
  
  console.log(`Found ${features.length} features`);
  
  // Process features and build maps
  const nameMap = {};
  const signMap = {};
  let processedCount = 0;
  
  for (const feature of features) {
    const processed = processFeature(feature);
    
    if (processed && processed.id && processed.name) {
      nameMap[processed.id] = processed.name;
      processedCount++;
      
      // Add signs to signMap
      for (const sign of processed.signs) {
        if (sign.id && sign.text) {
          signMap[sign.id] = sign.text;
        }
      }
    }
    
    // Progress indicator
    if (processedCount % 1000 === 0) {
      console.log(`Processed ${processedCount} features...`);
    }
  }
  
  console.log(`\nProcessed ${processedCount} features with names`);
  console.log(`Extracted ${Object.keys(signMap).length} signs`);
  
  // Create optimized output
  const output = {
    nameMap,
    signMap,
    metadata: {
      totalFeatures: features.length,
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
  console.log(`Size reduction: ${((1 - jsonSize / fileSize) * 100).toFixed(1)}%`);
  
  console.log('\n✅ Conversion complete!');
  console.log(`\nTo use this file, update import_icecat.js:`);
  console.log(`  const features = JSON.parse(fs.readFileSync('${outputPath}', 'utf8'));`);
  console.log(`  const { nameMap, signMap } = features;`);
}

function main() {
  const args = parseArgs();
  
  if (!args.input) {
    console.error('Error: --input argument is required');
    console.log('\nUsage:');
    console.log('  node xml_to_json.js --input data/FeaturesList.xml --output data/features.json');
    console.log('\nOptions:');
    console.log('  --input    Path to FeaturesList.xml file');
    console.log('  --output   Path for output JSON file (default: features.json)');
    process.exit(1);
  }
  
  const inputPath = path.resolve(args.input);
  const outputPath = path.resolve(args.output || 'features.json');
  
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }
  
  try {
    convertXmlToJson(inputPath, outputPath);
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
