import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/config';
import { OdooPriceUpdater } from '@/lib/odoo-client';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { barcode, price } = await request.json();

    if (!barcode || price === undefined) {
      return NextResponse.json(
        { error: 'Barcode and price are required' },
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

    const result = await updater.updateProductPrice(barcode, price);
    
    return NextResponse.json(result);

  } catch (error) {
    logger.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}