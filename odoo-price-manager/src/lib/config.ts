export interface OdooConfig {
  url: string;
  db: string;
  username: string;
  password: string;
}

export class ConfigManager {
  private config: OdooConfig;

  constructor() {
    this.config = this.validateConfig();
  }

  private validateConfig(): OdooConfig {
    const config: OdooConfig = {
      url: process.env.ODOO_URL || 'http://localhost:8069',
      db: process.env.ODOO_DB || '',
      username: process.env.ODOO_USERNAME || '',
      password: process.env.ODOO_PASSWORD || '',
    };

    const missingVars: string[] = [];
    
    if (!config.db) missingVars.push('ODOO_DB');
    if (!config.username) missingVars.push('ODOO_USERNAME');
    if (!config.password) missingVars.push('ODOO_PASSWORD');

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    return config;
  }

  public getConfig(): OdooConfig {
    return this.config;
  }
}