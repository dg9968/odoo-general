import { NextRequest, NextResponse } from 'next/server';
import { ConfigManager } from '@/lib/config';
import { OdooPriceUpdater } from '@/lib/odoo-client';
import logger from '@/lib/logger';

export interface ApprovalRequest {
  updates: Array<{
    barcode: string;
    newPrice: number;
    description?: string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ApprovalRequest = await request.json();

    if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    logger.info(`Processing ${body.updates.length} approved price updates`);

    const configManager = new ConfigManager();
    const updater = new OdooPriceUpdater(configManager.getConfig());

    const connected = await updater.connect();
    if (!connected) {
      return NextResponse.json(
        { error: 'Failed to connect to Odoo' },
        { status: 500 }
      );
    }

    const results = await updater.batchUpdateFromData(
      body.updates.map(u => ({
        barcode: u.barcode,
        price: u.newPrice
      }))
    );

    logger.info(`Batch update completed. Success: ${results.successful_updates}, Failed: ${results.failed_updates}`);

    return NextResponse.json({
      success: true,
      summary: {
        total: results.total_processed,
        successful: results.successful_updates,
        failed: results.failed_updates
      },
      results: results.results
    });

  } catch (error) {
    logger.error('Error approving price updates:', error);
    return NextResponse.json(
      { error: 'Failed to update prices', details: String(error) },
      { status: 500 }
    );
  }
}
