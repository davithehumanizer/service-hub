## Available Tools

### Repair Map
Find qualified repairers near you with geolocation and advanced search features.

#### Features
- **Geolocated search** of repairers
- **Interactive map** with precise location
- **Ratings and reviews** of repairers
- **Direct contact** information
- **Filtering by specialties** (smartphone, computer, etc.)

#### API Reference
See the [Repairers API](#tag/repairers) endpoint for complete documentation.

#### Example Usage
```javascript
// Find a repairer near home
const response = await api.post('/v1/repairers/nearest', {
  latitude: 48.8566,
  longitude: 2.3522
});
```

---

### iFixit Integration
Access iFixit knowledge base to list available repair tutorials for specific devices.

#### Features
- **List available repair tutorials** for devices
- **Device search** in the iFixit database
- **Device-specific content** discovery

#### API Reference
See the [iFixit API](#tag/external-adapters/get/api/v1/external-adapters) endpoint for complete documentation.

#### Example Usage
```javascript
// Search for devices in iFixit database
const response = await api.get('/v1/external-adapters/ifixit/search', {
  params: { query: 'iPhone 12', type: 'device' }
});
```

---

### Fixometer Impact Calculator
Calculate the environmental impact of your devices and compare repair vs replacement options.

#### Features
- **Carbon footprint calculation** for devices
- **Water consumption assessment**
- **Environmental equivalents** (trees, car km, etc.)
- **Repair vs new purchase comparison**
- **Personalized recommendations**

#### API Reference
See the [Fixometer API](#tag/external-adapters/get/api/v1/external-adapters/fixometer/impact-metrics) endpoint for complete documentation.

#### Example Usage
```javascript
// Calculate impact of a 0.2kg smartphone
const response = await api.get('/v1/external-adapters/fixometer/impact-metrics', {
  params: { deviceType: 'smartphone', weight: 0.2 }
});
// Returns: { co2: 45.2, water: 120.5, equivalents: {...} }
```

---

### Fast Plan Eco (Route Planning)
Plan your eco-friendly trips and optimize repair routes.

#### Features
- **Optimized route calculation**
- **Transportation mode comparison** (car, bike, walking)
- **Carbon footprint calculation** for trips
- **Address geocoding**
- **GPX and Google Maps export**

#### API Reference
See the [POST Fast Plan Eco API](#tag/fast-plan-eco) endpoint for complete documentation.

#### Example Usage
```javascript
// Calculate an eco-friendly route
const route = await api.post('/v1/fast-plan-eco/calculate-route', {
  baseAddress: { address: "123 Main St", lat: 48.8566, lon: 2.3522 },
  followingAddresses: [
    { address: "456 Repair Ave", lat: 48.8606, lon: 2.3376 }
  ],
  vehicle: "bike"
});
```

---

### Device Identification (AI Photo Recognition)
Automatically identify devices by uploading photos using AI-powered image recognition.

#### Features
- **Photo-based device identification** using AI
- **Automatic device data extraction** (Brand, Model, Product Type)
- **GTIN/EAN recognition** when available
- **Release date detection**
- **Database search integration** with identified data
- **Frontend wizard integration** for seamless user experience

#### API Reference
See the [POST Identification API](#tag/identification/post/api/identification/analyze) endpoint for complete documentation.

#### Workflow
1. User uploads a clear photo of their device
2. AI analyzes the image and extracts device information
3. System automatically searches the database for matching devices
4. User can select from found devices or refine search with editable filters
5. If no match found, user can create a new device entry with pre-filled data

#### Example Usage
```javascript
// Analyze device photo
const formData = new FormData();
formData.append('file', imageFile);

const response = await api.post('/api/identification/analyze', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Response format:
// {
//   success: true,
//   data: {
//     Product: "Smartphone",
//     Brand: "Apple",
//     Model: "iPhone 12 Pro",
//     GTIN: "0194252038307",
//     ReleaseDate: "2020-10-23",
//     EndOfLifeDate: "2025-10-23"
//   },
//   timestamp: "2026-02-11T10:30:00Z"
// }
```

#### Integration Points
- **Frontend Wizard**: Integrated in device search workflow with photo upload option
- **Database Search**: Automatic search of device models (`GET /api/v2/device-models`) with identified brand and model
- **Device Creation**: Pre-fills device creation form if no matches found
- **Guest Mode**: Creation restricted to authenticated users, search available for all

#### Technical Details
- **Service**: `device-identification` (Python FastAPI)
- **API Gateway Route**: `/api/identification/analyze`
- **Max File Size**: 10MB
- **Supported Formats**: JPEG, PNG, WebP
- **Response Time**: ~2-5 seconds depending on image complexity

#### Best Practices
- Use clear, well-lit photos showing device branding and model information
- Ensure the device is the main subject of the photo
- Avoid blurry or low-resolution images
- Include visible model numbers or labels when possible

---

### Issue Origin Classifier (AI)
Predict the root cause of a device problem from a plain-text description using a fine-tuned RoBERTa model trained on ORDP repair data.

#### Features
- **AI-powered issue classification** — no configuration required
- **9 issue-origin categories**: Mechanical, Electrical/Power, Behaviour/Symptom, Maintenance, Software, User-related, Battery, Electronics/Control, Other
- **Confidence score** returned for every prediction
- **Full ranked prediction list** with scores for all categories
- **Customer journey integration** — displayed on the "What do you want to do?" and Summary steps of the repair wizard

#### Input Format
The input string should start with the device name followed by a description:
```
machine : {Brand} {Model} ; Description : {problem description}
```

#### API Reference
See the [POST Issue Tag API](#tag/issue-tag/post/api/v1/issue-tag/classify) endpoint for complete documentation.

#### Example Usage
```javascript
// Classify a device issue
const response = await api.post('/v1/issue-tag/classify', {
  input: 'machine : Samsung Washing Machine ; Description : The drum does not spin during the wash cycle'
});

// Response format:
// {
//   input: "machine : Samsung Washing Machine ; Description : ...",
//   finalPrediction: [
//     { label: "MECHANICAL", score: 0.9989 }
//   ],
//   predictions: [
//     { label: "MECHANICAL", score: 0.9989 },
//     { label: "POWER_ELECTRICAL", score: 0.0005 },
//     ...
//   ]
// }
```

#### Issue Categories

| Label | Display |
|---|---|
| `MECHANICAL` | Mechanical |
| `POWER_ELECTRICAL` | Electrical / Power |
| `BEHAVIOUR_SYMPTOM` | Behaviour / Symptom |
| `MAINTENANCE` | Maintenance |
| `SOFTWARE` | Software |
| `USER_RELATED` | User-related |
| `BATTERY` | Battery |
| `CONTROL_ELECTRONIC` | Electronics / Control |
| `NONE_OTHER` | Other |

#### Technical Details
- **Service**: `device-issue-tag` (Docker image `daiseibert/device-issue-tag:latest`)
- **Model**: Fine-tuned RoBERTa trained on ORDP repair dataset
- **API Gateway Route**: `/api/v1/issue-tag/classify`
- **Underlying endpoint**: `POST /v1/predict` on the ML service
- **Response time**: ~200–800 ms depending on load