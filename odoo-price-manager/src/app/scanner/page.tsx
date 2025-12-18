import EnhancedBarcodeScanner from '@/components/EnhancedBarcodeScanner';
import Link from 'next/link';

export default function ScannerPage() {
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Enhanced Barcode Scanner
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Scan barcodes using your camera or manual entry to lookup products in Odoo
          </p>
          
          {/* Navigation Tools */}
          <div className="mt-6 flex justify-center space-x-4">
            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-1">
              <div className="flex space-x-1">
                <Link
                  href="/"
                  className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md font-medium transition-colors"
                >
                  Price Manager
                </Link>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md font-medium">
                  Barcode Scanner
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <EnhancedBarcodeScanner />
        </div>
      </div>
    </div>
  );
}