# Monday.com Domain Ownership Verification

**Purpose:** Prove to Monday.com that you own the domain where your app is hosted.

---

## What You Need to Do

### Step 1: Get Your Monday App Client ID

1. Go to your Monday.com app dashboard
2. Find your app's **Client ID** (looks like: `1234567890abcdef`)
3. Copy it

### Step 2: Update the Verification File

Replace `YOUR_MONDAY_APP_CLIENT_ID` in `.well-known/monday-app-association.json`:

**File Location:** `.well-known/monday-app-association.json`

**Before:**
```json
{
  "apps": [
    {
      "clientID": "YOUR_MONDAY_APP_CLIENT_ID"
    }
  ]
}
```

**After (Example):**
```json
{
  "apps": [
    {
      "clientID": "1234567890abcdef"
    }
  ]
}
```

### Step 3: Deploy and Make File Publicly Accessible

The file must be served at:
```
https://your-domain.com/.well-known/monday-app-association.json
```

**For different deployment platforms:**

#### Express.js (Current Setup)
Add this to `server.js` to serve the file:
```javascript
// Serve .well-known directory
app.use('/.well-known', express.static('.well-known'));
```

Or (if using public directory):
```javascript
// Serve public assets including .well-known
app.use(express.static('public'));
// Copy .well-known directory to public/
```

#### Vercel/Netlify
1. Ensure `.well-known/` directory is in your project root
2. The file will be automatically served at `/.well-known/monday-app-association.json`

#### Docker/Containerized
Make sure the `.well-known` directory is included in your Docker image:
```dockerfile
COPY .well-known /app/.well-known
```

### Step 4: Verify the File is Accessible

Test that Monday.com can reach your file:

```bash
# From terminal
curl https://your-domain.com/.well-known/monday-app-association.json

# Should return:
# {
#   "apps": [
#     {
#       "clientID": "your-client-id"
#     }
#   ]
# }
```

### Step 5: Submit to Monday.com

When submitting your app to Monday Marketplace:
1. Confirm the domain where your app is hosted
2. Confirm the file is accessible at `/.well-known/monday-app-association.json`
3. Monday.com will verify ownership automatically

---

## Important Notes

⚠️ **Requirements:**
- File MUST be publicly accessible (no authentication required)
- File MUST be at the root domain (not a subdomain, unless app is on subdomain)
- File MUST contain VALID JSON (not malformed)
- File MUST contain your actual Client ID (not placeholder)
- File MUST be served with correct MIME type (`application/json`)

❌ **Common Mistakes:**
- Leaving the placeholder `YOUR_MONDAY_APP_CLIENT_ID` in production
- File behind authentication or firewall
- File not served as JSON (served as HTML instead)
- Wrong domain or subdomain path
- File at wrong location (e.g., `/public/.well-known/` instead of `/.well-known/`)

---

## Current Status

- ✅ File created: `.well-known/monday-app-association.json`
- ⚠️ Needs: Your actual Client ID
- ⚠️ Needs: Deployment configuration to serve the file publicly
- ⚠️ Needs: Verification that file is accessible

---

## Server Configuration (Express.js)

Add to `server.js` after express initialization:

```javascript
// ===== DOMAIN VERIFICATION FOR MONDAY.COM =====
// Serve .well-known directory for domain ownership verification
app.use('/.well-known', express.static(path.join(__dirname, '.well-known'), {
  setHeaders: (res, path) => {
    // Ensure correct MIME type for JSON
    if (path.endsWith('.json')) {
      res.set('Content-Type', 'application/json');
    }
    // Allow access without authentication
    res.set('Cache-Control', 'public, max-age=3600');
  }
}));
```

---

## Testing Locally

If testing locally before deployment:

```bash
# Start your server
npm start

# In another terminal, test the file
curl http://localhost:8080/.well-known/monday-app-association.json

# Should output:
# {"apps":[{"clientID":"your-actual-client-id"}]}
```

---

## Deployment Checklist

- [ ] Client ID obtained from Monday.com dashboard
- [ ] `.well-known/monday-app-association.json` updated with actual Client ID
- [ ] Express.js configured to serve `.well-known` directory
- [ ] File deployed to production
- [ ] File accessible at `https://your-domain.com/.well-known/monday-app-association.json`
- [ ] Tested with `curl` - returns valid JSON
- [ ] Submitted to Monday.com Marketplace
- [ ] Monday.com verification successful ✅

---

**Last Updated:** December 6, 2025
**Monday.com Reference:** https://developer.monday.com/apps/docs/app-overview
