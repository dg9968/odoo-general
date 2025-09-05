# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Odoo product price management system that provides automated price updates via XML-RPC API integration. The system supports both single product updates and batch processing from CSV files.

## Core Architecture

- **OdooConfig**: Configuration management class that validates required environment variables (ODOO_URL, ODOO_DB, ODOO_USERNAME, ODOO_PASSWORD)
- **OdooPriceUpdater**: Main service class handling Odoo connections and price update operations
- **XML-RPC Integration**: Uses Odoo's external API for product.template model operations

## Key Files

- `priceupdate.py`: Main application containing all price update logic and CSV processing
- `.env`: Environment configuration (not tracked in git)
- `.env.example1`: Template showing required environment variables
- `price_updates.csv`: Example CSV file with barcode,price columns for batch updates
- `items_all_csv.csv`: Larger dataset with Barcode,Price columns (note capitalization difference)
- `priceupdate.log`: Application log file with detailed execution history

## Running the Application

### Setup Environment
```bash
# Copy example environment file and configure
cp .env.example1 .env
# Edit .env with your Odoo credentials
```

### Execute Price Updates
```bash
# Run the main script (includes hardcoded example updates)
python priceupdate.py

# For custom CSV processing, modify the csv filename in main() function
```

### Dependencies
Install required packages manually:
```bash
pip install python-dotenv
# Standard library: os, sys, csv, logging, xmlrpc.client, typing, decimal
```

## CSV File Format

The system expects CSV files with these columns:
- `barcode` or `Barcode`: Product barcode identifier
- `price` or `Price`: New price value (positive numbers only)

The CSV processor auto-detects delimiters and handles both column name variations.

## Key Operations

- **Single Product Update**: Updates products by barcode using `update_product_price()`
- **Batch Updates**: Processes entire CSV files using `batch_update_from_csv()`
- **Validation**: Input validation for barcodes (non-empty) and prices (positive numbers)
- **Logging**: Comprehensive logging to both file and console with timestamps

## Error Handling

- Connection failures are logged and return False from connect()
- Invalid credentials result in authentication errors
- Missing products return success=False with appropriate messages
- CSV processing continues on individual row failures, reporting final success/failure counts