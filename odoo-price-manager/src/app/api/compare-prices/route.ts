import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/config';
import { OdooPriceUpdater } from '@/lib/odoo-client';
import logger from '@/lib/logger';
import Papa from 'papaparse';

export interface PriceComparison {
  barcode: string;
  itemCode: string;
  description: string;
  odooPrice: number | null;
  quickbooksPrice: number;
  priceDifference: number;
  percentChange: number;
  status: 'new' | 'match' | 'increase' | 'decrease' | 'not_found_in_odoo';
  odooProductId?: number;
  odooProductName?: string;
}

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

    // Read CSV file
    const fileContent = await file.text();

    // Parse CSV
    const parseResult = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (parseResult.errors.length > 0) {
      logger.error('CSV parsing errors:', parseResult.errors);
      return NextResponse.json(
        { error: 'Failed to parse CSV', details: parseResult.errors },
        { status: 400 }
      );
    }

    // Filter for Inventory Part items with valid barcodes and prices
    const quickbooksProducts = parseResult.data
      .filter(row => {
        const type = row['Type']?.trim();
        const barcode = row['Item']?.trim();
        const price = row['Price']?.trim();

        return type === 'Inventory Part' &&
               barcode &&
               barcode.length > 0 &&
               price &&
               !isNaN(parseFloat(price));
      })
      .map(row => ({
        barcode: row['Item'].trim(),
        description: row['Description']?.trim() || '',
        price: parseFloat(row['Price'].trim())
      }));

    logger.info(`Found ${quickbooksProducts.length} inventory items in QuickBooks CSV`);

    // Connect to Odoo and fetch all products
    const configManager = new ConfigManager();
    const updater = new OdooPriceUpdater(configManager.getConfig());

    const connected = await updater.connect();
    if (!connected) {
      return NextResponse.json(
        { error: 'Failed to connect to Odoo' },
        { status: 500 }
      );
    }

    // Get all products from Odoo using search_read
    // execute_kw expects args as: [[domain, fields]] for search_read
    const odooProducts = await updater.callObject('product.template', 'search_read', [
      [[], ['id', 'name', 'barcode', 'list_price', 'default_code']]  // [domain, fields] wrapped for execute_kw
    ]) as Array<{
      id: number;
      name: string;
      barcode: string | false;
      list_price: number;
      default_code?: string | false;
    }>;

    // Create a map of barcode -> Odoo product
    const odooProductMap = new Map(
      odooProducts
        .filter(p => p.barcode)
        .map(p => [p.barcode as string, p])
    );

    logger.info(`Loaded ${odooProductMap.size} Odoo products with barcodes`);

    // Compare prices
    const comparisons: PriceComparison[] = quickbooksProducts.map(qbProduct => {
      const odooProduct = odooProductMap.get(qbProduct.barcode);

      if (!odooProduct) {
        return {
          barcode: qbProduct.barcode,
          itemCode: qbProduct.barcode,
          description: qbProduct.description,
          odooPrice: null,
          quickbooksPrice: qbProduct.price,
          priceDifference: qbProduct.price,
          percentChange: 0,
          status: 'not_found_in_odoo' as const
        };
      }

      const odooPrice = odooProduct.list_price;
      const qbPrice = qbProduct.price;
      const difference = qbPrice - odooPrice;
      const percentChange = odooPrice > 0 ? (difference / odooPrice) * 100 : 0;

      let status: PriceComparison['status'];
      if (Math.abs(difference) < 0.01) {
        status = 'match';
      } else if (difference > 0) {
        status = 'increase';
      } else {
        status = 'decrease';
      }

      return {
        barcode: qbProduct.barcode,
        itemCode: qbProduct.barcode,
        description: qbProduct.description,
        odooPrice,
        quickbooksPrice: qbPrice,
        priceDifference: difference,
        percentChange,
        status,
        odooProductId: odooProduct.id,
        odooProductName: odooProduct.name
      };
    });

    // Sort by status priority: not_found_in_odoo, decrease, increase, match
    const statusPriority: Record<PriceComparison['status'], number> = {
      'not_found_in_odoo': 1,
      'decrease': 2,
      'increase': 3,
      'match': 4,
      'new': 5
    };

    comparisons.sort((a, b) => {
      const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return Math.abs(b.priceDifference) - Math.abs(a.priceDifference);
    });

    const summary = {
      total: comparisons.length,
      matches: comparisons.filter(c => c.status === 'match').length,
      increases: comparisons.filter(c => c.status === 'increase').length,
      decreases: comparisons.filter(c => c.status === 'decrease').length,
      notFoundInOdoo: comparisons.filter(c => c.status === 'not_found_in_odoo').length
    };

    logger.info('Comparison summary:', summary);

    return NextResponse.json({
      success: true,
      summary,
      comparisons
    });

  } catch (error) {
    logger.error('Error comparing prices:', error);
    return NextResponse.json(
      { error: 'Failed to compare prices', details: String(error) },
      { status: 500 }
    );
  }
}
