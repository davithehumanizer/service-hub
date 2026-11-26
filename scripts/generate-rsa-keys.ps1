#!/usr/bin/env pwsh
# ============================================================
# OIDC RSA keypair generator
# Generates a 2048-bit RSA key pair using Node.js crypto and
# outputs base64-encoded PEM values ready to paste into
# docker-compose environment variables or a .env file.
# Usage:  ./scripts/generate-rsa-keys.ps1
# ============================================================

$nodeScript = @'
const crypto = require('crypto');
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
});
const kid = crypto.randomUUID();
const privB64 = Buffer.from(privateKey).toString('base64');
const pubB64  = Buffer.from(publicKey).toString('base64');
console.log(JSON.stringify({ kid, privB64, pubB64 }));
'@

$json = node -e $nodeScript | ConvertFrom-Json

Write-Host ""
Write-Host "=== OIDC RSA keys generated ===" -ForegroundColor Green
Write-Host ""
Write-Host "Add these to your docker-compose.yml (oauth-service and api-gateway environments):" -ForegroundColor Cyan
Write-Host ""
Write-Host "OAUTH_RSA_KID=$($json.kid)"
Write-Host "OAUTH_PRIVATE_KEY=$($json.privB64)"
Write-Host "OAUTH_PUBLIC_KEY=$($json.pubB64)"
Write-Host "OIDC_ISSUER=http://localhost:3000"
Write-Host ""
Write-Host "NOTE: Keep OAUTH_PRIVATE_KEY secret. Never commit it to source control." -ForegroundColor Yellow
