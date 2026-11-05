# Migration URN - Guide de Déploiement en Production

## Vue d'ensemble

Cette migration ajoute des URN (Uniform Resource Names) aux tables `devices` et `device_categories` comme identifiants alternatifs uniques.

**Format URN :**
- Devices: `urn:care2repair:device:{device_id}`
- Categories: `urn:care2repair:category:{id}`

## Fichiers modifiés

| Fichier | Description |
|---------|-------------|
| `src/entity/device.entity.ts` | Ajout colonne URN et hook de génération |
| `src/entity/device-category.entity.ts` | Ajout colonne URN et hook de génération |
| `src/devices/services/devices.service.ts` | Persistance URN après création |
| `src/devices/services/device-category.service.ts` | Persistance URN après création |
| `src/config/typeorm.ts` | Correction du chemin des migrations |
| `src/migrations/1732012800000-AddUrnToDevicesAndCategories.ts` | Migration TypeORM |

---

## Procédure de déploiement en production

### Étape 1 : Préparation

**1.1 Sauvegarder la base de données**

```bash
# Sur le serveur de production
docker-compose exec db pg_dump -U postgres servicehub > backup_before_urn_migration_$(date +%Y%m%d_%H%M%S).sql
```

**1.2 Vérifier l'état actuel**

```bash
# Vérifier que les colonnes URN n'existent pas encore
docker-compose exec db psql -U postgres -d servicehub -c "\d devices" | grep urn
docker-compose exec db psql -U postgres -d servicehub -c "\d device_categories" | grep urn
```

Si les colonnes existent déjà, passez directement à l'Étape 3 (Backfill).

---

### Étape 2 : Déploiement du code

**2.1 Déployer les modifications**

```bash
# Pull les dernières modifications
git pull origin main

# Rebuild l'image Docker du service devices
docker-compose build devices-service

# Redémarrer le service
docker-compose up -d devices-service
```

**2.2 Vérifier que le service démarre correctement**

```bash
# Vérifier les logs
docker-compose logs -f devices-service

# Vérifier le health check
docker-compose ps devices-service
```

> **Note importante :** Avec `synchronize: true` dans TypeORM, les colonnes URN seront **automatiquement créées** au démarrage du service. C'est normal et attendu.

---

### Étape 3 : Backfill des URN (CRITIQUE)

Les colonnes URN sont créées vides. Il faut maintenant remplir les URN pour tous les enregistrements existants.

**3.1 Backfill des devices**

```bash
docker-compose exec db psql -U postgres -d servicehub -c "UPDATE devices SET urn = CONCAT('urn:care2repair:device:', device_id) WHERE urn IS NULL;"
```

**Résultat attendu :** `UPDATE X` où X est le nombre de devices dans votre base.

**3.2 Backfill des categories**

```bash
docker-compose exec db psql -U postgres -d servicehub -c "UPDATE device_categories SET urn = CONCAT('urn:care2repair:category:', id) WHERE urn IS NULL;"
```

**Résultat attendu :** `UPDATE Y` où Y est le nombre de catégories dans votre base.

---

### Étape 4 : Vérification

**4.1 Vérifier les devices**

```bash
docker-compose exec db psql -U postgres -d servicehub -c "SELECT device_id, urn, ean, model FROM devices LIMIT 5;"
```

**Résultat attendu :**
```
device_id | urn                          | ean           | model
----------|------------------------------|---------------|------------------
1         | urn:care2repair:device:1     | 1234567890123 | iPhone 13
2         | urn:care2repair:device:2     | 2345678901234 | Galaxy S21
...
```

**4.2 Vérifier les categories**

```bash
docker-compose exec db psql -U postgres -d servicehub -c "SELECT id, urn, name FROM device_categories LIMIT 5;"
```

**Résultat attendu :**
```
id | urn                              | name
---|----------------------------------|------------------
1  | urn:care2repair:category:1       | Personal Computer
2  | urn:care2repair:category:2       | Gaming Console
...
```

**4.3 Vérifier qu'il n'y a pas de NULL**

```bash
# Devices
docker-compose exec db psql -U postgres -d servicehub -c "SELECT COUNT(*) FROM devices WHERE urn IS NULL;"

# Categories
docker-compose exec db psql -U postgres -d servicehub -c "SELECT COUNT(*) FROM device_categories WHERE urn IS NULL;"
```

**Résultat attendu :** `0` pour les deux requêtes.

**4.4 Vérifier l'unicité**

```bash
# Devices - vérifier qu'il n'y a pas de doublons
docker-compose exec db psql -U postgres -d servicehub -c "SELECT urn, COUNT(*) FROM devices GROUP BY urn HAVING COUNT(*) > 1;"

# Categories - vérifier qu'il n'y a pas de doublons
docker-compose exec db psql -U postgres -d servicehub -c "SELECT urn, COUNT(*) FROM device_categories GROUP BY urn HAVING COUNT(*) > 1;"
```

**Résultat attendu :** Aucune ligne retournée (pas de doublons).

---

### Étape 5 : Test de création d'entités

**5.1 Tester la création d'un nouveau device**

```bash
curl -X POST http://votre-domaine.com/api/v1/devices \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "ean": "9999999999999",
    "serial_number": "TEST_URN_123",
    "manufacturer": "Test",
    "brand": "Test",
    "model": "Test URN Model",
    "device_type": "Test",
    "categories": []
  }'
```

**5.2 Vérifier que l'URN a été généré**

```bash
docker-compose exec db psql -U postgres -d servicehub -c "SELECT device_id, urn, model FROM devices WHERE serial_number = 'TEST_URN_123';"
```

**Résultat attendu :** L'URN doit être présent et au format `urn:care2repair:device:{device_id}`.

---

## Rollback (en cas de problème)

### Option 1 : Rollback complet (suppression des colonnes URN)

```bash
# Supprimer les colonnes URN
docker-compose exec db psql -U postgres -d servicehub -c "ALTER TABLE devices DROP COLUMN IF EXISTS urn;"
docker-compose exec db psql -U postgres -d servicehub -c "ALTER TABLE device_categories DROP COLUMN IF EXISTS urn;"

# Redéployer l'ancienne version du code
git checkout <commit-avant-urn>
docker-compose build devices-service
docker-compose up -d devices-service
```

### Option 2 : Restauration depuis la sauvegarde

```bash
# Arrêter le service
docker-compose stop devices-service

# Restaurer la base de données
docker-compose exec -T db psql -U postgres servicehub < backup_before_urn_migration_YYYYMMDD_HHMMSS.sql

# Redémarrer le service
docker-compose up -d devices-service
```

---

## Checklist de déploiement

- [ ] **Préparation**
  - [ ] Sauvegarde de la base de données effectuée
  - [ ] Vérification que les colonnes URN n'existent pas encore
  
- [ ] **Déploiement**
  - [ ] Code déployé (git pull)
  - [ ] Image Docker rebuildée
  - [ ] Service redémarré
  - [ ] Logs vérifiés (pas d'erreurs)
  - [ ] Health check OK
  
- [ ] **Backfill**
  - [ ] Backfill devices exécuté
  - [ ] Backfill categories exécuté
  - [ ] Nombre de lignes mises à jour vérifié
  
- [ ] **Vérification**
  - [ ] URN présents dans devices (échantillon)
  - [ ] URN présents dans categories (échantillon)
  - [ ] Aucun NULL dans les colonnes URN
  - [ ] Aucun doublon d'URN
  - [ ] Test de création d'un nouveau device réussi
  - [ ] URN généré automatiquement pour le nouveau device

---

## Temps estimé

- **Préparation :** 5 minutes
- **Déploiement :** 5-10 minutes (selon la taille de l'image Docker)
- **Backfill :** < 1 minute (dépend du nombre d'enregistrements)
- **Vérification :** 5 minutes
- **Total :** ~15-20 minutes

---

## Notes importantes

1. **`synchronize: true` dans TypeORM :** Cette option crée automatiquement les colonnes au démarrage. En production, il est recommandé de la désactiver et d'utiliser uniquement les migrations TypeORM.

2. **Downtime :** Cette migration peut être effectuée **sans downtime** car :
   - Les colonnes URN sont ajoutées avec `NULLABLE`
   - Le code existant continue de fonctionner avec les IDs numériques
   - Les URN sont additifs, pas de remplacement

3. **Performance :** Le backfill est très rapide (< 1 seconde pour quelques milliers d'enregistrements).

4. **Futur :** Les nouveaux devices et categories auront automatiquement leur URN généré grâce aux hooks `@AfterInsert()` dans les entités.

---

## Support

En cas de problème, vérifier :
1. Les logs du service : `docker-compose logs devices-service`
2. Les logs PostgreSQL : `docker-compose logs db`
3. La connexion à la base de données
4. Que TypeORM est bien configuré avec le bon chemin de migrations

Pour toute question, se référer au [walkthrough.md](file:///C:/Users/CorentinKERMAN/.gemini/antigravity/brain/a61905e0-d005-414f-9dd6-4f41e91136fa/walkthrough.md).
