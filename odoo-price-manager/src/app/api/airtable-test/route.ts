import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

// Test endpoint to verify Airtable configuration
export async function GET(request: NextRequest) {
  try {
    // Support both new token name and legacy API key name
    const accessToken = process.env.AIRTABLE_ACCESS_TOKEN || process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Product Research';

    logger.info('Testing Airtable configuration...');
    logger.info(`Base ID: ${baseId}`);
    logger.info(`Table Name: ${tableName}`);
    logger.info(`Access Token: ${accessToken ? 'Present (length: ' + accessToken.length + ')' : 'Missing'}`);

    if (!accessToken || !baseId) {
      return NextResponse.json({
        success: false,
        error: 'Missing configuration',
        details: {
          hasAccessToken: !!accessToken,
          hasBaseId: !!baseId,
          tableName
        },
        setup: {
          step1: 'Create Personal Access Token at https://airtable.com/create/tokens',
          step2: 'Grant scopes: data.records:read, data.records:write, schema.bases:read',
          step3: 'Add access to your specific base',
          step4: 'Add to .env.local: AIRTABLE_ACCESS_TOKEN=patXXXXXXXXXXXXXX',
          step5: 'Add to .env.local: AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX'
        }
      }, { status: 400 });
    }

    // Test API connection
    const encodedTableName = encodeURIComponent(tableName);
    const url = `https://api.airtable.com/v0/${baseId}/${encodedTableName}?maxRecords=1`;

    logger.info(`Test URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Airtable test failed:', data);
      return NextResponse.json({
        success: false,
        error: 'Airtable API Error',
        status: response.status,
        details: data,
        troubleshooting: {
          step1: 'Verify Base ID is correct (from Airtable URL: airtable.com/appXXXXXXXXXX)',
          step2: 'Verify Table Name matches exactly (case-sensitive)',
          step3: 'Verify Personal Access Token has these scopes: data.records:read, data.records:write',
          step4: 'Verify token has access granted to THIS specific base',
          step5: 'Token should start with "pat" (e.g., patXXXXXXXXXXXXXX)',
          createToken: 'https://airtable.com/create/tokens'
        }
      }, { status: response.status });
    }

    logger.info('Airtable test successful');

    return NextResponse.json({
      success: true,
      message: 'Airtable connection successful',
      recordCount: data.records?.length || 0,
      baseId,
      tableName,
      sampleRecord: data.records?.[0] || null
    });

  } catch (error) {
    logger.error('Airtable test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
