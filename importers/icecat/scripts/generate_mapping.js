const fs = require('fs');
const path = require('path');

// Paths to input files
const icecatCategoriesPath = path.join(__dirname, '..', 'data', 'categories_output_flat.json');
const backendCategoriesPath = path.join(__dirname, '..', 'data', 'backend_categories.json');
const outputPath = path.join(__dirname, '..', 'mappings', 'category_mapping.json');

// Load data
console.log('Loading data...');
if (!fs.existsSync(icecatCategoriesPath)) {
    console.error(`Error: ${icecatCategoriesPath} not found.`);
    process.exit(1);
}
if (!fs.existsSync(backendCategoriesPath)) {
    console.error(`Error: ${backendCategoriesPath} not found.`);
    process.exit(1);
}

const icecatCategories = JSON.parse(fs.readFileSync(icecatCategoriesPath, 'utf8'));
const backendCategories = JSON.parse(fs.readFileSync(backendCategoriesPath, 'utf8'));

console.log(`Loaded ${icecatCategories.length} Icecat categories and ${backendCategories.length} backend categories.`);

const mapping = {};
let mappedCount = 0;

// Helper to normalize strings for comparison
function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Iterate through Icecat categories
for (const icecatCat of icecatCategories) {
    const icecatName = icecatCat.name;
    const icecatId = icecatCat.id;
    const normIcecatName = normalize(icecatName);

    let bestMatch = null;
    let bestScore = 0;

    for (const backendCat of backendCategories) {
        const backendName = backendCat.name;
        const normBackendName = normalize(backendName);

        // Exact match (normalized)
        if (normIcecatName === normBackendName) {
            bestMatch = backendCat;
            bestScore = 1.0;
            break; // Stop if exact match found
        }

        // Substring match (Icecat name contains Backend name or vice versa)
        // Penalize substring matches slightly
        if (normIcecatName.includes(normBackendName) && normBackendName.length > 3) {
             // Prefer longer matches
             const score = 0.8 + (normBackendName.length / normIcecatName.length) * 0.1;
             if (score > bestScore) {
                 bestScore = score;
                 bestMatch = backendCat;
             }
        }
        
         if (normBackendName.includes(normIcecatName) && normIcecatName.length > 3) {
             const score = 0.8 + (normIcecatName.length / normBackendName.length) * 0.1;
             if (score > bestScore) {
                 bestScore = score;
                 bestMatch = backendCat;
             }
        }
    }

    if (bestMatch) {
        mapping[icecatId] = {
            icecatName: icecatName,
            backendId: bestMatch.id,
            backendName: bestMatch.name,
            score: bestScore
        };
        mappedCount++;
        // console.log(`Mapped "${icecatName}" -> "${bestMatch.name}" (Score: ${bestScore.toFixed(2)})`);
    }
}

console.log(`Generated mapping for ${mappedCount} categories.`);
fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2), 'utf8');
console.log(`Mapping saved to ${outputPath}`);
