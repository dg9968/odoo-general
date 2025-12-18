import logger from './logger';

export interface ProductResearchRecord {
  barcode: string;
  productName?: string;
  brand?: string;
  category?: string;
  manufacturer?: string;
  description?: string;
  images?: Array<{ url: string }> | string[]; // Airtable format or legacy array
  mpn?: string;
  model?: string;
  size?: string;
  weight?: string;
  stores?: string; // Comma-separated store names
  features?: string; // Comma-separated or newline-separated features
  storePricing?: string; // JSON string with detailed store pricing data
  researchedAt: string;
  researchedBy?: string;
}

export class AirtableClient {
  private accessToken: string;
  private baseId: string;
  private tableName: string;

  constructor() {
    // Airtable now uses Personal Access Tokens (PAT)
    this.accessToken = process.env.AIRTABLE_ACCESS_TOKEN || process.env.AIRTABLE_API_KEY || '';
    this.baseId = process.env.AIRTABLE_BASE_ID || '';
    this.tableName = process.env.AIRTABLE_TABLE_NAME || 'Product Research';

    if (!this.accessToken || !this.baseId) {
      logger.warn('Airtable credentials not configured. Set AIRTABLE_ACCESS_TOKEN and AIRTABLE_BASE_ID in .env.local');
    }
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: unknown) {
    const encodedTableName = encodeURIComponent(this.tableName);
    const url = `https://api.airtable.com/v0/${this.baseId}/${encodedTableName}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === 'POST' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    logger.info(`Airtable ${method} request to ${url}`);
    logger.info(`Base ID: ${this.baseId}, Table: ${this.tableName}`);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Airtable API error: ${response.status} - ${errorText}`);
      logger.error(`Troubleshooting: Visit /api/airtable-test to verify configuration`);
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async createRecord(record: ProductResearchRecord): Promise<{ id: string; fields: ProductResearchRecord }> {
    try {
      logger.info(`Creating Airtable record for barcode: ${record.barcode}`);

      // Remove researchedAt and researchedBy from the record sent to Airtable
      // Use Airtable's "Created time" field instead
      const { researchedAt, researchedBy, ...airtableFields } = record;

      const result = await this.makeRequest('', 'POST', {
        fields: airtableFields
      });

      logger.info(`Successfully created Airtable record: ${result.id}`);
      return result;
    } catch (error) {
      logger.error(`Error creating Airtable record: ${error}`);
      throw error;
    }
  }

  async findByBarcode(barcode: string): Promise<ProductResearchRecord | null> {
    try {
      logger.info(`Searching Airtable for barcode: ${barcode}`);

      // Properly encode the filter formula
      const filterFormula = encodeURIComponent(`{barcode}="${barcode}"`);
      const result = await this.makeRequest(`?filterByFormula=${filterFormula}&maxRecords=1`);

      if (result.records && result.records.length > 0) {
        logger.info(`Found existing record for barcode: ${barcode}`);
        return result.records[0].fields as ProductResearchRecord;
      }

      logger.info(`No existing record found for barcode: ${barcode}`);
      return null;
    } catch (error) {
      logger.error(`Error searching Airtable: ${error}`);
      throw error;
    }
  }

  async updateRecord(recordId: string, updates: Partial<ProductResearchRecord>): Promise<{ id: string; fields: ProductResearchRecord }> {
    try {
      logger.info(`Updating Airtable record: ${recordId}`);

      const result = await this.makeRequest(`/${recordId}`, 'PATCH', {
        fields: updates
      });

      logger.info(`Successfully updated Airtable record: ${recordId}`);
      return result;
    } catch (error) {
      logger.error(`Error updating Airtable record: ${error}`);
      throw error;
    }
  }

  async getAllRecords(limit: number = 100): Promise<ProductResearchRecord[]> {
    try {
      logger.info(`Fetching all Airtable records (limit: ${limit})`);

      const result = await this.makeRequest(`?maxRecords=${limit}&sort[0][field]=researchedAt&sort[0][direction]=desc`);

      if (result.records) {
        logger.info(`Found ${result.records.length} records`);
        return result.records.map((r: { fields: ProductResearchRecord }) => r.fields);
      }

      return [];
    } catch (error) {
      logger.error(`Error fetching Airtable records: ${error}`);
      throw error;
    }
  }
}
