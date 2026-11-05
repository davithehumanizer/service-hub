# Déploiement Production - Device Upsert & Import Tracking

Ce dossier contient toutes les migrations et requêtes SQL nécessaires pour déployer les nouvelles fonctionnalités en production.

## 📋 Vue d'ensemble des changements

### Nouvelles fonctionnalités
1. **Import Tracking** : Ajout de champs `import_id`, `import_date`, `source_id` pour tracer les imports
2. **URN System** : Identifiants uniques pour devices et catégories
3. **Device Upsert** : Endpoints pour vérifier et mettre à jour les devices existants
4. **Contrainte EAN** : Modification pour permettre plusieurs devices avec EAN vide

### Nouveaux endpoints API
- `GET /api/v1/devices/source/:sourceId` - Récupérer un device par source_id
- `PATCH /api/v1/devices/:id` - Mettre à jour un device
- `GET /api/v1/devices/urn/:urn` - Récupérer un device par URN

## 🚀 Procédure de déploiement

### Étape 1 : Backup de la base de données

```bash
# Créer un backup complet avant toute modification
pg_dump -U postgres -d servicehub > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Étape 2 : Exécuter les migrations SQL

Les scripts doivent être exécutés **dans l'ordre** suivant :

1. **`01_add_urn_columns.sql`** - Ajoute les colonnes URN
2. **`02_add_import_tracking_fields.sql`** - Ajoute les champs de tracking d'import
3. **`03_fix_ean_constraint.sql`** - Modifie la contrainte EAN
4. **`04_add_permissions.sql`** - Ajoute les nouvelles permissions

```bash
# Exécuter chaque script
psql -U postgres -d servicehub -f deployment/01_add_urn_columns.sql
psql -U postgres -d servicehub -f deployment/02_add_import_tracking_fields.sql
psql -U postgres -d servicehub -f deployment/03_fix_ean_constraint.sql
psql -U postgres -d servicehub -f deployment/04_add_permissions.sql
```

### Étape 3 : Vérifier les migrations

```bash
# Exécuter le script de vérification
psql -U postgres -d servicehub -f deployment/verify_migrations.sql
```

### Étape 4 : Déployer les services

```bash
# Rebuild et redémarrer les services
docker-compose build devices-service api-gateway
docker-compose up -d devices-service api-gateway
```

### Étape 5 : Vérifier le déploiement

```bash
# Vérifier que les services sont opérationnels
docker-compose ps
docker-compose logs devices-service --tail=50
docker-compose logs api-gateway --tail=50
```

## 🔄 Rollback en cas de problème

Si vous rencontrez des problèmes, utilisez le script de rollback :

```bash
psql -U postgres -d servicehub -f deployment/rollback.sql
```

Puis restaurez le backup :

```bash
psql -U postgres -d servicehub < backup_YYYYMMDD_HHMMSS.sql
```

## 📊 Vérifications post-déploiement

### 1. Vérifier les colonnes
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'devices' 
AND column_name IN ('urn', 'import_id', 'import_date', 'source_id');
```

### 2. Vérifier les contraintes
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'devices' 
AND indexname LIKE '%ean%';
```

### 3. Vérifier les permissions
```sql
SELECT r.name as role_name, p.name as permission_name
FROM roles r
JOIN roles_permissions_permission rp ON r.id = rp."rolesId"
JOIN permission p ON rp."permissionId" = p.id
WHERE p.name IN ('device.getBySourceId', 'device.update')
ORDER BY r.name;
```

### 4. Tester les endpoints
```bash
# Test GET by source_id
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/v1/devices/source/icecat-12345

# Test PATCH
curl -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"brand":"TestBrand"}' \
  http://localhost:3000/api/v1/devices/1
```

## 📝 Notes importantes

- **Downtime** : Les migrations peuvent être exécutées sans downtime car elles ajoutent uniquement des colonnes
- **Performance** : Les index sont créés automatiquement, aucun impact sur les performances
- **Données existantes** : Les devices existants auront des valeurs NULL pour les nouveaux champs
- **Compatibilité** : Les anciennes versions de l'API restent compatibles

## 🆘 Support

En cas de problème :
1. Consultez les logs : `docker-compose logs -f devices-service api-gateway`
2. Vérifiez les migrations : `deployment/verify_migrations.sql`
3. Rollback si nécessaire : `deployment/rollback.sql`

## 📚 Documentation

- [Implementation Plan](../implementation_plan.md)
- [Walkthrough](../walkthrough.md)
- [Task List](../task.md)
