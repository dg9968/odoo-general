import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/config';
import { OdooPriceUpdater } from '@/lib/odoo-client';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    logger.info('Product lookup API called');
    
    const { barcode } = await request.json();
    logger.info(`Received barcode: ${barcode}`);

    if (!barcode) {
      logger.error('No barcode provided');
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    logger.info('Creating config manager...');
    const configManager = new ConfigManager();
    const config = configManager.getConfig();
    logger.info(`Config loaded - URL: ${config.url}, DB: ${config.db}`);
    
    const updater = new OdooPriceUpdater(config);

    logger.info('Attempting to connect to Odoo...');
    const connected = await updater.connect();
    if (!connected) {
      logger.error('Failed to connect to Odoo');
      return NextResponse.json(
        { error: 'Failed to connect to Odoo' },
        { status: 500 }
      );
    }
    logger.info('Successfully connected to Odoo');

    // Search for product by barcode
    logger.info(`Looking up product with barcode: ${barcode}`);
    const productData = await updater.lookupProduct(barcode);
    logger.info('Product lookup result:', productData);
    
    return NextResponse.json(productData);

  } catch (error) {
    logger.error('Product lookup API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}