const fs = require('fs');
const path = require('path');

// Paths
const categoryMappingPath = path.join(__dirname, '..', 'mappings', 'category_mapping.json');
const suggestedMappingsPath = path.join(__dirname, '..', 'mappings', 'suggested_mappings.json');
const outputPath = path.join(__dirname, '..', 'mappings', 'category_mapping.json');

console.log('Loading mappings...');
const categoryMapping = JSON.parse(fs.readFileSync(categoryMappingPath, 'utf8'));
const suggestedMappings = JSON.parse(fs.readFileSync(suggestedMappingsPath, 'utf8'));

let addedCount = 0;
let skippedCount = 0;

// Merge suggested mappings into category mapping
for (const [icecatId, mapping] of Object.entries(suggestedMappings)) {
    // Skip if backendId is null (not yet filled in)
    if (mapping.backendId === null) {
        console.log(`Skipping ${icecatId} "${mapping.icecatName}" - no backend ID specified`);
        skippedCount++;
        continue;
    }
    
    // Add or update the mapping
    categoryMapping[icecatId] = mapping;
    console.log(`✓ Added/Updated ${icecatId} "${mapping.icecatName}" → [${mapping.backendId}] "${mapping.backendName}"`);
    addedCount++;
}

// Save updated mapping
fs.writeFileSync(outputPath, JSON.stringify(categoryMapping, null, 2), 'utf8');

console.log(`\n=== SUMMARY ===`);
console.log(`Mappings added/updated: ${addedCount}`);
console.log(`Mappings skipped (no backend ID): ${skippedCount}`);
console.log(`Updated mapping saved to ${outputPath}`);
