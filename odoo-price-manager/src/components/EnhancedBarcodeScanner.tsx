'use client';

import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface Product {
  id: number;
  name: string;
  barcode: string;
  list_price: number;
  default_code?: string;
  categ_id?: [number, string];
}

interface ScanResult {
  barcode: string;
  product?: Product;
  error?: string;
  timestamp: Date;
}

export default function EnhancedBarcodeScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);
      
      if (!codeReaderRef.current || !videoRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, (result, error) => {
        if (result) {
          const barcode = result.getText();
          sendBarcodeToWebhook(barcode);
          // Continue scanning for more barcodes
        }
        if (error && !(error instanceof NotFoundException)) {
          console.error('Scanning error:', error);
        }
      });

    } catch (error) {
      console.error('Camera access error:', error);
      setCameraError('Camera access denied or not available');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const sendBarcodeToWebhook = async (barcode: string) => {
    setLoading(true);
    console.log('Sending barcode to webhook:', barcode);
    
    try {
      const webhookUrl = 'https://vault1040.app.n8n.cloud/webhook/ad63fa81-6a49-4d3e-87c7-38ba5906f9fb';
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          barcode,
          timestamp: new Date().toISOString(),
          source: 'enhanced_barcode_scanner'
        }),
      });

      console.log('Webhook response status:', response.status);
      
      const result: ScanResult = {
        barcode,
        timestamp: new Date(),
      };

      if (response.ok) {
        result.product = {
          id: 0,
          name: 'Webhook submission successful',
          barcode: barcode,
          list_price: 0,
        };
        setCurrentProduct(result.product);
        console.log('Webhook submission successful');
      } else {
        result.error = `Webhook error: HTTP ${response.status}`;
        setCurrentProduct(null);
        console.log('Webhook submission failed:', response.status);
      }

      setScanHistory(prev => [result, ...prev.slice(0, 19)]); // Keep last 20 scans
    } catch (error) {
      console.error('Webhook error:', error);
      const result: ScanResult = {
        barcode,
        error: `Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setScanHistory(prev => [result, ...prev.slice(0, 19)]);
      setCurrentProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      sendBarcodeToWebhook(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  const clearHistory = () => {
    setScanHistory([]);
    setCurrentProduct(null);
  };

  const exportHistory = () => {
    const csvContent = [
      'Timestamp,Barcode,Product Name,Price,Status',
      ...scanHistory.map(scan => 
        `${scan.timestamp.toLocaleString()},${scan.barcode},"${scan.product?.name || 'N/A'}",${scan.product?.list_price || 'N/A'},${scan.error ? 'Error: ' + scan.error : 'Found'}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode_scan_history_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-white">Enhanced Barcode Scanner</h2>

      {/* Scanner Controls */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <button
            onClick={isScanning ? stopScanning : startScanning}
            className={`px-6 py-2 rounded-md font-medium ${
              isScanning 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isScanning ? 'Stop Scanning' : 'Start Camera Scanner'}
          </button>
          
          {scanHistory.length > 0 && (
            <>
              <button
                onClick={clearHistory}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md font-medium"
              >
                Clear History
              </button>
              <button
                onClick={exportHistory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
              >
                Export CSV
              </button>
            </>
          )}
        </div>

        {/* Camera Error */}
        {cameraError && (
          <div className="bg-red-900/30 border border-red-600 text-red-300 px-4 py-3 rounded mb-4">
            {cameraError}
          </div>
        )}

        {/* Video Feed */}
        {isScanning && (
          <div className="relative mb-4">
            <video
              ref={videoRef}
              className="w-full max-w-md mx-auto border-2 border-blue-400 rounded-lg"
              autoPlay
              muted
              playsInline
            />
            <div className="absolute inset-0 border-2 border-red-500 opacity-50 pointer-events-none max-w-md mx-auto">
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-24 border-2 border-red-500 bg-transparent"></div>
            </div>
            <p className="text-center text-sm text-gray-400 mt-2">
              Point camera at barcode within the red frame
            </p>
          </div>
        )}
      </div>

      {/* Manual Input */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-white">Manual Barcode Entry</h3>
        <form onSubmit={handleManualScan} className="flex gap-2">
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Enter barcode manually"
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
          <button
            type="submit"
            disabled={loading || !manualBarcode.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50"
          >
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </form>
      </div>

      {/* Current Scan Status */}
      {currentProduct && (
        <div className="mb-6 bg-green-900/30 border border-green-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-green-300 mb-2">Scan Status</h3>
          <div className="text-sm text-green-200">
            <p><strong className="text-green-100">Barcode:</strong> {currentProduct.barcode}</p>
            <p><strong className="text-green-100">Status:</strong> {currentProduct.name}</p>
            <p><strong className="text-green-100">Timestamp:</strong> {new Date().toLocaleString()}</p>
            <p><strong className="text-green-100">Webhook:</strong> vault1040.app.n8n.cloud</p>
          </div>
        </div>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-white">
            Scan History ({scanHistory.length})
          </h3>
          <div className="max-h-96 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700">
            <table className="w-full text-sm text-gray-300">
              <thead className="bg-gray-600 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-200">Time</th>
                  <th className="px-3 py-2 text-left text-gray-200">Barcode</th>
                  <th className="px-3 py-2 text-left text-gray-200">Status</th>
                  <th className="px-3 py-2 text-left text-gray-200">Result</th>
                  <th className="px-3 py-2 text-left text-gray-200">Status</th>
                </tr>
              </thead>
              <tbody>
                {scanHistory.map((scan, index) => (
                  <tr 
                    key={index} 
                    className={`border-t border-gray-600 ${scan.product ? 'bg-green-900/20' : 'bg-red-900/20'}`}
                  >
                    <td className="px-3 py-2">
                      {scan.timestamp.toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {scan.barcode}
                    </td>
                    <td className="px-3 py-2">
                      {scan.product ? scan.product.name : 'Webhook failed'}
                    </td>
                    <td className="px-3 py-2">
                      {scan.product ? 'Sent' : 'Failed'}
                    </td>
                    <td className="px-3 py-2">
                      {scan.error ? (
                        <span className="text-red-400 text-xs">{scan.error}</span>
                      ) : (
                        <span className="text-green-400 text-xs">✓ Sent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-900/30 border border-blue-600 rounded-lg p-4">
        <h4 className="font-semibold text-blue-300 mb-2">How to Use</h4>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• Click &quot;Start Camera Scanner&quot; to use your device camera</li>
          <li>• Point camera at barcode within the red scanning frame</li>
          <li>• Use manual entry for keyboard barcode scanners or typing</li>
          <li>• Scanned barcodes are sent to your n8n webhook automatically</li>
          <li>• Export scan history as CSV for record keeping</li>
        </ul>
      </div>
    </div>
  );
}