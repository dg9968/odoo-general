'use client';

import { useState } from 'react';
import { UpdateResult } from '@/lib/odoo-client';

export default function SinglePriceUpdate() {
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/price-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barcode, price: parseFloat(price) }),
      });

      const data = await response.json();
      setResult(data);
    } catch {
      setResult({
        success: false,
        message: 'Network error occurred',
        updated_count: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-white">Single Product Price Update</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="barcode" className="block text-sm font-medium text-gray-300">
            Barcode
          </label>
          <input
            type="text"
            id="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
            required
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-300">
            New Price ($)
          </label>
          <input
            type="number"
            id="price"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 placeholder-gray-400"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 focus:ring-offset-gray-800"
        >
          {loading ? 'Updating...' : 'Update Price'}
        </button>
      </form>

      {result && (
        <div className={`mt-4 p-4 rounded-md border ${result.success ? 'bg-green-900 border-green-700 text-green-200' : 'bg-red-900 border-red-700 text-red-200'}`}>
          <p className="font-medium">
            {result.success ? 'Success!' : 'Error'}
          </p>
          <p className="text-sm mt-1 opacity-90">{result.message}</p>
          {result.success && (
            <p className="text-sm mt-1 opacity-90">Products updated: {result.updated_count}</p>
          )}
        </div>
      )}
    </div>
  );
}