# Icecat Importer

Importeur de produits depuis l'API Icecat vers le backend Care2Repair.

## Installation

```bash
npm install
```

Dépendances requises :
- `fast-xml-parser` : Pour parser les fichiers XML Icecat
- `dotenv` : Pour charger les variables d'environnement

## Configuration

Créer un fichier `.env` à la racine du dossier `importers/icecat/` :

```env
# API Configuration
API_BASE_URL=http://localhost:3000
API_URL=http://localhost:3000/devices

# OAuth2 Client Credentials
OAUTH_CLIENT_ID=icecat-importer
OAUTH_CLIENT_SECRET=<secret du client icecat-importer>

# Import Settings (optional)
# LOG_DIR=./logs
```

> **Note** : Le script s'authentifie automatiquement via OAuth2 Client Credentials. Plus besoin de fournir un token JWT manuellement.

## Utilisation

### 1. Import Principal

#### Mode Fichiers (génération de JSON)
```bash
node import_icecat.js \
  --csv data/files.index.csv \
  --mode files \
  --outDir icecat-output \
  --mapping mappings/category_mapping.json \
  --selectedIds mappings/selected_ids.json \
  --featuresXml data/FeaturesList.xml
```

#### Mode API (envoi au backend)
```bash
node import_icecat.js \
  --csv data/files.index.csv \
  --mapping mappings/category_mapping.json \
  --selectedIds mappings/selected_ids.json \
  --featuresXml data/FeaturesList.xml
```

> **Note** : L'URL de l'API et les credentials OAuth2 sont lus depuis le fichier `.env`. Vous pouvez les surcharger avec les arguments `--apiUrl`, `--clientId`, et `--clientSecret`.

### 2. Reprendre un Import Interrompu

Si votre import a été interrompu (Ctrl+C, erreur réseau, etc.), vous pouvez le reprendre de deux façons :

#### Option A : Sauter les N premières lignes
```bash
# Reprendre en sautant les 500 premières lignes déjà traitées
node import_icecat.js \
  --csv data/files.index.csv \
  --skip 500 \
  --mapping mappings/category_mapping.json \
  --selectedIds mappings/selected_ids.json \
  --featuresXml data/FeaturesList.xml
```

#### Option B : Commencer à partir d'un ID spécifique
```bash
# Reprendre à partir du produit ID 123456
node import_icecat.js \
  --csv data/files.index.csv \
  --startId 123456 \
  --mapping mappings/category_mapping.json \
  --selectedIds mappings/selected_ids.json \
  --featuresXml data/FeaturesList.xml
```

> **Astuce** : Regardez dans les logs (`logs/import_YYYY-MM-DD.log`) pour trouver le dernier produit traité avant l'interruption.

**Exemple de log** :
```
[2025-11-27T09:00:00.000Z] [SUCCESS] CREATED: Device 225 - EAN: N/A
[2025-11-27T09:00:01.000Z] [SUCCESS] CREATED: Device 226 - EAN: N/A
[2025-11-27T09:00:02.000Z] [WARN] Import interrupted by user (Ctrl+C)
```
→ Reprendre avec `--startId` du produit suivant celui du dernier SUCCESS

### 3. Logs

Les logs sont automatiquement générés dans le dossier `logs/` avec un fichier par jour :
- Format : `import_YYYY-MM-DD.log`
- Contenu : Timestamp, niveau (INFO/SUCCESS/ERROR), message, détails
- Résumé final : Total traité, succès, mises à jour, erreurs, temps d'exécution, appels API Icecat

Exemple de log :
```
[2025-11-24T18:00:00.000Z] [INFO] Starting import batch: icecat-2025-11-24 - Date: 2025-11-24T18:00:00.000Z
[2025-11-24T18:00:01.000Z] [SUCCESS] CREATED: Device 123 - EAN: 1234567890123
[2025-11-24T18:00:02.000Z] [ERROR] Failed to process product 456 - EAN: N/A, Error: Network timeout
```

### 4. Interruption Gracieuse (Ctrl+C)

Vous pouvez interrompre l'import à tout moment avec **Ctrl+C** :
- Le produit en cours sera terminé
- Un résumé complet sera affiché (temps, appels API, statistiques)
- Double Ctrl+C force l'arrêt immédiat

### 5. Gestion des Mappings

#### Générer le mapping automatique
```bash
node scripts/generate_mapping.js
```
Lit `data/categories_output_flat.json` et `data/backend_categories.json`, génère `mappings/category_mapping.json`.

#### Vérifier les mappings manquants
```bash
node scripts/check_selected_mappings.js
```
Vérifie que toutes les catégories dans `mappings/selected_ids.json` ont un mapping et génère un rapport.

#### Fusionner les mappings manuels
```bash
node scripts/merge_mappings.js
```
Fusionne `mappings/suggested_mappings.json` (mappings manuels) dans `mappings/category_mapping.json`.

## Arguments de l'Importeur

| Argument | Description | Exemple |
|----------|-------------|---------|
| `--csv` | Chemin vers le fichier CSV index | `data/files.index.csv` |
| `--mode` | Mode d'exécution (`api` ou `files`) | `files` |
| `--outDir` | Dossier de sortie (mode files) | `icecat-output` |
| `--apiUrl` | URL de l'API backend (surcharge `.env`) | `http://localhost:3000/devices` |
| `--clientId` | OAuth2 Client ID (surcharge `.env`) | `icecat-importer` |
| `--clientSecret` | OAuth2 Client Secret (surcharge `.env`) | aucune, obligatoire |
| `--mapping` | Fichier de mapping des catégories | `mappings/category_mapping.json` |
| `--selectedIds` | Fichier des IDs de catégories à filtrer | `mappings/selected_ids.json` |
| `--featuresXml` | Fichier XML des features Icecat | `data/FeaturesList.xml` |
| `--logDir` | Dossier de logs (surcharge `.env`) | `./logs` |
| `--skip` | **Sauter les N premières lignes** | `500` |
| `--startId` | **Commencer à partir d'un ID produit** | `123456` |
| `--dryJson` | Test avec un fichier JSON local | `test.json` |

## Workflow de Mapping des Catégories

1. **Génération automatique** : `node scripts/generate_mapping.js`
2. **Vérification** : `node scripts/check_selected_mappings.js`
3. **Édition manuelle** : Modifier `mappings/suggested_mappings.json` pour les catégories non mappées
4. **Fusion** : `node scripts/merge_mappings.js`
5. **Vérification finale** : `node scripts/check_selected_mappings.js`

## Filtrage par Catégories

L'importeur peut filtrer les produits par catégorie Icecat :

1. Créer un fichier JSON avec les IDs de catégories Icecat à importer :
   ```json
   ["1893", "8760", "1331"]
   ```

2. Utiliser l'argument `--selectedIds` :
   ```bash
   node import_icecat.js --csv data/files.index.csv --selectedIds mappings/selected_ids.json ...
   ```

Le filtrage se fait **avant** l'appel à l'API Icecat pour optimiser les performances.

## Format de Sortie

Chaque produit est exporté en JSON avec la structure suivante :

```json
{
  "ean": "5705965480557",
  "serial_number": "C4872A",
  "manufacturer": "HP",
  "brand": "HP",
  "model": "Cartouche d'encre cyan HP 80 175-ml",
  "categories": [1, 2],
  "device_type": "UNKNOWN",
  "source": "ICECAT",
  "source_id": "123456",
  "technicalProperties": [
    {
      "property_name": "Compatibility",
      "property_value": "HP Designjet 1000"
    }
  ],
  "informationalProperties": [
    {
      "property_name": "ReleaseDate",
      "property_value": "2020-01-01"
    }
  ]
}
```

## Notes

- **Authentification** : Le script utilise OAuth2 Client Credentials pour s'authentifier automatiquement
- **Logs** : Les logs sont écrits dans `logs/import_YYYY-MM-DD.log` avec un résumé final
- **Catégories** : Les catégories sont mappées via `mappings/category_mapping.json`
- **Filtrage** : Le filtrage par catégorie se fait sur les IDs Icecat (colonne `catid` du CSV)
- **Features** : Les features sont enrichies avec les noms du fichier XML `FeaturesList.xml`
- **Nom du modèle** : `model` reprend `ProductName` d'Icecat, qui perd parfois la famille (« 15 » pour un ThinkBook 15). La famille, la série et le titre complet sont donc gardés en propriétés informationnelles `ProductFamily`, `ProductSeries` et `Title`, pour distinguer les modèles
- **Reprise** : Utilisez `--skip` ou `--startId` pour reprendre un import interrompu

## Maintenance

### Ajouter de nouvelles catégories au mapping

1. Ajouter les IDs Icecat dans `mappings/selected_ids.json`
2. Exécuter `node scripts/check_selected_mappings.js`
3. Éditer `mappings/suggested_mappings.json` avec les mappings corrects
4. Exécuter `node scripts/merge_mappings.js`

### Mettre à jour les catégories backend

1. Récupérer les nouvelles catégories : `GET http://localhost:3000/api/v1/device-categories`
2. Sauvegarder dans `data/backend_categories.json`
3. Régénérer le mapping : `node scripts/generate_mapping.js`
4. Vérifier et fusionner les mappings manuels si nécessaire

## Déploiement en Production (Cron)

Pour automatiser l'import via cron :

1. Configurer le fichier `.env` avec les credentials de production
2. Créer un script cron :
   ```bash
   # Exécuter l'import tous les 1er du mois à 2h du matin
   0 2 1 * * cd /path/to/importers/icecat && node import_icecat.js --csv data/files.index.csv >> logs/cron.log 2>&1
   ```
3. Les logs seront disponibles dans `logs/import_YYYY-MM-DD.log`

## Troubleshooting

### Import interrompu par erreur réseau
```bash
# Vérifier le dernier produit traité dans les logs
tail -n 50 logs/import_2025-11-27.log

# Reprendre avec --skip ou --startId
node import_icecat.js --csv data/files.index.csv --skip 1000 ...
```

### Produits avec restrictions de marque
Ces produits sont automatiquement ignorés et comptés séparément dans le résumé final.

### Erreurs d'authentification OAuth2
Vérifier que les credentials dans `.env` sont corrects et que le client OAuth2 existe dans la base de données.