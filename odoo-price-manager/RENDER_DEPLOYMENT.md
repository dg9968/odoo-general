# Deploying Odoo Price Manager to Render

This guide walks you through deploying the Next.js Odoo Price Manager application to Render.

## Prerequisites

1. A [Render account](https://render.com) (free tier available)
2. Your application code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Your Odoo instance credentials and API keys ready

## Step 1: Prepare Your Repository

Ensure your `odoo-price-manager` folder is pushed to your Git repository:

```bash
cd c:\Users\danie\Documents\Odoo-General
git add odoo-price-manager/
git commit -m "Prepare odoo-price-manager for Render deployment"
git push origin main
```

## Step 2: Create a New Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository:
   - Choose your Git provider (GitHub/GitLab/Bitbucket)
   - Authorize Render to access your repositories
   - Select your `odoo-general` repository

## Step 3: Configure Web Service Settings

### Basic Settings
- **Name**: `odoo-price-manager` (or your preferred name)
- **Root Directory**: `odoo-price-manager`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)

### Build & Deploy Settings
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### Instance Type
- **Free** tier for testing
- **Starter** ($7/month) or higher for production with better performance

## Step 4: Configure Environment Variables

In the Render dashboard, add these environment variables under **Environment**:

### Required Variables

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Enables production optimizations |
| `ODOO_URL` | `https://your-instance.odoo.com` | Your Odoo instance URL |
| `ODOO_DB` | `your-database-name` | Your Odoo database name |
| `ODOO_USERNAME` | `your-username` | Odoo API username |
| `ODOO_PASSWORD` | `your-password` | Odoo API password (use Secret File for security) |
| `BARCODE_LOOKUP_API_KEY` | `your-api-key` | Barcode lookup service API key |
| `AIRTABLE_API_KEY` | `your-api-key` | Airtable API key (if using Airtable) |
| `AIRTABLE_BASE_ID` | `your-base-id` | Airtable base ID (if using Airtable) |
| `AIRTABLE_TABLE_NAME` | `Product Research` | Airtable table name (if using Airtable) |

### Security Best Practices

For sensitive values like `ODOO_PASSWORD`, use Render's **Secret Files** feature:
1. Click **"Add Secret File"**
2. Create a file at `.env.production`
3. Add sensitive variables there
4. Reference them in your code

## Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Run `npm install`
   - Run `npm run build`
   - Start your application with `npm start`
3. Monitor the deployment logs in real-time

## Step 6: Verify Deployment

Once deployed, Render provides a URL like: `https://odoo-price-manager.onrender.com`

1. Visit your application URL
2. Test the barcode scanning functionality
3. Verify Odoo price updates work correctly
4. Check the logs under **"Logs"** tab for any errors

## Step 7: Set Up Custom Domain (Optional)

1. In your Render service, go to **"Settings"** → **"Custom Domain"**
2. Add your domain (e.g., `pricemanager.yourdomain.com`)
3. Configure DNS records as shown by Render
4. Render automatically provisions SSL certificates

## Post-Deployment Configuration

### Health Checks
Render automatically monitors your application. To customize:
- Go to **"Settings"** → **"Health & Alerts"**
- Set health check path (default is `/`)

### Auto-Deploy
By default, Render auto-deploys when you push to your branch. To disable:
- Go to **"Settings"** → **"Build & Deploy"**
- Toggle **"Auto-Deploy"**

### Scaling
For production load:
- Go to **"Settings"** → **"Scaling"**
- Increase instance size or enable horizontal scaling

## Troubleshooting

### Build Failures
- Check logs for `npm install` errors
- Verify `package.json` and `package-lock.json` are committed
- Ensure Node version compatibility (Render uses Node 20 by default)

### Runtime Errors
- Check environment variables are set correctly
- Verify Odoo instance is accessible from Render's servers
- Review application logs under **"Logs"** tab

### USB Device Access
Note: USB barcode scanner functionality will not work in production (browser security limitation). The app should gracefully handle this with file upload/manual entry fallback.

### Connection Issues
- Ensure Odoo URL uses `https://` for security
- Verify firewall/IP restrictions on your Odoo instance allow Render's IPs
- Check API credentials are correct

## Monitoring and Maintenance

### View Logs
- Go to **"Logs"** tab in Render dashboard
- Filter by severity (info, warn, error)
- Download logs for detailed analysis

### Metrics
- Monitor CPU, Memory, and Bandwidth usage in **"Metrics"** tab
- Set up alerts for high resource usage

### Updates
```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main
# Render auto-deploys your changes
```

## Cost Optimization

- **Free Tier**: Spins down after 15 minutes of inactivity (slower cold starts)
- **Starter Tier** ($7/month): Always on, better for production
- Use free tier for staging/testing environments

## Support Resources

- [Render Documentation](https://render.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [Render Community Forum](https://community.render.com)

## Next Steps

1. Set up a staging environment (duplicate service with test data)
2. Configure monitoring/alerting
3. Set up automated backups for Odoo data
4. Implement CI/CD pipeline with automated tests before deployment
