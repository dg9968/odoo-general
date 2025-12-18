import xmlrpc from 'xmlrpc';
import { OdooConfig } from './config';
import logger from './logger';

export interface UpdateResult {
  success: boolean;
  message: string;
  updated_count: number;
  barcode?: string;
  row_number?: number;
}

export interface BatchResult {
  successful_updates: number;
  failed_updates: number;
  total_processed: number;
  results: UpdateResult[];
}

export class OdooPriceUpdater {
  private config: OdooConfig;
  private commonClient: xmlrpc.Client | null = null;
  private objectClient: xmlrpc.Client | null = null;
  private uid: number | null = null;

  constructor(config: OdooConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      logger.info(`Connecting to Odoo at ${this.config.url}`);

      const url = new URL(this.config.url);
      this.commonClient = xmlrpc.createClient({
        host: url.hostname,
        port: parseInt(url.port) || 80,
        path: '/xmlrpc/2/common',
      });

      const versionInfo = await this.callCommon('version') as { server_version?: string };
      logger.info(`Connected to Odoo ${versionInfo.server_version || 'Unknown version'}`);

      this.uid = await this.callCommon('authenticate', [
        this.config.db,
        this.config.username,
        this.config.password,
        {}
      ]) as number;

      if (!this.uid) {
        throw new Error('Authentication failed - invalid credentials');
      }

      logger.info(`Successfully authenticated as user ID: ${this.uid}`);

      this.objectClient = xmlrpc.createClient({
        host: url.hostname,
        port: parseInt(url.port) || 80,
        path: '/xmlrpc/2/object',
      });

      return true;
    } catch (error) {
      logger.error(`Connection failed: ${error}`);
      return false;
    }
  }

  private callCommon(method: string, params?: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.commonClient) {
        reject(new Error('Common client not initialized'));
        return;
      }

      this.commonClient.methodCall(method, params || [], (error, value) => {
        if (error) {
          reject(error);
        } else {
          resolve(value);
        }
      });
    });
  }

  private callObject(model: string, method: string, params: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.objectClient || !this.uid) {
        reject(new Error('Object client not initialized or not authenticated'));
        return;
      }

      // For execute_kw, params should be passed as an array of arguments, not spread
      const args = [this.config.db, this.uid, this.config.password, model, method].concat(params);
      logger.info(`Calling ${model}.${method} with params:`, params);
      logger.info(`Params length:`, params.length);
      logger.info(`First param:`, params[0]);
      logger.info(`Full args array:`, args);
      
      this.objectClient.methodCall('execute_kw', args, (error, value) => {
        if (error) {
          logger.error(`XML-RPC error for ${model}.${method}:`, error);
          reject(error);
        } else {
          logger.info(`XML-RPC result for ${model}.${method}:`, value);
          resolve(value);
        }
      });
    });
  }

  private validatePrice(price: string | number): number {
    const priceFloat = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(priceFloat)) {
      throw new Error(`Invalid price format: ${price}`);
    }
    
    if (priceFloat < 0) {
      throw new Error('Price cannot be negative');
    }
    
    return priceFloat;
  }

  private validateBarcode(barcode: string): string {
    if (!barcode || !barcode.trim()) {
      throw new Error('Barcode cannot be empty');
    }
    return barcode.trim();
  }

  async updateProductPrice(barcode: string, newPrice: string | number): Promise<UpdateResult> {
    try {
      const validatedBarcode = this.validateBarcode(barcode);
      const validatedPrice = this.validatePrice(newPrice);

      logger.info(`Searching for products with barcode: ${validatedBarcode}`);

      // execute_kw expects args as: [[domain]] for search method
      // domain is: [['field', 'operator', 'value']]
      const productIds = await this.callObject('product.template', 'search', [
        [[['barcode', '=', validatedBarcode]]]  // wrapped in extra array for execute_kw
      ]) as number[];

      if (!productIds || productIds.length === 0) {
        logger.warn(`No products found with barcode: ${validatedBarcode}`);
        return {
          success: false,
          message: `No products found with barcode: ${validatedBarcode}`,
          updated_count: 0,
          barcode: validatedBarcode,
        };
      }

      logger.info(`Found ${productIds.length} product(s) with barcode: ${validatedBarcode}`);

      // execute_kw expects args as: [[ids, values]] for write method
      await this.callObject('product.template', 'write', [
        [productIds, { list_price: validatedPrice }]  // wrapped for execute_kw
      ]);

      logger.info(`Successfully updated ${productIds.length} product(s) with barcode ${validatedBarcode} to $${validatedPrice}`);

      return {
        success: true,
        message: `Updated ${productIds.length} product(s) to $${validatedPrice}`,
        updated_count: productIds.length,
        barcode: validatedBarcode,
      };

    } catch (error) {
      const errorMsg = `Error updating product with barcode ${barcode}: ${error}`;
      logger.error(errorMsg);
      return {
        success: false,
        message: errorMsg,
        updated_count: 0,
        barcode,
      };
    }
  }

  async batchUpdateFromData(data: Array<{ barcode: string; price: string | number }>): Promise<BatchResult> {
    const results: UpdateResult[] = [];
    let successfulUpdates = 0;
    let failedUpdates = 0;

    logger.info(`Processing batch update for ${data.length} items`);

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      try {
        const result = await this.updateProductPrice(item.barcode, item.price);
        result.row_number = i + 2; // +2 to account for header and 0-based index

        if (result.success) {
          successfulUpdates++;
        } else {
          failedUpdates++;
        }

        results.push(result);
      } catch (error) {
        const errorResult: UpdateResult = {
          success: false,
          message: `Row ${i + 2} error: ${error}`,
          updated_count: 0,
          row_number: i + 2,
          barcode: item.barcode || 'N/A',
        };
        results.push(errorResult);
        failedUpdates++;
      }
    }

    logger.info(`Batch update completed. Successful: ${successfulUpdates}, Failed: ${failedUpdates}`);

    return {
      successful_updates: successfulUpdates,
      failed_updates: failedUpdates,
      total_processed: results.length,
      results,
    };
  }

  async lookupProduct(barcode: string): Promise<{ success: boolean; product?: unknown; message?: string }> {
    try {
      const validatedBarcode = this.validateBarcode(barcode);

      logger.info(`Looking up product with barcode: ${validatedBarcode}`);

      // execute_kw expects args as: [[domain]] for search method
      const productIds = await this.callObject('product.template', 'search', [
        [[['barcode', '=', validatedBarcode]]]  // wrapped in extra array for execute_kw
      ]) as number[];

      if (!productIds || productIds.length === 0) {
        logger.warn(`No products found with barcode: ${validatedBarcode}`);
        return {
          success: false,
          message: `No products found with barcode: ${validatedBarcode}`,
        };
      }

      // Get product details
      // execute_kw expects args as: [[ids, fields]] for read method
      const products = await this.callObject('product.template', 'read', [
        [productIds, ['name', 'barcode', 'list_price', 'default_code', 'categ_id']]  // wrapped for execute_kw
      ]) as unknown[];

      if (products && products.length > 0) {
        const product = products[0] as {
          id: number;
          name: string;
          barcode: string;
          list_price: number;
          default_code?: string;
          categ_id?: [number, string];
        };
        logger.info(`Found product: ${product.name} (ID: ${product.id})`);
        
        return {
          success: true,
          product: {
            id: product.id,
            name: product.name,
            barcode: product.barcode,
            list_price: product.list_price,
            default_code: product.default_code,
            categ_id: product.categ_id,
          },
        };
      }

      return {
        success: false,
        message: 'Product data could not be retrieved',
      };

    } catch (error) {
      const errorMsg = `Error looking up product with barcode ${barcode}: ${error}`;
      logger.error(errorMsg);
      return {
        success: false,
        message: errorMsg,
      };
    }
  }
}