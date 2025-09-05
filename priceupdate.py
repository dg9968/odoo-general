import os
import sys
import csv
import logging
import xmlrpc.client
from dotenv import load_dotenv
from typing import List, Dict, Optional, Union
from decimal import Decimal

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('priceupdate.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

class OdooConfig:
    def __init__(self):
        self.url = os.getenv('ODOO_URL', 'http://localhost:8069')
        self.db = os.getenv('ODOO_DB')
        self.username = os.getenv('ODOO_USERNAME')
        self.password = os.getenv('ODOO_PASSWORD')
        
        self._validate_config()
    
    def _validate_config(self) -> None:
        missing_vars = []
        if not self.db:
            missing_vars.append('ODOO_DB')
        if not self.username:
            missing_vars.append('ODOO_USERNAME')
        if not self.password:
            missing_vars.append('ODOO_PASSWORD')
        
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

class OdooPriceUpdater:
    def __init__(self, config: OdooConfig):
        self.config = config
        self.common = None
        self.models = None
        self.uid = None
        
    def connect(self) -> bool:
        try:
            logger.info(f"Connecting to Odoo at {self.config.url}")
            self.common = xmlrpc.client.ServerProxy(f'{self.config.url}/xmlrpc/2/common')
            
            # Test connection
            version_info = self.common.version()
            logger.info(f"Connected to Odoo {version_info.get('server_version', 'Unknown version')}")
            
            # Authenticate
            self.uid = self.common.authenticate(
                self.config.db, 
                self.config.username, 
                self.config.password, 
                {}
            )
            
            if not self.uid:
                raise ValueError("Authentication failed - invalid credentials")
                
            logger.info(f"Successfully authenticated as user ID: {self.uid}")
            self.models = xmlrpc.client.ServerProxy(f'{self.config.url}/xmlrpc/2/object')
            return True
            
        except Exception as e:
            logger.error(f"Connection failed: {str(e)}")
            return False
    
    def _validate_price(self, price: Union[str, float, Decimal]) -> float:
        try:
            price_float = float(price)
            if price_float < 0:
                raise ValueError("Price cannot be negative")
            return price_float
        except (ValueError, TypeError):
            raise ValueError(f"Invalid price format: {price}")
    
    def _validate_barcode(self, barcode: str) -> str:
        if not barcode or not str(barcode).strip():
            raise ValueError("Barcode cannot be empty")
        return str(barcode).strip()
    
    def update_product_price(self, barcode: str, new_price: Union[str, float, Decimal]) -> Dict[str, Union[bool, str, int]]:
        try:
            # Validate inputs
            validated_barcode = self._validate_barcode(barcode)
            validated_price = self._validate_price(new_price)
            
            logger.info(f"Searching for products with barcode: {validated_barcode}")
            
            # Find products with this barcode
            product_ids = self.models.execute_kw(
                self.config.db, self.uid, self.config.password,
                'product.template', 'search',
                [[['barcode', '=', validated_barcode]]]
            )
            
            if not product_ids:
                logger.warning(f"No products found with barcode: {validated_barcode}")
                return {
                    'success': False,
                    'message': f'No products found with barcode: {validated_barcode}',
                    'updated_count': 0
                }
            
            logger.info(f"Found {len(product_ids)} product(s) with barcode: {validated_barcode}")
            
            # Update products
            self.models.execute_kw(
                self.config.db, self.uid, self.config.password,
                'product.template', 'write',
                [product_ids, {'list_price': validated_price}]
            )
            
            logger.info(f"Successfully updated {len(product_ids)} product(s) with barcode {validated_barcode} to ${validated_price}")
            
            return {
                'success': True,
                'message': f'Updated {len(product_ids)} product(s) to ${validated_price}',
                'updated_count': len(product_ids)
            }
            
        except Exception as e:
            error_msg = f"Error updating product with barcode {barcode}: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'message': error_msg,
                'updated_count': 0
            }
    
    def batch_update_from_csv(self, csv_file_path: str) -> Dict[str, Union[int, List[Dict]]]:
        if not os.path.exists(csv_file_path):
            raise FileNotFoundError(f"CSV file not found: {csv_file_path}")
        
        results = []
        successful_updates = 0
        failed_updates = 0
        
        logger.info(f"Processing batch update from CSV: {csv_file_path}")
        
        try:
            with open(csv_file_path, 'r', newline='', encoding='utf-8') as csvfile:
                # Try to detect delimiter, default to comma
                sample = csvfile.read(1024)
                csvfile.seek(0)
                try:
                    sniffer = csv.Sniffer()
                    delimiter = sniffer.sniff(sample).delimiter
                except csv.Error:
                    delimiter = ','  # Default to comma if detection fails
                
                reader = csv.DictReader(csvfile, delimiter=delimiter)
                
                logger.info(f"Using delimiter: '{delimiter}'")
                logger.info(f"CSV columns detected: {reader.fieldnames}")
                
                # Validate required columns
                required_columns = {'barcode', 'price'}
                if not required_columns.issubset(reader.fieldnames):
                    raise ValueError(f"CSV must contain columns: {required_columns}. Found: {reader.fieldnames}")
                
                for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header
                    try:
                        barcode = row['barcode']
                        price = row['price']
                        
                        result = self.update_product_price(barcode, price)
                        result['row_number'] = row_num
                        result['barcode'] = barcode
                        
                        if result['success']:
                            successful_updates += 1
                        else:
                            failed_updates += 1
                            
                        results.append(result)
                        
                    except Exception as e:
                        error_result = {
                            'success': False,
                            'message': f'Row {row_num} error: {str(e)}',
                            'updated_count': 0,
                            'row_number': row_num,
                            'barcode': row.get('barcode', 'N/A')
                        }
                        results.append(error_result)
                        failed_updates += 1
                        
        except Exception as e:
            logger.error(f"Error processing CSV file: {str(e)}")
            raise
        
        logger.info(f"Batch update completed. Successful: {successful_updates}, Failed: {failed_updates}")
        
        return {
            'successful_updates': successful_updates,
            'failed_updates': failed_updates,
            'total_processed': len(results),
            'results': results
        }

def main():
    try:
        # Load configuration
        config = OdooConfig()
        
        # Create updater instance
        updater = OdooPriceUpdater(config)
        
        # Connect to Odoo
        if not updater.connect():
            logger.error("Failed to connect to Odoo")
            sys.exit(1)
        
        # Example single update
        result = updater.update_product_price('610377036979', 29.99)
        logger.info(f"Single update result: {result}")
        
        # Example batch update
        batch_result = updater.batch_update_from_csv('price_updates.csv')
        logger.info(f"Batch update result: {batch_result}")
        
    except Exception as e:
        logger.error(f"Application error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()