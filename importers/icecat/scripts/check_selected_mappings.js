const fs = require('fs');
const path = require('path');

// Paths
const selectedIdsPath = path.join(__dirname, '..', 'mappings', 'selected_ids.json');
const icecatCategoriesPath = path.join(__dirname, '..', 'data', 'categories_output_flat.json');
const backendCategoriesPath = path.join(__dirname, '..', 'data', 'backend_categories.json');
const categoryMappingPath = path.join(__dirname, '..', 'mappings', 'category_mapping.json');

// Load data
console.log('Loading data...');
const selectedIds = JSON.parse(fs.readFileSync(selectedIdsPath, 'utf8'));
const icecatCategories = JSON.parse(fs.readFileSync(icecatCategoriesPath, 'utf8'));
const backendCategories = JSON.parse(fs.readFileSync(backendCategoriesPath, 'utf8'));
const categoryMapping = JSON.parse(fs.readFileSync(categoryMappingPath, 'utf8'));

console.log(`Loaded ${selectedIds.length} selected category IDs`);

// Helper to normalize strings
function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Helper to tokenize and normalize
function tokenize(str) {
    return str.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 2);
}

// Calculate similarity score
function calculateSimilarity(icecatName, backendName) {
    const normIcecat = normalize(icecatName);
    const normBackend = normalize(backendName);
    
    // Exact match
    if (normIcecat === normBackend) return 1.0;
    
    // Substring matches
    if (normIcecat.includes(normBackend) && normBackend.length > 3) {
        return 0.8 + (normBackend.length / normIcecat.length) * 0.15;
    }
    if (normBackend.includes(normIcecat) && normIcecat.length > 3) {
        return 0.8 + (normIcecat.length / normBackend.length) * 0.15;
    }
    
    // Token-based matching
    const icecatTokens = tokenize(icecatName);
    const backendTokens = tokenize(backendName);
    
    if (icecatTokens.length === 0 || backendTokens.length === 0) return 0;
    
    let matchingTokens = 0;
    for (const iToken of icecatTokens) {
        for (const bToken of backendTokens) {
            if (iToken === bToken || iToken.includes(bToken) || bToken.includes(iToken)) {
                matchingTokens++;
                break;
            }
        }
    }
    
    const tokenScore = matchingTokens / Math.max(icecatTokens.length, backendTokens.length);
    return tokenScore > 0.5 ? 0.7 + tokenScore * 0.2 : 0;
}

// Find best matches for a category
function findBestMatches(icecatName, topN = 5) {
    const matches = [];
    
    for (const backendCat of backendCategories) {
        const score = calculateSimilarity(icecatName, backendCat.name);
        if (score > 0) {
            matches.push({
                backendId: backendCat.id,
                backendName: backendCat.name,
                score: score
            });
        }
    }
    
    return matches.sort((a, b) => b.score - a.score).slice(0, topN);
}

// Check each selected ID
const missing = [];
const present = [];

for (const id of selectedIds) {
    const icecatCat = icecatCategories.find(c => c.id === id);
    
    if (!icecatCat) {
        console.warn(`Warning: Icecat category ${id} not found in categories_output_flat.json`);
        continue;
    }
    
    if (categoryMapping[id]) {
        present.push({
            id: id,
            icecatName: icecatCat.name,
            mapping: categoryMapping[id]
        });
    } else {
        const suggestions = findBestMatches(icecatCat.name);
        missing.push({
            id: id,
            icecatName: icecatCat.name,
            suggestions: suggestions
        });
    }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total selected categories: ${selectedIds.length}`);
console.log(`Already mapped: ${present.length}`);
console.log(`Missing mappings: ${missing.length}`);

// Generate detailed report
let report = `=== CATEGORY MAPPING REPORT ===\n`;
report += `Generated: ${new Date().toISOString()}\n\n`;
report += `Total selected categories: ${selectedIds.length}\n`;
report += `Already mapped: ${present.length}\n`;
report += `Missing mappings: ${missing.length}\n\n`;

if (missing.length > 0) {
    report += `=== MISSING MAPPINGS ===\n\n`;
    console.log(`\n=== MISSING MAPPINGS ===`);
    
    for (const item of missing) {
        const section = `Icecat ID ${item.id}: "${item.icecatName}"\n  Suggested matches:\n`;
        report += section;
        console.log(`\n${section.trim()}`);
        
        if (item.suggestions.length === 0) {
            const noMatch = `    - No matches found (try manual mapping)\n`;
            report += noMatch;
            console.log(noMatch.trim());
        } else {
            for (const suggestion of item.suggestions) {
                const line = `    - [${suggestion.backendId}] "${suggestion.backendName}" (score: ${suggestion.score.toFixed(3)})\n`;
                report += line;
                console.log(line.trim());
            }
        }
        report += `\n`;
    }
    
    // Save report to file
    const reportPath = path.join(__dirname, '..', 'logs', 'mapping_report.txt');
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`\n✓ Detailed report saved to ${reportPath}`);
    
    // Generate manual mappings file with ALL missing categories
    const manualMappings = {};
    for (const item of missing) {
        if (item.suggestions.length > 0) {
            const best = item.suggestions[0];
            manualMappings[item.id] = {
                icecatName: item.icecatName,
                backendId: best.backendId,
                backendName: best.backendName,
                score: best.score,
                manual: true
            };
        } else {
            // No suggestion found - leave placeholder for manual entry
            manualMappings[item.id] = {
                icecatName: item.icecatName,
                backendId: null,
                backendName: "MANUAL_MAPPING_REQUIRED",
                score: 0,
                manual: true
            };
        }
    }
    
    const manualMappingsPath = path.join(__dirname, '..', 'mappings', 'suggested_mappings.json');
    fs.writeFileSync(manualMappingsPath, JSON.stringify(manualMappings, null, 2), 'utf8');
    console.log(`✓ Suggested mappings saved to ${manualMappingsPath}`);
    console.log(`  Review and merge these into category_mapping.json if appropriate.`);
}
