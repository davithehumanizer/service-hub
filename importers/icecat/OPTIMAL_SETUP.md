# Solution Optimale pour Serveur 8GB RAM

## Recommandation Finale

Pour votre serveur avec 8GB de RAM et Docker, voici la meilleure approche :

### 1. Réduire drastiquement la taille des chunks

```bash
# Splitter en chunks de 2,500 lignes (au lieu de 10,000)
node split_csv.js --input data/files.index.csv --lines 2500 --output chunks/
```

### 2. Arrêter temporairement les services Docker non essentiels

```bash
# Arrêter tout sauf la base de données
docker-compose stop frontend api-gateway notifications-service repairers-service ownership-service

# Garder seulement : db, user-management, devices-service
```

### 3. Lancer l'import avec le fichier XML mais avec paramètres optimisés

```bash
# Éditer run_all_chunks.sh pour utiliser ces paramètres:
NODE_OPTIONS="--max-old-space-size=1024 --expose-gc" node import_icecat.js \
  --csv "$CHUNK_FILE" \
  --mapping "$MAPPING" \
  --selectedIds "$SELECTED_IDS" \
  --featuresXml "$FEATURES_XML"
```

### 4. Ajouter des pauses plus longues entre chunks

Éditez `run_all_chunks.sh` et changez `sleep 2` en `sleep 10` pour laisser le système respirer.

### 5. Monitorer la mémoire

Dans un autre terminal :
```bash
watch -n 2 'free -h'
```

## Paramètres Optimaux

| Paramètre | Valeur | Raison |
|-----------|--------|--------|
| Chunk size | 2,500 lignes | Réduit la charge mémoire |
| Memory limit | 1024MB | Laisse 7GB pour le système et Docker |
| Pause entre chunks | 10 secondes | Permet au GC de nettoyer |
| Services Docker | Minimum | Libère ~2-3GB de RAM |

## Si ça plante encore

### Option A : Chunks encore plus petits
```bash
node split_csv.js --input data/files.index.csv --lines 1000 --output chunks/
```

### Option B : Traiter manuellement avec pauses
```bash
for chunk in chunks/chunk_*.csv; do
  echo "Processing $chunk..."
  NODE_OPTIONS="--max-old-space-size=1024 --expose-gc" node import_icecat.js \
    --csv "$chunk" \
    --mapping mappings/category_mapping.json \
    --selectedIds mappings/selected_ids.json \
    --featuresXml data/FeaturesList.xml
  
  echo "Waiting 30 seconds..."
  sleep 30
done
```

### Option C : Ajouter de la swap (temporaire)
```bash
# Créer 4GB de swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Vérifier
free -h

# Après l'import, désactiver
sudo swapoff /swapfile
sudo rm /swapfile
```

## Estimation du Temps

Avec chunks de 2,500 lignes et 10s de pause :
- ~500,000 produits = 200 chunks
- ~5 secondes par produit (API Icecat)
- Temps total : **~350 heures** (14 jours)

**Conseil** : Lancez l'import dans un `screen` ou `tmux` pour pouvoir vous déconnecter :

```bash
# Installer screen
sudo apt install screen

# Lancer dans screen
screen -S icecat_import
cd /opt/care2repair/importers/icecat
./run_all_chunks.sh

# Détacher : Ctrl+A puis D
# Réattacher : screen -r icecat_import
```

## Résumé des Commandes

```bash
# 1. Arrêter services non essentiels
docker-compose stop frontend api-gateway notifications-service

# 2. Splitter en petits chunks
node split_csv.js --input data/files.index.csv --lines 2500 --output chunks/

# 3. Lancer dans screen
screen -S icecat_import
./run_all_chunks.sh

# 4. Détacher (Ctrl+A puis D)

# 5. Monitorer les logs
tail -f logs/import_$(date +%Y-%m-%d).log

# 6. Après import, redémarrer les services
docker-compose up -d
```

Bonne chance ! 🚀
