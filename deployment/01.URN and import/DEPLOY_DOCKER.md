# Déploiement sur serveur Linux avec PostgreSQL Docker

Ce guide explique comment exécuter les scripts de déploiement sur un serveur Linux qui utilise PostgreSQL via Docker.

## Prérequis

- Docker et Docker Compose installés
- Conteneur PostgreSQL nommé `db` en cours d'exécution
- Accès SSH au serveur

## Option 1 : Utiliser le script Docker (Recommandé)

### Sur votre serveur Linux :

```bash
# 1. Aller dans le répertoire du projet
cd /opt/care2repair

# 2. Rendre le script exécutable
chmod +x "deployment/01.URN and import/deploy-docker.sh"

# 3. Exécuter le déploiement
"deployment/01.URN and import/deploy-docker.sh"
```

### Variables d'environnement (optionnelles) :

```bash
# Personnaliser le conteneur et la base de données
DB_CONTAINER=db \
DB_USER=postgres \
DB_NAME=service_hub \
"deployment/01.URN and import/deploy-docker.sh"
```

## Option 2 : Exécution manuelle étape par étape

### 1. Créer un backup

```bash
# Créer le dossier de backup
mkdir -p backups

# Faire le dump de la base
docker exec -t db pg_dump -U postgres -d service_hub > backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Exécuter les migrations

```bash
# Exécuter chaque migration dans l'ordre
docker exec -i db psql -U postgres -d service_hub < "deployment/01.URN and import/01_add_urn_columns.sql"
docker exec -i db psql -U postgres -d service_hub < "deployment/01.URN and import/02_add_import_tracking_fields.sql"
docker exec -i db psql -U postgres -d service_hub < "deployment/01.URN and import/03_fix_ean_constraint.sql"
docker exec -i db psql -U postgres -d service_hub < "deployment/01.URN and import/04_add_permissions.sql"
```

### 3. Vérifier les migrations

```bash
docker exec -i db psql -U postgres -d service_hub < "deployment/01.URN and import/verify_migrations.sql"
```

### 4. Rebuild et redémarrer les services

```bash
# Rebuild
docker compose build devices-service api-gateway

# Redémarrer
docker compose up -d devices-service api-gateway

# Vérifier le status
docker compose ps devices-service api-gateway

# Voir les logs
docker compose logs -f devices-service api-gateway
```

## Option 3 : Script one-liner

Pour exécuter toutes les migrations en une seule commande :

```bash
cd /opt/care2repair && \
docker exec -t db pg_dump -U postgres -d service_hub > backups/backup_$(date +%Y%m%d_%H%M%S).sql && \
for f in "deployment/01.URN and import"/0*.sql; do \
  echo "Running $f..." && \
  docker exec -i db psql -U postgres -d service_hub < "$f"; \
done && \
docker compose build devices-service api-gateway && \
docker compose up -d devices-service api-gateway
```

## Rollback en cas de problème

### Restaurer depuis le backup :

```bash
# Trouver le dernier backup
ls -lt backups/

# Restaurer
docker exec -i db psql -U postgres -d service_hub < backups/backup_YYYYMMDD_HHMMSS.sql
```

### Ou exécuter le script de rollback :

```bash
docker exec -i db psql -U postgres -d service_hub < "deployment/01.URN and import/rollback.sql"
```

## Vérification post-déploiement

### Vérifier les colonnes URN :

```bash
docker exec -i db psql -U postgres -d service_hub -c "\d devices"
```

### Vérifier les permissions :

```bash
docker exec -i db psql -U postgres -d service_hub -c "SELECT * FROM permissions WHERE name LIKE 'device.%';"
```

### Tester l'API :

```bash
# Test de santé
curl http://localhost:3000/health

# Test des devices
curl http://localhost:3000/api/v1/devices
```

## Troubleshooting

### Le conteneur PostgreSQL n'est pas trouvé :

```bash
# Lister les conteneurs
docker ps

# Si le nom est différent, utiliser :
DB_CONTAINER=nom_du_conteneur ./deploy-docker.sh
```

### Erreur de permissions :

```bash
# Vérifier que l'utilisateur a les droits
docker exec -it db psql -U postgres -c "\du"
```

### Les migrations échouent :

```bash
# Voir les logs du conteneur
docker logs db

# Se connecter manuellement pour débugger
docker exec -it db psql -U postgres -d service_hub
```
