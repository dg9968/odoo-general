import { NextRequest, NextResponse } from 'next/server';
import { BarcodeLookupService } from '@/lib/barcode-lookup';
import { AirtableClient, ProductResearchRecord } from '@/lib/airtable-client';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { barcode, saveToDatabase = true } = await request.json();

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    logger.info(`Barcode research request for: ${barcode}`);

    // Initialize services
    const lookupService = new BarcodeLookupService();
    const airtable = new AirtableClient();

    // Check if we already have this barcode in Airtable
    let existingRecord = null;
    try {
      existingRecord = await airtable.findByBarcode(barcode);
    } catch (error) {
      logger.warn(`Could not check Airtable for existing record: ${error}`);
    }

    if (existingRecord) {
      logger.info(`Returning existing record from Airtable for barcode: ${barcode}`);
      return NextResponse.json({
        success: true,
        source: 'database',
        data: existingRecord,
        message: 'Product found in database'
      });
    }

    // Look up barcode via API
    const productData = await lookupService.lookupBarcode(barcode);

    if (!productData) {
      return NextResponse.json({
        success: false,
        message: 'Product not found',
        barcode
      }, { status: 404 });
    }

    // Prepare record for Airtable
    // Note: Airtable attachments need specific format: { url: string }
    const imageAttachments = productData.images?.map(url => ({ url })) || [];

    // Build record without researchedAt - let Airtable use "Created time" field instead
    const record: any = {
      barcode: productData.barcode_number,
      productName: productData.product_name || productData.title,
      brand: productData.brand,
      category: productData.category,
      manufacturer: productData.manufacturer,
      description: productData.description,
      images: imageAttachments,
      mpn: productData.mpn,
      model: productData.model,
      size: productData.size,
      weight: productData.weight,
      // Convert stores array to comma-separated string for Airtable
      stores: productData.stores?.map(s => s.name).join(', ') || '',
      // Convert features array to newline-separated string
      features: productData.features?.join('\n') || '',
      // Store detailed pricing data as JSON string
      storePricing: productData.stores ? JSON.stringify(productData.stores) : '',
    };

    // Add researchedAt for display purposes (not sent to Airtable)
    record.researchedAt = new Date().toISOString();

    // Save to Airtable if requested
    let savedRecord = null;
    if (saveToDatabase) {
      try {
        savedRecord = await airtable.createRecord(record);
        logger.info(`Saved product to Airtable: ${barcode}`);
      } catch (error) {
        logger.error(`Failed to save to Airtable: ${error}`);
        // Continue even if Airtable save fails
      }
    }

    return NextResponse.json({
      success: true,
      source: 'api',
      data: record,
      rawData: productData,
      saved: !!savedRecord,
      message: 'Product found and researched'
    });

  } catch (error) {
    logger.error('Barcode research error:', error);
    return NextResponse.json(
      {
        error: 'Failed to research barcode',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get all researched products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const airtable = new AirtableClient();
    const records = await airtable.getAllRecords(limit);

    return NextResponse.json({
      success: true,
      count: records.length,
      records
    });

  } catch (error) {
    logger.error('Error fetching research records:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
