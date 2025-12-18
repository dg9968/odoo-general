'use client';

import { useState } from 'react';
import { BatchResult } from '@/lib/odoo-client';

export default function BatchPriceUpdate() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a CSV file');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/batch-update', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch {
      setResult({
        successful_updates: 0,
        failed_updates: 0,
        total_processed: 0,
        results: [{
          success: false,
          message: 'Network error occurred',
          updated_count: 0,
        }],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-white">Batch Price Update from CSV</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            dragOver ? 'border-indigo-400 bg-indigo-900/30' : 'border-gray-600 bg-gray-700'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {file ? (
            <div>
              <p className="text-sm text-gray-300">Selected file:</p>
              <p className="font-medium text-white">{file.name}</p>
              <p className="text-xs text-gray-400">Size: {(file.size / 1024).toFixed(1)} KB</p>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="mt-2 text-sm text-red-400 hover:text-red-300"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-12 w-12 text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm text-gray-300">
                Drop a CSV file here, or{' '}
                <label className="cursor-pointer text-indigo-400 hover:text-indigo-300">
                  browse
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                  />
                </label>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                CSV should contain barcode and price columns
              </p>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Upload and Update Prices'}
        </button>
      </form>

      {result && (
        <div className="mt-6">
          <div className="bg-gray-700 border border-gray-600 p-4 rounded-md">
            <h3 className="font-medium text-white">Batch Update Results</h3>
            <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
              <div className="text-green-400">
                <span className="font-medium">Successful:</span> {result.successful_updates}
              </div>
              <div className="text-red-400">
                <span className="font-medium">Failed:</span> {result.failed_updates}
              </div>
              <div className="text-gray-300">
                <span className="font-medium">Total:</span> {result.total_processed}
              </div>
            </div>
          </div>

          {result.results.length > 0 && (
            <div className="mt-4 max-h-96 overflow-y-auto">
              <h4 className="font-medium text-white mb-2">Detailed Results</h4>
              <div className="space-y-2">
                {result.results.map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded text-sm border-l-4 ${
                      item.success ? 'bg-green-900/30 border-green-400 text-green-200' : 'bg-red-900/30 border-red-400 text-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          Row {item.row_number}: {item.barcode}
                        </p>
                        <p className="opacity-80">{item.message}</p>
                      </div>
                      {item.success && (
                        <span className="text-green-300 font-medium">
                          {item.updated_count} updated
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}