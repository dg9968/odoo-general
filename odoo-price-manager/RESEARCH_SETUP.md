# Product Research Setup Guide

This guide will help you set up the Product Research feature that integrates barcode scanning with product lookup and Airtable storage.

## Features

- **Barcode Scanning**: Use camera or manual entry to scan product barcodes
- **Product Lookup**: Automatically fetch product information from barcodelookup.com
- **Data Storage**: Store researched products in Airtable for future reference
- **History Tracking**: View recently scanned products

## Prerequisites

1. **Barcode Lookup API Key**
   - Sign up at [barcodelookup.com](https://www.barcodelookup.com/)
   - Get your API key from the dashboard
   - Free tier includes 100 requests/day

2. **Airtable Account**
   - Sign up at [airtable.com](https://airtable.com/)
   - Create a new base for Product Research
   - Generate an API key from Account Settings

## Setup Instructions

### 1. Create Airtable Base

1. Log in to Airtable
2. Create a new base named "Product Research"
3. Create a table with the following fields:

| Field Name | Type | Description |
|------------|------|-------------|
| barcode | Single line text | Product barcode |
| productName | Single line text | Product name |
| brand | Single line text | Brand name |
| category | Single line text | Product category |
| manufacturer | Single line text | Manufacturer |
| description | Long text | Product description |
| images | Multiple attachments | Product images |
| mpn | Single line text | Manufacturer Part Number |
| model | Single line text | Model number |
| size | Single line text | Product size |
| weight | Single line text | Product weight |
| stores | Multiple select | Available stores |
| researchedAt | Date | Research timestamp |
| researchedBy | Single line text | User who researched |

4. Get your Base ID from the URL: `https://airtable.com/app{BASE_ID}/...`

### 2. Configure Environment Variables

Add these variables to your `.env.local` file:

```bash
# Barcode Lookup API
BARCODE_LOOKUP_API_KEY=your_api_key_here

# Airtable
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
AIRTABLE_TABLE_NAME=Product Research
```

### 3. Install Dependencies

The required dependencies should already be installed, but verify:

```bash
npm install @zxing/library
```

### 4. Access the Feature

Navigate to `/research` or click "Product Research" in the navigation menu.

## Usage

### Manual Entry
1. Select "Manual Entry" tab
2. Enter barcode number
3. Click "Research Product"

### Camera Scanner
1. Select "Camera Scanner" tab
2. Choose your camera (prefer back camera on mobile)
3. Click "Start Camera"
4. Point camera at barcode
5. Product will be automatically researched when barcode is detected

## API Endpoints

### POST /api/barcode-research
Research a product by barcode

**Request:**
```json
{
  "barcode": "012345678901",
  "saveToDatabase": true
}
```

**Response:**
```json
{
  "success": true,
  "source": "api",
  "data": {
    "barcode": "012345678901",
    "productName": "Example Product",
    "brand": "Example Brand",
    ...
  },
  "saved": true
}
```

### GET /api/barcode-research?limit=100
Get all researched products

**Response:**
```json
{
  "success": true,
  "count": 10,
  "records": [...]
}
```

## Troubleshooting

### Camera Not Working
- Ensure you've granted camera permissions
- Try using HTTPS (required for camera access)
- Check browser console for errors

### API Key Issues
- Verify API keys are correct in `.env.local`
- Check API quota limits
- Ensure Base ID and Table Name match exactly

### Products Not Saving to Airtable
- Verify Airtable credentials
- Check field names match exactly
- Review server logs for errors

## Cost Considerations

### Barcode Lookup API
- Free: 100 requests/day
- Paid plans available for higher volumes

### Airtable
- Free: 1,200 records per base
- Unlimited bases on free plan
- Paid plans for higher limits

## Next Steps

1. Customize Airtable fields for your needs
2. Add export functionality
3. Integrate with Odoo product creation
4. Add bulk import from CSV
