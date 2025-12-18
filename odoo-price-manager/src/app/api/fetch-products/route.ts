import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/config';
import { OdooPriceUpdater } from '@/lib/odoo-client';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const configManager = new ConfigManager();
    const updater = new OdooPriceUpdater(configManager.getConfig());

    const connected = await updater.connect();
    if (!connected) {
      return NextResponse.json(
        { error: 'Failed to connect to Odoo' },
        { status: 500 }
      );
    }

    logger.info('Fetching all active products from Odoo');

    // Get all products using search_read
    // execute_kw expects args as: [[domain, fields]] for search_read
    const products = await (updater as any).callObject('product.template', 'search_read', [
      [[], ['id', 'name', 'barcode', 'list_price', 'default_code', 'categ_id']]  // [domain, fields] wrapped for execute_kw
    ]) as Array<{
      id: number;
      name: string;
      barcode: string | false;
      list_price: number;
      default_code?: string | false;
      categ_id?: [number, string];
    }>;

    if (!products || products.length === 0) {
      return NextResponse.json({ products: [] });
    }

    logger.info(`Fetched ${products.length} products from Odoo`);

    return NextResponse.json({
      success: true,
      count: products.length,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        currentPrice: p.list_price,
        defaultCode: p.default_code,
        category: p.categ_id ? p.categ_id[1] : null
      }))
    });

  } catch (error) {
    logger.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: String(error) },
      { status: 500 }
    );
  }
}
