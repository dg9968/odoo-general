'use client';

import { useState } from 'react';

interface PriceComparison {
  barcode: string;
  itemCode: string;
  description: string;
  odooPrice: number | null;
  quickbooksPrice: number;
  priceDifference: number;
  percentChange: number;
  status: 'new' | 'match' | 'increase' | 'decrease' | 'not_found_in_odoo';
  odooProductId?: number;
  odooProductName?: string;
}

interface ComparisonSummary {
  total: number;
  matches: number;
  increases: number;
  decreases: number;
  notFoundInOdoo: number;
}

export default function PriceApproval() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparisons, setComparisons] = useState<PriceComparison[]>([]);
  const [summary, setSummary] = useState<ComparisonSummary | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [updating, setUpdating] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleCompare = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/compare-prices', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setComparisons(data.comparisons);
        setSummary(data.summary);
        // Auto-select all non-matching items
        const autoSelect = new Set<string>(
          data.comparisons
            .filter((c: PriceComparison) => c.status !== 'match' && c.status !== 'not_found_in_odoo')
            .map((c: PriceComparison) => c.barcode)
        );
        setSelectedItems(autoSelect);
      } else {
        alert('Failed to compare prices: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelection = (barcode: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(barcode)) {
      newSelected.delete(barcode);
    } else {
      newSelected.add(barcode);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    const filtered = getFilteredComparisons();
    const newSelected = new Set(selectedItems);
    filtered.forEach(c => newSelected.add(c.barcode));
    setSelectedItems(newSelected);
  };

  const handleDeselectAll = () => {
    const filtered = getFilteredComparisons();
    const newSelected = new Set(selectedItems);
    filtered.forEach(c => newSelected.delete(c.barcode));
    setSelectedItems(newSelected);
  };

  const handleApproveSelected = async () => {
    if (selectedItems.size === 0) {
      alert('No items selected');
      return;
    }

    const selectedComparisons = comparisons.filter(c => selectedItems.has(c.barcode));
    const updates = selectedComparisons.map(c => ({
      barcode: c.barcode,
      newPrice: c.quickbooksPrice,
      description: c.description
    }));

    if (!confirm(`Are you sure you want to update ${updates.length} product prices in Odoo?`)) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch('/api/approve-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully updated ${data.summary.successful} products. Failed: ${data.summary.failed}`);
        // Clear selections and reload
        setSelectedItems(new Set());
        // Optionally reload the comparison
        if (file) {
          handleCompare();
        }
      } else {
        alert('Failed to update prices: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error);
    } finally {
      setUpdating(false);
    }
  };

  const getFilteredComparisons = () => {
    if (filterStatus === 'all') return comparisons;
    return comparisons.filter(c => c.status === filterStatus);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'match': return 'text-green-600';
      case 'increase': return 'text-blue-600';
      case 'decrease': return 'text-orange-600';
      case 'not_found_in_odoo': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };


  const formatStatus = (status: string) => {
    switch (status) {
      case 'match': return 'Price Match';
      case 'increase': return 'Price Increase';
      case 'decrease': return 'Price Decrease';
      case 'not_found_in_odoo': return 'Not in Odoo';
      default: return status;
    }
  };

  const filteredComparisons = getFilteredComparisons();

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-4 text-white">1. Upload QuickBooks Products CSV</h2>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-200 border border-gray-600 rounded-lg cursor-pointer bg-gray-700 focus:outline-none p-2"
          />
          <button
            onClick={handleCompare}
            disabled={!file || loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? 'Comparing...' : 'Compare Prices'}
          </button>
        </div>
      </div>

      {/* Summary Section */}
      {summary && (
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">2. Review Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-700 p-4 rounded border border-gray-600">
              <div className="text-2xl font-bold text-white">{summary.total}</div>
              <div className="text-sm text-gray-300">Total Items</div>
            </div>
            <div className="bg-green-900/30 p-4 rounded border border-green-700">
              <div className="text-2xl font-bold text-green-400">{summary.matches}</div>
              <div className="text-sm text-gray-300">Matches</div>
            </div>
            <div className="bg-blue-900/30 p-4 rounded border border-blue-700">
              <div className="text-2xl font-bold text-blue-400">{summary.increases}</div>
              <div className="text-sm text-gray-300">Increases</div>
            </div>
            <div className="bg-orange-900/30 p-4 rounded border border-orange-700">
              <div className="text-2xl font-bold text-orange-400">{summary.decreases}</div>
              <div className="text-sm text-gray-300">Decreases</div>
            </div>
            <div className="bg-red-900/30 p-4 rounded border border-red-700">
              <div className="text-2xl font-bold text-red-400">{summary.notFoundInOdoo}</div>
              <div className="text-sm text-gray-300">Not in Odoo</div>
            </div>
          </div>
        </div>
      )}

      {/* Selection Actions */}
      {comparisons.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">3. Select Items to Update</h2>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-300">Filter:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-600 bg-gray-700 text-gray-200 rounded px-3 py-1 text-sm"
              >
                <option value="all">All ({comparisons.length})</option>
                <option value="increase">Increases ({summary?.increases})</option>
                <option value="decrease">Decreases ({summary?.decreases})</option>
                <option value="match">Matches ({summary?.matches})</option>
                <option value="not_found_in_odoo">Not in Odoo ({summary?.notFoundInOdoo})</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-4 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded border border-gray-600"
              >
                Select All Visible
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-4 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded border border-gray-600"
              >
                Deselect All Visible
              </button>
            </div>

            <div className="ml-auto">
              <span className="text-sm font-medium text-gray-300">
                Selected: {selectedItems.size} items
              </span>
            </div>

            <button
              onClick={handleApproveSelected}
              disabled={selectedItems.size === 0 || updating}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {updating ? 'Updating...' : `Approve & Update (${selectedItems.size})`}
            </button>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      {filteredComparisons.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Select</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Barcode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Odoo Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">QB Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Difference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Change %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredComparisons.map((item) => (
                  <tr key={item.barcode} className="hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      {item.status !== 'not_found_in_odoo' && (
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.barcode)}
                          onChange={() => handleToggleSelection(item.barcode)}
                          className="w-4 h-4 rounded"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-200">{item.barcode}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate text-gray-300" title={item.description}>
                      {item.description}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-200">
                      {item.odooPrice !== null ? `$${item.odooPrice.toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-200">
                      ${item.quickbooksPrice.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold ${
                      item.priceDifference > 0 ? 'text-blue-400' :
                      item.priceDifference < 0 ? 'text-orange-400' :
                      'text-gray-400'
                    }`}>
                      {item.odooPrice !== null ?
                        `${item.priceDifference >= 0 ? '+' : ''}$${item.priceDifference.toFixed(2)}` :
                        'N/A'
                      }
                    </td>
                    <td className={`px-4 py-3 text-sm font-semibold ${
                      item.percentChange > 0 ? 'text-blue-400' :
                      item.percentChange < 0 ? 'text-orange-400' :
                      'text-gray-400'
                    }`}>
                      {item.odooPrice !== null ?
                        `${item.percentChange >= 0 ? '+' : ''}${item.percentChange.toFixed(1)}%` :
                        'N/A'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(item.status)}`}>
                        {formatStatus(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {comparisons.length === 0 && !loading && (
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-12 text-center text-gray-400">
          Upload a QuickBooks CSV file to compare prices with Odoo
        </div>
      )}
    </div>
  );
}
