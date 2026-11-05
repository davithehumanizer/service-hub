import * as fs from 'fs';
import * as readline from 'readline';

/**
 * Stream CSV lines to avoid loading very large files fully in memory
 */
export async function* readCsvStream(
  csvPath: string,
  selectedIdsSet: Set<string> | null = null,
  skipLines = 0,
  startId: string | null = null,
): AsyncGenerator<string> {
  const input = fs.createReadStream(csvPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let headerParsed = false;
  let delimiter: string | null = null; // ',' or '\t'
  let productIdIndex = -1;
  let catIdIndex = -1;
  let lineCount = 0;
  let skippedCount = 0;
  let foundStartId = startId ? false : true; // If no startId, we're already "found"

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) continue;

    // detect delimiter on first non-empty line if not set
    if (!headerParsed) {
      // try tab first, then comma
      const tabCols = line.split('\t');
      const commaCols = line.split(',');
      // if header contains the word 'product_id' use that as header
      const lower = line.toLowerCase();
      if (lower.includes('product_id') || lower.includes('product id')) {
        // header line
        delimiter = line.includes('\t') ? '\t' : ',';
        const headers = line
          .split(delimiter)
          .map((h) => h.trim().toLowerCase());
        productIdIndex = headers.indexOf('product_id');
        catIdIndex = headers.indexOf('catid');
        headerParsed = true;
        // skip header line
        continue;
      }

      // no explicit header - choose delimiter heuristically
      delimiter = tabCols.length > commaCols.length ? '\t' : ',';
      // if first data line, we haven't seen header; treat this line as data below
      headerParsed = true;
    }

    const cols = delimiter
      ? line.split(delimiter).map((c) => c.trim())
      : line.split(',').map((c) => c.trim());

    // Check category filter if enabled and column found
    if (selectedIdsSet && catIdIndex >= 0 && catIdIndex < cols.length) {
      const catId = cols[catIdIndex];
      if (!selectedIdsSet.has(catId)) {
        console.log(`Skipping product with catId ${catId}`);
        continue; // Skip this product
      }
    }

    let productId: string | undefined = undefined;
    if (productIdIndex >= 0 && productIdIndex < cols.length) {
      productId = cols[productIdIndex];
    } else {
      // fallback: try to find a pure numeric token that looks like product id but avoid timestamps
      // prefer shortish numeric tokens (<=10 digits) as product ids, otherwise accept any numeric token
      const numericTokens = cols.filter((c) => /^\d+$/.test(c));
      if (numericTokens.length === 1) productId = numericTokens[0];
      else if (numericTokens.length > 1) {
        const short = numericTokens.find((t) => t.length <= 6 || t.length <= 8);
        productId = short || numericTokens[0];
      } else {
        // no numeric token, take first column
        productId = cols[0];
      }
    }

    if (productId) {
      lineCount++;

      // Skip lines if --skip option is used
      if (skipLines > 0 && skippedCount < skipLines) {
        skippedCount++;
        if (skippedCount === 1 || skippedCount % 100 === 0) {
          console.log(`Skipping line ${skippedCount}/${skipLines}...`);
        }
        continue;
      }

      // If startId is specified, skip until we find it
      if (!foundStartId) {
        if (productId === startId) {
          foundStartId = true;
          console.log(`Found start ID: ${startId} at line ${lineCount}`);
        } else {
          if (lineCount % 100 === 0) {
            console.log(
              `Searching for start ID ${startId}... (current: ${productId}, line ${lineCount})`,
            );
          }
          continue;
        }
      }

      yield productId;
    }
  }
}

/**
 * Load features mapping from JSON file
 */
export function loadFeaturesFromJson(jsonPath: string): {
  signMap: Record<string, string>;
  nameMap: Record<string, string>;
} {
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    console.warn(
      `Features JSON not found at ${jsonPath}, feature names will use IDs`,
    );
    return { signMap: {}, nameMap: {} };
  }

  try {
    console.log(`Loading features from ${jsonPath}...`);
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log(
      `Loaded ${Object.keys(data.nameMap || {}).length} feature names and ${Object.keys(data.signMap || {}).length} signs`,
    );

    return {
      signMap: data.signMap || {},
      nameMap: data.nameMap || {},
    };
  } catch (e) {
    const error = e as Error;
    console.error(`Failed to load features JSON: ${error.message}`);
    return { signMap: {}, nameMap: {} };
  }
}

interface IcecatFeature {
  featureId?: string;
  name?: string;
  value: string;
  sign?: string;
  signText?: string;
}

/**
 * Extract features from Icecat JSON
 */
export function extractFeaturesFromIcecat(json: any): IcecatFeature[] {
  const out: IcecatFeature[] = [];
  try {
    const groups = json?.data?.FeaturesGroups || json?.FeaturesGroups || [];
    console.log(`Found ${groups.length} feature groups`);
    for (const g of groups) {
      const features = g.Features || [];
      console.log(
        `  Group ${g.GroupName || g.Name || g['@_GroupName'] || ''} has ${features.length} features`,
      );
      if (!Array.isArray(features)) continue;
      for (const f of features) {
        // Prefer the mapping: feature name = Feature->Name->Value, feature value = RawValue
        const featWrapper = f.Feature || f;
        const featureObj = featWrapper;
        // Feature name
        let featureName: string | null = null;
        if (featureObj && featureObj.Name) {
          if (typeof featureObj.Name === 'object') {
            if (
              featureObj.Name.Value &&
              (!featureObj.Name.Language ||
                String(featureObj.Name.Language).toUpperCase() === 'EN')
            ) {
              featureName = featureObj.Name.Value;
            } else if (featureObj.Name.Value) {
              featureName = featureObj.Name.Value;
            }
          } else if (typeof featureObj.Name === 'string') {
            featureName = featureObj.Name;
          }
        }

        // Value: prefer the RawValue
        const rawValue =
          f.RawValue ||
          f.Raw_Value ||
          f.Value ||
          featWrapper.Value ||
          featWrapper.PresentationValue ||
          featWrapper.DisplayValue ||
          featWrapper.ValueText ||
          '';

        // feature id
        const featureId =
          featureObj && (featureObj.ID || featureObj.Id || featureObj.FeatureID)
            ? String(featureObj.ID || featureObj.Id || featureObj.FeatureID)
            : undefined;

        // sign handling
        const signCandidates: any[] = [];
        if (featureObj && featureObj.Sign) signCandidates.push(featureObj.Sign);
        if (featureObj && featureObj.SignId)
          signCandidates.push(featureObj.SignId);
        if (featureObj && featureObj.SignID)
          signCandidates.push(featureObj.SignID);

        const measure =
          featureObj && (featureObj.Measure || featureObj.Measurement)
            ? featureObj.Measure || featureObj.Measurement
            : null;
        let measureSignId: string | undefined = undefined;
        let measureSignText: string | undefined = undefined;
        if (measure && measure.Signs) {
          const signsNode = measure.Signs;
          if (signsNode.ID) {
            measureSignId = signsNode.ID;
            measureSignText =
              signsNode._ || signsNode.Value || signsNode['#text'] || null;
          } else if (signsNode.Sign) {
            const signsList = Array.isArray(signsNode.Sign)
              ? signsNode.Sign
              : [signsNode.Sign];
            const enSign = signsList.find(
              (s) =>
                String(s?.langid || s?.Language) === '1' ||
                String(s?.Language) === 'EN',
            );
            const pick = enSign || signsList[0];
            if (pick) {
              measureSignId =
                pick.ID || pick.Id || pick['@_ID'] || pick['@_Id'] || null;
              measureSignText =
                typeof pick === 'string'
                  ? pick
                  : pick._ || pick.Value || pick['#text'] || null;
            }
          }
        }
        if (measureSignId) signCandidates.push(measureSignId);
        const sign = signCandidates.find(
          (s) => s !== undefined && s !== null && s !== '',
        );

        // push standardized feature object
        out.push({
          featureId: featureId,
          name: featureName || undefined,
          value: rawValue ? String(rawValue) : '',
          sign: sign ? String(sign) : undefined,
          signText: measureSignText || undefined,
        });
      }
    }
  } catch (e) {
    // fallback: try features array directly under data
    const feats = json?.data?.Features || json?.Features || [];
    if (Array.isArray(feats)) {
      for (const feat of feats) {
        const sign = feat.SignId || feat.SignID;
        const value = feat.Value || feat.ValueText;
        out.push({
          sign: sign ? String(sign) : undefined,
          value: value ? String(value) : '',
        });
      }
    }
  }
  return out;
}

/**
 * Fetch Icecat JSON from API
 */
export async function fetchIcecatJson(productId: string): Promise<any> {
  const url = `https://live.icecat.biz/api?lang=EN&shopname=openIcecat-live&icecat_id=${productId}`;
  const res = await fetch(url);

  // Parse response as JSON first to check for Icecat error messages
  const json = await res.json();

  // Check if Icecat returned an error object
  if (json.StatusCode || json.Error || json.Code) {
    // Check for brand restrictions specifically
    if (
      json.Code === 404 &&
      json.Message &&
      json.Message.includes('brand restrictions')
    ) {
      const error = new Error(`Product ${productId}: ${json.Message}`);
      (error as any).code = 'BRAND_RESTRICTED';
      throw error;
    }
    // Other Icecat errors
    throw new Error(
      `Icecat API error for product ${productId}: ${json.Message || json.Error || 'Unknown error'}`,
    );
  }

  // If response is not ok and we didn't get a JSON error object
  if (!res.ok) {
    throw new Error(`Icecat fetch failed ${res.status} ${res.statusText}`);
  }

  return json;
}
