import logger from './logger';

export interface BarcodeLookupResult {
  barcode_number: string;
  barcode_type: string;
  barcode_formats: string;
  mpn?: string;
  model?: string;
  asin?: string;
  product_name?: string;
  title?: string;
  category?: string;
  manufacturer?: string;
  brand?: string;
  contributors?: Array<{ role: string; name: string }>;
  age_group?: string;
  ingredients?: string;
  nutrition_facts?: string;
  color?: string;
  gender?: string;
  material?: string;
  pattern?: string;
  format?: string;
  multipack?: string;
  size?: string;
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
  release_date?: string;
  description?: string;
  features?: string[];
  images?: string[];
  stores?: Array<{
    name: string;
    country?: string;
    currency?: string;
    currency_symbol?: string;
    price?: string;
    sale_price?: string;
    link?: string;
    item_group_id?: string;
    availability?: string;
    condition?: string;
    shipping?: string;
    last_update?: string;
  }>;
  reviews?: Array<{
    name: string;
    rating?: string;
    review?: string;
    date?: string;
  }>;
}

export class BarcodeLookupService {
  private apiKey: string;
  private baseUrl = 'https://api.barcodelookup.com/v3/products';

  constructor() {
    this.apiKey = process.env.BARCODE_LOOKUP_API_KEY || '';

    if (!this.apiKey) {
      logger.warn('Barcode Lookup API key not configured. Set BARCODE_LOOKUP_API_KEY in .env');
    }
  }

  async lookupBarcode(barcode: string): Promise<BarcodeLookupResult | null> {
    try {
      if (!this.apiKey) {
        throw new Error('Barcode Lookup API key not configured');
      }

      logger.info(`Looking up barcode via BarcodeLookup.com: ${barcode}`);

      const url = `${this.baseUrl}?barcode=${encodeURIComponent(barcode)}&key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`BarcodeLookup API error: ${response.status} - ${errorText}`);

        if (response.status === 404) {
          logger.info(`Product not found for barcode: ${barcode}`);
          return null;
        }

        throw new Error(`BarcodeLookup API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.products && data.products.length > 0) {
        logger.info(`Found product information for barcode: ${barcode}`);
        return data.products[0] as BarcodeLookupResult;
      }

      logger.info(`No product found for barcode: ${barcode}`);
      return null;

    } catch (error) {
      logger.error(`Error looking up barcode: ${error}`);
      throw error;
    }
  }

  async searchProducts(query: string): Promise<BarcodeLookupResult[]> {
    try {
      if (!this.apiKey) {
        throw new Error('Barcode Lookup API key not configured');
      }

      logger.info(`Searching products: ${query}`);

      const url = `${this.baseUrl}?search=${encodeURIComponent(query)}&key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`BarcodeLookup API error: ${response.status} - ${errorText}`);
        throw new Error(`BarcodeLookup API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.products && data.products.length > 0) {
        logger.info(`Found ${data.products.length} products for query: ${query}`);
        return data.products as BarcodeLookupResult[];
      }

      logger.info(`No products found for query: ${query}`);
      return [];

    } catch (error) {
      logger.error(`Error searching products: ${error}`);
      throw error;
    }
  }
}
