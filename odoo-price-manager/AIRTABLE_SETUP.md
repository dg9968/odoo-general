# Airtable Setup Guide

## Step 1: Create Your Airtable Base

1. Go to [airtable.com](https://airtable.com) and sign in
2. Click **"Create a base"** or use an existing workspace
3. Name your base (e.g., "Product Research")
4. Create a table named **"Product Research"** (or your preferred name)

## Step 2: Set Up Table Fields

Create the following fields in your table:

| Field Name | Field Type | Notes |
|------------|------------|-------|
| barcode | Single line text | Primary field |
| productName | Single line text | |
| brand | Single line text | |
| category | Single line text | |
| manufacturer | Single line text | |
| description | Long text | |
| images | Attachment | For product images |
| mpn | Single line text | Manufacturer Part Number |
| model | Single line text | |
| size | Single line text | |
| weight | Single line text | |
| stores | Long text | Comma-separated store names |
| features | Long text | Product features (newline-separated) |
| storePricing | Long text | Detailed store pricing data (JSON format) |

## Step 3: Get Your Base ID

1. Open your base in Airtable
2. Look at the URL in your browser
3. Copy the Base ID from the URL:
   ```
   https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/...
                        ^^^^^^^^^^^^^^^^^^^
                        This is your Base ID
   ```
4. Your Base ID starts with `app`

## Step 4: Create Personal Access Token

1. Go to https://airtable.com/create/tokens
2. Click **"Create new token"**
3. Give it a name (e.g., "Odoo Price Manager")
4. Under **Scopes**, add:
   - ✅ `data.records:read`
   - ✅ `data.records:write`
   - ✅ `schema.bases:read`
5. Under **Access**, click **"Add a base"**
6. Select your Product Research base
7. Click **"Create token"**
8. **IMPORTANT**: Copy your token immediately (starts with `pat`)
9. You won't be able to see it again!

## Step 5: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Airtable Configuration
AIRTABLE_ACCESS_TOKEN=patXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Product Research
```

Replace:
- `patXXXXXXXXXXXXXX` with your actual token (from Step 4)
- `appXXXXXXXXXXXXXX` with your Base ID (from Step 3)
- `Product Research` with your table name if different

## Step 6: Test Configuration

Navigate to: `http://localhost:3002/api/airtable-test`

You should see:
```json
{
  "success": true,
  "message": "Airtable connection successful",
  "recordCount": 0,
  "baseId": "appXXXXXXXXXXXXXX",
  "tableName": "Product Research"
}
```

## Troubleshooting

### Error: 404 NOT_FOUND

**Causes:**
- Base ID is incorrect
- Table name doesn't match exactly (case-sensitive!)
- Token doesn't have access to this base

**Solutions:**
1. Double-check Base ID from URL
2. Verify table name spelling and capitalization
3. Recreate token and ensure you granted access to the base

### Error: 401 UNAUTHORIZED

**Causes:**
- Token is invalid or expired
- Token doesn't have required scopes

**Solutions:**
1. Create a new token with all required scopes
2. Ensure you copied the full token (starts with `pat`)
3. Check token hasn't been deleted in Airtable

### Error: 403 FORBIDDEN

**Causes:**
- Token doesn't have write permissions
- Base permissions issue

**Solutions:**
1. Verify token has `data.records:write` scope
2. Check base access in token settings

## Security Best Practices

1. **Never commit `.env.local`** to git
2. Add `.env.local` to `.gitignore`
3. Rotate tokens periodically
4. Use separate tokens for development and production
5. Limit token scopes to only what's needed

## Free Plan Limits

- **1,200 records per base** (unlimited bases)
- **2GB of attachments per base**
- **100,000 API calls per workspace per day**

For most use cases, this is plenty!

## Next Steps

Once configured:
1. Visit `/research` in your app
2. Scan a barcode
3. Check Airtable to see the saved record
4. View history of researched products
