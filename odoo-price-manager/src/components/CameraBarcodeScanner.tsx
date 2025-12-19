'use client';

import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface CameraBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
}

export default function CameraBarcodeScanner({ onScan, onError }: CameraBarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [lastScanned, setLastScanned] = useState<string>('');
  const [initError, setInitError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  // Initialize code reader and get cameras
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();

    // Request camera permission first (required for iOS)
    const initializeCameras = async () => {
      try {
        // Request permission by attempting to get user media
        // This is required on iOS before enumerateDevices will show labels
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        // Stop the temporary stream
        stream.getTracks().forEach(track => track.stop());

        // Now enumerate devices (labels will be available after permission granted)
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);

        if (videoDevices.length > 0) {
          // Prefer back camera on mobile
          const backCamera = videoDevices.find(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('rear') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCamera(backCamera?.deviceId || videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error initializing cameras:', err);
        const errorMsg = 'Camera permission denied or not available. Please enable camera access in your browser settings.';
        setInitError(errorMsg);
        onError?.(errorMsg);
      }
    };

    initializeCameras();

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!codeReaderRef.current || !videoRef.current || !selectedCamera) {
      onError?.('Camera not ready');
      return;
    }

    try {
      setIsScanning(true);

      await codeReaderRef.current.decodeFromVideoDevice(
        selectedCamera,
        videoRef.current,
        (result, error) => {
          if (result) {
            const barcode = result.getText();
            if (barcode !== lastScanned) {
              setLastScanned(barcode);
              onScan(barcode);
              // Vibrate on successful scan (if supported)
              if (navigator.vibrate) {
                navigator.vibrate(200);
              }
            }
          }
          if (error && !(error instanceof NotFoundException)) {
            console.error('Scan error:', error);
          }
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      onError?.('Failed to start camera');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
    setLastScanned('');
  };

  const handleCameraChange = (deviceId: string) => {
    const wasScanning = isScanning;
    stopScanning();
    setSelectedCamera(deviceId);
    if (wasScanning) {
      setTimeout(() => startScanning(), 100);
    }
  };

  return (
    <div className="space-y-4">
      {initError && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">{initError}</p>
          <p className="text-sm text-gray-400 mt-2">
            On iOS: Go to Settings → Safari → Camera and allow camera access
          </p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Camera
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => handleCameraChange(e.target.value)}
            className="w-full border border-gray-600 bg-gray-700 text-gray-200 rounded px-3 py-2"
            disabled={isScanning || cameras.length === 0}
          >
            {cameras.length === 0 ? (
              <option value="">No cameras available</option>
            ) : (
              cameras.map(camera => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex gap-2 items-end">
          {!isScanning ? (
            <button
              onClick={startScanning}
              disabled={!selectedCamera}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Start Camera
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 whitespace-nowrap"
            >
              Stop Camera
            </button>
          )}
        </div>
      </div>

      {/* Video preview */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
        <video
          ref={videoRef}
          className="w-full h-auto"
          playsInline
          autoPlay
          muted
          style={{
            display: isScanning ? 'block' : 'none',
            maxHeight: '500px',
            objectFit: 'contain'
          }}
        />
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>Click &ldquo;Start Camera&rdquo; to begin scanning</p>
            </div>
          </div>
        )}
      </div>

      {lastScanned && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
          <p className="text-sm text-gray-300">Last scanned:</p>
          <p className="text-lg font-mono font-bold text-green-400">{lastScanned}</p>
        </div>
      )}

      {isScanning && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-center">
          <p className="text-blue-400">
            <span className="inline-block animate-pulse mr-2">●</span>
            Camera active - Point at barcode
          </p>
        </div>
      )}
    </div>
  );
}
