# URN API Endpoints - Documentation

## Vue d'ensemble

Les URN (Uniform Resource Names) sont maintenant disponibles via l'API pour les devices et les catégories.

**Format URN :**
- Devices: `urn:care2repair:device:{device_id}`
- Categories: `urn:care2repair:category:{id}`

---

## Endpoints disponibles

### 1. Get Device by URN

**Endpoint:** `GET /api/v1/devices/urn/:urn`

**Description:** Récupère un device en utilisant son URN.

**Authentification:** Requise (OAuth2 ou JWT)

**Permission:** `device.getByUrn`

**Paramètres:**
- `urn` (path parameter) - L'URN du device (ex: `urn:care2repair:device:1`)

**Exemple de requête:**
```bash
curl -X GET "http://localhost:3000/api/v1/devices/urn/urn:care2repair:device:1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Réponse (200 OK):**
```json
{
  "device_id": 1,
  "urn": "urn:care2repair:device:1",
  "ean": "1234567890123",
  "serial_number": "SN12345",
  "manufacturer": "Apple",
  "brand": "Apple",
  "model": "iPhone 13",
  "device_type": "Smartphone",
  "model_id": 42,
  "variant_label": "128 GB · Midnight",
  "is_refurbished": false,
  "source": "UNKNOWN",
  "categories": [
    {
      "id": 1,
      "urn": "urn:care2repair:category:1",
      "name": "Personal Computer"
    }
  ],
  "technicalProperties": [
    {
      "property_id": 1,
      "property_name": "os",
      "property_value": "iOS 15"
    }
  ]
}
```

**Réponses d'erreur:**
- `404 Not Found` - Device avec cet URN n'existe pas
- `401 Unauthorized` - Token manquant ou invalide
- `403 Forbidden` - Permission insuffisante
- `500 Internal Server Error` - Erreur serveur

---

### 2. Get Category by URN

**Endpoint:** `GET /api/v1/device-categories/urn/:urn`

**Description:** Récupère une catégorie en utilisant son URN.

**Authentification:** Requise

**Permission:** `device_category.read`

**Paramètres:**
- `urn` (path parameter) - L'URN de la catégorie (ex: `urn:care2repair:category:1`)

**Exemple de requête:**
```bash
curl -X GET "http://localhost:3000/api/v1/device-categories/urn/urn:care2repair:category:1" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Réponse (200 OK):**
```json
{
  "id": 1,
  "urn": "urn:care2repair:category:1",
  "name": "Personal Computer"
}
```

---

## URN dans les réponses API

### Tous les endpoints existants incluent maintenant les URN

Les URN sont automatiquement inclus dans toutes les réponses API pour les devices et catégories :

#### GET /api/v1/devices
```json
{
  "data": [
    {
      "device_id": 1,
      "urn": "urn:care2repair:device:1",
      "model": "iPhone 13",
      ...
    }
  ]
}
```

#### GET /api/v1/device-categories
```json
[
  {
    "id": 1,
    "urn": "urn:care2repair:category:1",
    "name": "Personal Computer"
  }
]
```

#### POST /api/v1/devices (Création)
```json
{
  "device_id": 21,
  "urn": "urn:care2repair:device:21",
  "ean": "9999999999999",
  ...
}
```

Les URN sont **générés automatiquement** lors de la création d'un device ou d'une catégorie.

---

## Cas d'usage

### 1. Liens permanents
Les URN peuvent être utilisés pour créer des liens permanents vers des ressources :
```
https://care2repair.eu/devices/urn:care2repair:device:123
```

### 2. Intégration externe
Les partenaires peuvent référencer vos ressources avec des URN standardisés :
```javascript
const deviceUrn = "urn:care2repair:device:456";
const response = await fetch(`/api/v1/devices/urn/${deviceUrn}`);
```

### 3. Synchronisation
Les URN facilitent la synchronisation entre systèmes :
```javascript
// Vérifier si un device existe déjà
const urn = `urn:care2repair:device:${externalId}`;
try {
  const device = await getDeviceByUrn(urn);
  // Device existe, mettre à jour
} catch (404) {
  // Device n'existe pas, créer
}
```

---

## Documentation Swagger

Les nouveaux endpoints URN sont documentés dans Swagger UI :

**URL:** `http://localhost:3000/api/docs`

Cherchez les endpoints :
- `GET /devices/urn/{urn}` - Get device by URN
- `GET /device-categories/urn/{urn}` - Get category by URN

---

## Permissions requises

Pour utiliser les endpoints URN, les permissions suivantes sont nécessaires :

| Endpoint | Permission |
|----------|-----------|
| `GET /devices/urn/:urn` | `device.getByUrn` |
| `GET /device-categories/urn/:urn` | `device_category.read` |

**Note:** Ces permissions doivent être configurées dans le système de gestion des permissions OAuth2.

---

## Tests

### Test avec curl

```bash
# 1. Obtenir un token
TOKEN=$(curl -X POST "http://localhost:3000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.access_token')

# 2. Tester l'endpoint URN
curl -X GET "http://localhost:3000/api/v1/devices/urn/urn:care2repair:device:1" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

### Test avec Postman

1. Créer une requête `GET`
2. URL: `http://localhost:3000/api/v1/devices/urn/urn:care2repair:device:1`
3. Headers:
   - `Authorization: Bearer YOUR_TOKEN`
   - `Content-Type: application/json`
4. Envoyer la requête

---

## Notes importantes

1. **Format URN strict** : Les URN doivent respecter le format exact `urn:care2repair:device:{id}` ou `urn:care2repair:category:{id}`

2. **URL Encoding** : Les URN contiennent des `:` qui doivent être encodés dans les URLs :
   ```
   urn:care2repair:device:1 → urn%3Acare2repair%3Adevice%3A1
   ```
   La plupart des clients HTTP (curl, fetch, axios) gèrent cela automatiquement.

3. **Backward Compatibility** : Les endpoints existants avec IDs numériques continuent de fonctionner normalement.

4. **Performance** : Les lookups par URN sont indexés et aussi rapides que les lookups par ID.

---

## Résumé

✅ URN disponibles pour devices et categories
✅ Nouveaux endpoints GET par URN
✅ URN inclus dans toutes les réponses API
✅ Génération automatique des URN
✅ Documentation Swagger à jour
✅ Permissions configurables
✅ Backward compatible avec les IDs numériques
