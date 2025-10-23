# 📋 How to Check Production Logs

## 🔍 Real-Time Logs (Tail)

### View live logs from production:
```bash
wrangler tail servis-rutin-backend
```

This shows:
- ✅ All requests in real-time
- ✅ Console.log output
- ✅ Errors and exceptions
- ✅ Response codes

**Press Ctrl+C to stop**

---

## 🌐 Cloudflare Dashboard

### Via Web Browser:

1. **Go to Cloudflare Dashboard**
   - Visit: https://dash.cloudflare.com
   - Login to your account

2. **Navigate to Workers**
   - Click "Workers & Pages" in left sidebar
   - Find and click "servis-rutin-backend"

3. **View Logs**
   - Click on "Logs" tab
   - See real-time activity
   - Filter by status codes, time, etc.

4. **View Analytics**
   - Click "Analytics" tab
   - See requests per minute
   - View error rates
   - Check invocation times

---

## 🔧 Useful Debugging Commands

### 1. Check Current Deployment
```bash
wrangler deployments list
```

### 2. View Production Logs (Live Tail)
```bash
wrangler tail --format pretty
```

### 3. Check Database Status
```bash
# List applied migrations
wrangler d1 migrations list servis-rutin-db --remote

# Execute SQL query
wrangler d1 execute servis-rutin-db --remote --command "SELECT * FROM users LIMIT 5"
```

### 4. Test Specific Endpoint
```bash
# Test health
curl https://servis-rutin-backend.jankerzone.workers.dev/api/health

# Test signup
curl -X POST https://servis-rutin-backend.jankerzone.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'
```

---

## 🐛 Common Issues & Solutions

### Issue: "D1_ERROR: no such table"
**Solution:**
```bash
# Apply migrations to production
wrangler d1 migrations apply servis-rutin-db --remote
```

### Issue: "401 Unauthorized"
**Solution:**
- Check if cookies are enabled in browser
- Verify you're logged in
- Try in incognito mode

### Issue: "500 Internal Server Error"
**Solution:**
```bash
# Check logs immediately
wrangler tail servis-rutin-backend

# Look for error messages in output
```

### Issue: Cookie not being set
**Solution:**
- Ensure you're using HTTPS (not HTTP)
- Check browser DevTools → Application → Cookies
- Verify `secure: true` in production

---

## 📊 Log Format Examples

### Successful Request
```
GET /api/vehicles 200 OK (45ms)
```

### Error Request
```
POST /api/auth/login 401 Unauthorized (12ms)
✘ [ERROR] Invalid email or password
```

### Console Logs
```
Login - Created session: abc123... for user: 1
Auth middleware - sessionId: abc123...
```

---

## 🔍 Advanced Debugging

### Check Database Tables
```bash
wrangler d1 execute servis-rutin-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### Count Users
```bash
wrangler d1 execute servis-rutin-db --remote \
  --command "SELECT COUNT(*) as total FROM users"
```

### View Recent Service History
```bash
wrangler d1 execute servis-rutin-db --remote \
  --command "SELECT * FROM service_history ORDER BY created_at DESC LIMIT 5"
```

### Check Sessions
```bash
wrangler d1 execute servis-rutin-db --remote \
  --command "SELECT id, user_id, created_at FROM sessions ORDER BY created_at DESC LIMIT 5"
```

---

## 🚨 Emergency Commands

### Rollback Deployment
```bash
# List recent deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback --message "Rollback due to issue"
```

### Restart Worker (Redeploy)
```bash
npm run deploy
```

### Clear All Sessions (Logout Everyone)
```bash
wrangler d1 execute servis-rutin-db --remote \
  --command "DELETE FROM sessions"
```

---

## 📱 Browser DevTools

### Check Frontend Errors:

1. **Open DevTools** (F12 or Right-Click → Inspect)

2. **Console Tab**
   - See JavaScript errors
   - View console.log output
   - Check API errors

3. **Network Tab**
   - Filter by "Fetch/XHR"
   - Click failed requests
   - Check "Response" tab for error messages

4. **Application Tab**
   - Storage → Cookies
   - Verify `session_id` cookie exists
   - Check cookie attributes (Secure, HttpOnly, SameSite)

---

## 💡 Monitoring Best Practices

### Regular Checks:
- ✅ Monitor request rates in Cloudflare Dashboard
- ✅ Check error percentage (should be < 5%)
- ✅ Review slow requests (> 1000ms)
- ✅ Monitor database size

### Alerts Setup (Optional):
- Set up Cloudflare Notifications
- Email alerts on high error rates
- Slack/Discord webhooks for critical errors

---

## 📞 Quick Reference

| What to Check | Command |
|---------------|---------|
| Live Logs | `wrangler tail` |
| Migrations | `wrangler d1 migrations list servis-rutin-db --remote` |
| Health | `curl https://your-worker.workers.dev/api/health` |
| Deployments | `wrangler deployments list` |
| Database Query | `wrangler d1 execute servis-rutin-db --remote --command "SQL"` |

---

## 🎯 Example Debugging Session

```bash
# 1. User reports signup error
# 2. Check live logs
wrangler tail servis-rutin-backend

# 3. Try to reproduce
curl -X POST https://servis-rutin-backend.jankerzone.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"debug@test.com","password":"test123"}'

# 4. See error in logs: "no such table: users"
# 5. Check migrations
wrangler d1 migrations list servis-rutin-db --remote

# 6. Apply missing migrations
wrangler d1 migrations apply servis-rutin-db --remote

# 7. Test again
curl -X POST https://servis-rutin-backend.jankerzone.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"debug@test.com","password":"test123"}'

# 8. Success! ✅
```

---

**Pro Tip:** Keep a terminal window with `wrangler tail` running while testing production!
