# Servis Rutin - Deployment Guide

This guide will help you deploy the Servis Rutin application to Cloudflare Workers + D1.

## Prerequisites

1. **Cloudflare Account** (free tier works)
   - Sign up at: https://dash.cloudflare.com/sign-up

2. **Wrangler CLI** (already installed in this project)
   ```bash
   # Verify installation
   npx wrangler --version
   ```

3. **Authentication**
   ```bash
   # Login to Cloudflare
   npx wrangler login
   ```
   This will open a browser window to authorize wrangler.

---

## Deployment Steps

### Step 1: Production Database Setup

The project already has a local D1 database. For production, you can either:

**Option A: Use existing database ID (recommended for testing)**
- The `wrangler.jsonc` already has a database configured
- Just apply migrations to production

**Option B: Create new production database**
```bash
# Create a new D1 database
npx wrangler d1 create servis-rutin-db-prod

# Copy the database_id from output
# Update wrangler.jsonc:
# "database_id": "YOUR_NEW_DATABASE_ID"
```

### Step 2: Apply Database Migrations

```bash
# Apply all migrations to production database
npm run db:migrate:prod

# Or manually:
npx wrangler d1 migrations apply servis-rutin-db --remote
```

**Expected Output:**
```
✅ Migrations applied successfully!
- 0000_spooky_mysterio.sql (kendaraan, service_items tables)
- 0001_rapid_vision.sql (current_km field)
```

### Step 3: Deploy to Cloudflare Workers

```bash
# Build frontend first
npm run build:frontend

# Deploy both backend and frontend
npx wrangler deploy
```

**Expected Output:**
```
✨ Successfully deployed!
🌍 Worker URL: https://servis-rutin-backend.YOUR_SUBDOMAIN.workers.dev
```

### Step 4: Test Production Deployment

```bash
# Test API health check
curl https://servis-rutin-backend.YOUR_SUBDOMAIN.workers.dev/api/health

# Expected response:
# {"status":"ok","message":"Servis Rutin API is running"}
```

Open in browser:
```
https://servis-rutin-backend.YOUR_SUBDOMAIN.workers.dev
```

You should see the Servis Rutin application!

---

## Seeding Production Data (Optional)

If you want to add initial data to production:

### Add a Test Vehicle

```bash
# Execute SQL directly on production database
npx wrangler d1 execute servis-rutin-db --remote \
  --command "INSERT INTO kendaraan (nama, tipe, plat, tahun, bulan_pajak, current_km) 
             VALUES ('Honda Beat', 'Motor', 'B 1234 XYZ', 2020, 12, 15000)"
```

### Add a Test Service Item

```bash
npx wrangler d1 execute servis-rutin-db --remote \
  --command "INSERT INTO service_items (kendaraan_id, nama, interval_type, interval_value, last_km, last_date) 
             VALUES (1, 'Engine Oil', 'KM', 5000, 15000, '2024-10-21')"
```

### Verify Data

```bash
# Check vehicles
npx wrangler d1 execute servis-rutin-db --remote \
  --command "SELECT * FROM kendaraan"

# Check service items
npx wrangler d1 execute servis-rutin-db --remote \
  --command "SELECT * FROM service_items"
```

---

## Custom Domain Setup (Optional)

### Prerequisites
- Domain managed by Cloudflare DNS
- Or use Cloudflare Registrar

### Steps

1. **Go to Cloudflare Dashboard:**
   - Workers & Pages → servis-rutin-backend → Settings → Triggers

2. **Add Custom Domain:**
   - Click "Add Custom Domain"
   - Enter: `servisrutin.yourdomain.com`
   - Click "Add Custom Domain"

3. **DNS Configuration:**
   - Cloudflare will automatically create a CNAME record
   - If not automatic, add:
     ```
     Type: CNAME
     Name: servisrutin
     Target: servis-rutin-backend.YOUR_SUBDOMAIN.workers.dev
     ```

4. **Access Application:**
   ```
   https://servisrutin.yourdomain.com
   ```

---

## Environment Variables (If Needed)

If you need to add environment variables:

```bash
# Set secret (for sensitive data)
npx wrangler secret put SECRET_NAME

# Set variable in wrangler.jsonc:
{
  "vars": {
    "ENVIRONMENT": "production"
  }
}
```

---

## Monitoring & Logs

### View Production Logs

```bash
# Real-time logs (like tail -f)
npx wrangler tail

# Filter by status
npx wrangler tail --status error
```

### Check Deployment Status

```bash
# List deployments
npx wrangler deployments list

# Get deployment details
npx wrangler deployment view <deployment-id>
```

### Database Console

```bash
# Open D1 console
npx wrangler d1 console servis-rutin-db --remote
```

---

## Rollback (If Needed)

```bash
# List previous deployments
npx wrangler deployments list

# Rollback to previous version
npx wrangler rollback <deployment-id>
```

---

## Troubleshooting

### Issue: Deployment fails with "Database not found"

**Solution:**
```bash
# List all D1 databases
npx wrangler d1 list

# Ensure database_id in wrangler.jsonc matches an existing database
```

### Issue: Migrations fail on production

**Solution:**
```bash
# List applied migrations
npx wrangler d1 migrations list servis-rutin-db --remote

# If needed, force apply a specific migration
npx wrangler d1 execute servis-rutin-db --remote \
  --file=./migrations/0001_rapid_vision.sql
```

### Issue: Frontend not loading

**Solution:**
```bash
# Ensure frontend is built
npm run build:frontend

# Check if files exist
ls -la public/

# Should see:
# - index.html
# - assets/ (with JS and CSS files)
```

### Issue: CORS errors in production

**Solution:**
- CORS is already configured in `src/index.ts`
- Verify `cors()` middleware is applied
- Check browser console for specific errors

### Issue: API returns 500 errors

**Solution:**
```bash
# Check production logs
npx wrangler tail

# Look for error messages
# Common issues:
# - Database query syntax errors
# - Missing table columns
# - Incorrect data types
```

---

## Performance Optimization

### Enable Caching (Optional)

Add cache headers in `src/index.ts`:

```typescript
app.get('/api/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'public, max-age=60');
});
```

### Compression

Workers automatically use Brotli/Gzip compression for responses.

### D1 Query Optimization

```typescript
// Use indexes for better performance
// Add in migration:
CREATE INDEX idx_service_items_kendaraan 
  ON service_items(kendaraan_id);
```

---

## Costs (Free Tier Limits)

### Cloudflare Workers (Free Tier)
- ✅ 100,000 requests/day
- ✅ 10ms CPU time per request
- ✅ Enough for personal use

### Cloudflare D1 (Free Tier)
- ✅ 5GB storage
- ✅ 5 million reads/month
- ✅ 100,000 writes/month

**Estimated usage for personal app:**
- ~100 vehicles
- ~500 service items
- ~1,000 API calls/day
- **Cost: $0/month** (within free tier)

---

## Production Checklist

Before going live:

- [ ] ✅ All migrations applied to production
- [ ] ✅ Test vehicle and service item created
- [ ] ✅ Health endpoint responds correctly
- [ ] ✅ Frontend loads without errors
- [ ] ✅ Can add/view service items
- [ ] ✅ Vehicle switching works
- [ ] ✅ Progress bars display correctly
- [ ] ✅ Reminders show when due
- [ ] ✅ Custom domain configured (optional)
- [ ] ✅ Logs checked for errors

---

## Continuous Deployment (Optional)

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main, master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build frontend
        run: npm run build:frontend
      
      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Setup:
1. Create Cloudflare API Token (with Workers edit permission)
2. Add token to GitHub Secrets: `CLOUDFLARE_API_TOKEN`
3. Push to main/master → Auto deploy!

---

## Support

For issues or questions:
- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Cloudflare D1 Docs: https://developers.cloudflare.com/d1/
- Wrangler CLI Docs: https://developers.cloudflare.com/workers/wrangler/

---

## Summary

**Quick Deploy Commands:**
```bash
# 1. Login
npx wrangler login

# 2. Apply migrations
npm run db:migrate:prod

# 3. Build & Deploy
npm run build:frontend
npx wrangler deploy

# Done! 🎉
```

Your app will be live at:
```
https://servis-rutin-backend.YOUR_SUBDOMAIN.workers.dev
```

---

*Deployment guide for Servis Rutin - Vehicle Service Tracker*  
*Updated: October 21, 2024*
