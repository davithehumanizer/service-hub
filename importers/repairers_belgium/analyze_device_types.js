const fs = require('fs');
const csv = require('fast-csv');

const mapping = JSON.parse(fs.readFileSync('device_type_mapping.json', 'utf8'));
const allCsvCodes = new Set();

fs.createReadStream('locations_repairconnects.csv')
  .pipe(csv.parse({ headers: true }))
  .on('data', row => {
    if (row.device_types) {
      try {
        const types = JSON.parse(row.device_types);
        types.forEach(t => allCsvCodes.add(t.code));
      } catch (e) {}
    }
  })
  .on('end', () => {
    const all = [...allCsvCodes].sort().map(code => ({
      csv_code: code,
      is_mapped: !!mapping[code],
      backend_category: mapping[code] || null
    }));
    
    fs.writeFileSync('all_device_types_status.json', JSON.stringify(all, null, 2));
    
    console.log(`Total types in CSV: ${all.length}`);
    console.log(`Mapped: ${all.filter(t => t.is_mapped).length}`);
    console.log(`Unmapped: ${all.filter(t => !t.is_mapped).length}`);
    console.log('\nFile written to: all_device_types_status.json');
  });
