'use client';

import { useState } from 'react';
import Link from 'next/link';
import CameraBarcodeScanner from '@/components/CameraBarcodeScanner';

interface ProductData {
  barcode: string;
  productName?: string;
  brand?: string;
  category?: string;
  manufacturer?: string;
  description?: string;
  images?: Array<{ url: string }> | string[];
  mpn?: string;
  model?: string;
  size?: string;
  weight?: string;
  features?: string[] | string;
  stores?: string[] | string;
  storePricing?: string;
  researchedAt?: string;
}

interface ResearchResult {
  success: boolean;
  source?: 'api' | 'database';
  data?: ProductData;
  rawData?: unknown;
  saved?: boolean;
  message?: string;
  error?: string;
}

export default function ResearchPage() {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [useCameraScanner, setUseCameraScanner] = useState(false);
  const [history, setHistory] = useState<ProductData[]>([]);

  const handleResearch = async (barcodeToSearch: string = barcode) => {
    if (!barcodeToSearch.trim()) {
      alert('Please enter a barcode');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/barcode-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode: barcodeToSearch.trim(),
          saveToDatabase: true
        }),
      });

      const data: ResearchResult = await response.json();
      setResult(data);

      if (data.success && data.data) {
        // Add to history
        setHistory(prev => [data.data!, ...prev.filter(p => p.barcode !== data.data!.barcode)]);
      }

    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to research barcode: ' + error
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCameraScan = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
    handleResearch(scannedBarcode);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Product Research
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-300 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Research products using barcode lookup and camera scanning
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
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md font-medium">
                  Product Research
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input */}
          <div className="space-y-6">
            {/* Scanner Selection */}
            <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Input Method</h2>
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setUseCameraScanner(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    !useCameraScanner
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setUseCameraScanner(true)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    useCameraScanner
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Camera Scanner
                </button>
              </div>

              {!useCameraScanner ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Barcode Number
                    </label>
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleResearch()}
                      placeholder="Enter barcode number..."
                      className="w-full border border-gray-600 bg-gray-700 text-gray-200 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => handleResearch()}
                    disabled={loading || !barcode.trim()}
                    className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
                  >
                    {loading ? 'Researching...' : 'Research Product'}
                  </button>
                </div>
              ) : (
                <CameraBarcodeScanner
                  onScan={handleCameraScan}
                  onError={(error) => alert(error)}
                />
              )}
            </div>

            {/* Recent History */}
            {history.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
                <h2 className="text-xl font-semibold mb-4 text-white">Recent Scans</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {history.slice(0, 10).map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setBarcode(item.barcode);
                        handleResearch(item.barcode);
                      }}
                      className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <p className="font-mono text-sm text-gray-400">{item.barcode}</p>
                      <p className="text-white font-medium truncate">{item.productName || 'Unknown Product'}</p>
                      {item.brand && <p className="text-sm text-gray-400">{item.brand}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div>
            {loading && (
              <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                <p className="text-gray-300">Researching product...</p>
              </div>
            )}

            {!loading && result && (
              <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
                {result.success && result.data ? (
                  <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-white mb-2">
                          {result.data.productName || 'Unknown Product'}
                        </h2>
                        <p className="text-sm text-gray-400">
                          Barcode: <span className="font-mono">{result.data.barcode}</span>
                        </p>
                        <div className="flex gap-2 mt-2">
                          {result.source === 'database' && (
                            <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded">
                              From Database
                            </span>
                          )}
                          {result.source === 'api' && result.saved && (
                            <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded">
                              Saved to Database
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Images */}
                    {result.data.images && result.data.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {result.data.images.slice(0, 3).map((img, idx) => (
                          <img
                            key={idx}
                            src={typeof img === 'string' ? img : img.url}
                            alt={`Product ${idx + 1}`}
                            className="w-full h-32 object-contain bg-white rounded"
                          />
                        ))}
                      </div>
                    )}

                    {/* Product Details */}
                    <div className="space-y-3">
                      {result.data.brand && (
                        <div>
                          <p className="text-sm text-gray-400">Brand</p>
                          <p className="text-white font-medium">{result.data.brand}</p>
                        </div>
                      )}
                      {result.data.manufacturer && (
                        <div>
                          <p className="text-sm text-gray-400">Manufacturer</p>
                          <p className="text-white font-medium">{result.data.manufacturer}</p>
                        </div>
                      )}
                      {result.data.category && (
                        <div>
                          <p className="text-sm text-gray-400">Category</p>
                          <p className="text-white font-medium">{result.data.category}</p>
                        </div>
                      )}
                      {result.data.model && (
                        <div>
                          <p className="text-sm text-gray-400">Model</p>
                          <p className="text-white font-medium">{result.data.model}</p>
                        </div>
                      )}
                      {result.data.mpn && (
                        <div>
                          <p className="text-sm text-gray-400">MPN</p>
                          <p className="text-white font-mono">{result.data.mpn}</p>
                        </div>
                      )}
                      {result.data.size && (
                        <div>
                          <p className="text-sm text-gray-400">Size</p>
                          <p className="text-white font-medium">{result.data.size}</p>
                        </div>
                      )}
                      {result.data.weight && (
                        <div>
                          <p className="text-sm text-gray-400">Weight</p>
                          <p className="text-white font-medium">{result.data.weight}</p>
                        </div>
                      )}
                      {result.data.description && (
                        <div>
                          <p className="text-sm text-gray-400">Description</p>
                          <p className="text-white">{result.data.description}</p>
                        </div>
                      )}
                      {result.data.features && (
                        <div>
                          <p className="text-sm text-gray-400 mb-2">Features</p>
                          <ul className="list-disc list-inside space-y-1">
                            {(typeof result.data.features === 'string'
                              ? result.data.features.split('\n').filter(Boolean)
                              : result.data.features
                            ).map((feature, idx) => (
                              <li key={idx} className="text-white text-sm">{feature}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.data.storePricing && (() => {
                        try {
                          const stores = JSON.parse(result.data.storePricing);
                          return (
                            <div>
                              <p className="text-sm text-gray-400 mb-2">Available at</p>
                              <div className="space-y-2">
                                {stores.map((store: {
                                  name: string;
                                  link?: string;
                                  price?: string;
                                  sale_price?: string;
                                  currency_symbol?: string;
                                  availability?: string;
                                  condition?: string;
                                  shipping?: string;
                                }, idx: number) => (
                                  <div key={idx} className="bg-gray-700 rounded p-3 space-y-1">
                                    <div className="flex justify-between items-start">
                                      <span className="font-medium text-white">{store.name}</span>
                                      {store.link && (
                                        <a
                                          href={store.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-400 hover:text-blue-300 text-sm"
                                        >
                                          View →
                                        </a>
                                      )}
                                    </div>
                                    {store.price && (
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-green-400 font-semibold">
                                          {store.currency_symbol || '$'}{store.price}
                                        </span>
                                        {store.sale_price && store.sale_price !== store.price && (
                                          <span className="text-red-400 text-sm">
                                            Sale: {store.currency_symbol || '$'}{store.sale_price}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      {store.availability && (
                                        <span className="text-gray-300">
                                          {store.availability}
                                        </span>
                                      )}
                                      {store.condition && (
                                        <span className="text-gray-300">
                                          • {store.condition}
                                        </span>
                                      )}
                                      {store.shipping && (
                                        <span className="text-gray-300">
                                          • Shipping: {store.shipping}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                      {!result.data.storePricing && result.data.stores && (
                        <div>
                          <p className="text-sm text-gray-400 mb-2">Available at</p>
                          <div className="flex flex-wrap gap-2">
                            {(typeof result.data.stores === 'string'
                              ? result.data.stores.split(',').map(s => s.trim()).filter(Boolean)
                              : result.data.stores
                            ).map((store, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-700 text-gray-300 text-sm rounded">
                                {store}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-white font-medium mb-2">Product Not Found</p>
                    <p className="text-gray-400 text-sm">{result.message || result.error}</p>
                  </div>
                )}
              </div>
            )}

            {!loading && !result && (
              <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-400">Enter a barcode to research product information</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
