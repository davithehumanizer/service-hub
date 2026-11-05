#!/bin/bash
# Deployment script for production
# This script automates the deployment process

set -e  # Exit on error

echo "=== Care2Repair Production Deployment ==="
echo ""

# Configuration
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-servicehub}"
BACKUP_DIR="./backups"
DEPLOYMENT_DIR="./deployment"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Backup
echo "Step 1/5: Creating database backup..."
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
echo "✓ Backup created: $BACKUP_FILE"
echo ""

# Step 2: Run migrations
echo "Step 2/5: Running migrations..."
for migration in "$DEPLOYMENT_DIR"/0*.sql; do
  echo "  Running $(basename $migration)..."
  psql -U "$DB_USER" -d "$DB_NAME" -f "$migration"
done
echo "✓ All migrations completed"
echo ""

# Step 3: Verify migrations
echo "Step 3/5: Verifying migrations..."
psql -U "$DB_USER" -d "$DB_NAME" -f "$DEPLOYMENT_DIR/verify_migrations.sql"
echo "✓ Verification completed"
echo ""

# Step 4: Rebuild services
echo "Step 4/5: Rebuilding services..."
docker-compose build devices-service api-gateway
echo "✓ Services rebuilt"
echo ""

# Step 5: Restart services
echo "Step 5/5: Restarting services..."
docker-compose up -d devices-service api-gateway
echo "✓ Services restarted"
echo ""

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check service status
echo "Service status:"
docker-compose ps devices-service api-gateway

echo ""
echo "=== Deployment Complete ==="
echo "Backup location: $BACKUP_FILE"
echo ""
echo "Next steps:"
echo "1. Check service logs: docker-compose logs -f devices-service api-gateway"
echo "2. Test endpoints (see README.md)"
echo "3. Monitor for errors"
echo ""
echo "If you need to rollback:"
echo "  psql -U $DB_USER -d $DB_NAME -f $DEPLOYMENT_DIR/rollback.sql"
echo "  psql -U $DB_USER -d $DB_NAME < $BACKUP_FILE"
