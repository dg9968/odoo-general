import SinglePriceUpdate from '@/components/SinglePriceUpdate';
import BatchPriceUpdate from '@/components/BatchPriceUpdate';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Odoo Management Suite
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Complete toolkit for Odoo product management: price updates and barcode scanning
          </p>
          
          {/* Navigation Tools */}
          <div className="mt-6 flex justify-center space-x-4">
            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-1">
              <div className="flex space-x-1">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md font-medium">
                  Price Manager
                </button>
                <Link
                  href="/approve"
                  className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md font-medium transition-colors"
                >
                  Price Approval
                </Link>
                <Link
                  href="/scanner"
                  className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md font-medium transition-colors"
                >
                  Barcode Scanner
                </Link>
                <Link
                  href="/research"
                  className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-md font-medium transition-colors"
                >
                  Product Research
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SinglePriceUpdate />
          <BatchPriceUpdate />
        </div>

        <div className="mt-12 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">CSV Format Instructions</h2>
          <div className="prose text-sm text-gray-300">
            <p>For batch updates, your CSV file should contain the following columns:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-white">barcode</strong> or <strong className="text-white">Barcode</strong>: Product barcode identifier</li>
              <li><strong className="text-white">price</strong> or <strong className="text-white">Price</strong>: New price value (positive numbers only)</li>
            </ul>
            <p className="mt-3">
              <strong className="text-white">Example CSV content:</strong>
            </p>
            <div className="bg-gray-900 border border-gray-600 p-3 rounded font-mono text-sm mt-2 text-green-400">
              barcode,price<br/>
              610377036979,29.99<br/>
              123456789012,15.50<br/>
              987654321098,42.00
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
