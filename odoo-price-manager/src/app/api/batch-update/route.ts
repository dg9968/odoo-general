import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/config';
import { OdooPriceUpdater } from '@/lib/odoo-client';
import logger from '@/lib/logger';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const text = await file.text();
    
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        // Handle both 'barcode'/'Barcode' and 'price'/'Price' variations
        const lowerHeader = header.toLowerCase();
        if (lowerHeader === 'barcode') return 'barcode';
        if (lowerHeader === 'price') return 'price';
        return header;
      }
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: parseResult.errors },
        { status: 400 }
      );
    }

    const data = parseResult.data as Array<{ barcode: string; price: string }>;
    
    // Validate required columns
    if (data.length === 0 || !data[0].barcode || !data[0].price) {
      return NextResponse.json(
        { error: 'CSV must contain barcode and price columns' },
        { status: 400 }
      );
    }

    const configManager = new ConfigManager();
    const config = configManager.getConfig();
    const updater = new OdooPriceUpdater(config);

    const connected = await updater.connect();
    if (!connected) {
      return NextResponse.json(
        { error: 'Failed to connect to Odoo' },
        { status: 500 }
      );
    }

    const result = await updater.batchUpdateFromData(data);
    
    return NextResponse.json(result);

  } catch (error) {
    logger.error('Batch update API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}