// client/src/components/BarcodeScannerModal.jsx - Multi-mode industrial scanner with real camera support & hardware triggers
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Barcode, 
  QrCode, 
  MapPin, 
  Package, 
  Keyboard
} from 'lucide-react';
import { api, sound } from '../api';

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  delivery,
  defaultScanType = "DELIVERY_QR",
  currentUser,
  currentRole,
  onScanSuccess
}) {
  const [scanType, setScanType] = useState(defaultScanType);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  useEffect(() => {
    if (defaultScanType) {
      setScanType(defaultScanType);
    }
    setScanResult(null);
  }, [defaultScanType, isOpen]);

  // Handle Camera start/stop
  useEffect(() => {
    if (isOpen && isScanningCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, isScanningCamera]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser environment.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera start failed:", err);
      setCameraError(err.message || "Could not access device camera. Use quick test triggers below.");
      setIsScanningCamera(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleExecuteScan = async (codeToScan, explicitType = scanType) => {
    if (!codeToScan) return;
    setScanResult({ loading: true, code: codeToScan });

    try {
      const response = await api.validateScan(
        delivery?.id || "DEL-2026-00482",
        codeToScan,
        explicitType,
        currentUser?.name || "Operator",
        currentRole
      );

      setScanResult({
        loading: false,
        valid: response.result.valid,
        message: response.result.message,
        code: codeToScan,
        type: explicitType,
        offline: response.offline
      });

      if (response.result.valid && onScanSuccess) {
        onScanSuccess(response.delivery, response.result);
      }
    } catch (err) {
      sound.playError();
      setScanResult({
        loading: false,
        valid: false,
        message: err.message || "Scan validation network error",
        code: codeToScan,
        type: explicitType
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-industrial-950/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-4 border-industrial-800 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-industrial-900 text-white px-5 py-3.5 flex items-center justify-between border-b-2 border-industrial-700">
          <div className="flex items-center space-x-2">
            <Barcode className="w-6 h-6 text-safety-green" />
            <div>
              <h2 className="text-base font-black tracking-wide">Industrial Optical Scanner</h2>
              <p className="text-[11px] font-mono text-industrial-300">
                1D Barcode / 2D DataMatrix & QR Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-industrial-800 hover:bg-industrial-700 rounded-full text-industrial-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Type Picker Tabs */}
        <div className="bg-industrial-100 p-2 grid grid-cols-3 gap-1.5 border-b border-industrial-300 text-xs font-bold">
          <button
            onClick={() => { setScanType("DELIVERY_QR"); setScanResult(null); }}
            className={`py-2 px-1 rounded-lg flex items-center justify-center space-x-1 transition ${
              scanType === "DELIVERY_QR"
                ? "bg-industrial-900 text-white shadow-sm"
                : "bg-white text-industrial-700 hover:bg-industrial-200"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Delivery QR</span>
          </button>
          <button
            onClick={() => { setScanType("MATERIAL_BARCODE"); setScanResult(null); }}
            className={`py-2 px-1 rounded-lg flex items-center justify-center space-x-1 transition ${
              scanType === "MATERIAL_BARCODE"
                ? "bg-industrial-900 text-white shadow-sm"
                : "bg-white text-industrial-700 hover:bg-industrial-200"
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Material Barcode</span>
          </button>
          <button
            onClick={() => { setScanType("LOCATION_BARCODE"); setScanResult(null); }}
            className={`py-2 px-1 rounded-lg flex items-center justify-center space-x-1 transition ${
              scanType === "LOCATION_BARCODE"
                ? "bg-industrial-900 text-white shadow-sm"
                : "bg-white text-industrial-700 hover:bg-industrial-200"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Location Bin</span>
          </button>
        </div>

        {/* Viewport / Laser Scan Box */}
        <div className="relative bg-black min-h-[220px] flex items-center justify-center overflow-hidden">
          {isScanningCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-industrial-400">
              <Barcode className="w-16 h-16 text-industrial-600 mb-2 stroke-[1.5]" />
              <p className="text-xs font-mono text-industrial-300">Optical sensor armed & ready</p>
              <button
                onClick={() => setIsScanningCamera(true)}
                className="mt-3 px-3 py-1.5 bg-industrial-800 hover:bg-industrial-700 text-industrial-200 text-xs font-bold rounded-lg border border-industrial-600 flex items-center space-x-1.5 transition"
              >
                <Camera className="w-4 h-4 text-safety-cyan" />
                <span>Enable Real Device Camera</span>
              </button>
            </div>
          )}

          {/* Laser targeting reticle */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="w-64 h-36 border-2 border-safety-green/70 rounded-2xl relative shadow-[0_0_15px_rgba(22,163,74,0.4)]">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-safety-green rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-safety-green rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-safety-green rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-safety-green rounded-br-lg"></div>
              
              {/* Animated Laser Beam */}
              <div className="absolute left-2 right-2 h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-scan-laser"></div>
            </div>
          </div>

          {/* Camera Error Message */}
          {cameraError && (
            <div className="absolute bottom-2 left-2 right-2 bg-red-950/90 text-red-200 text-xs p-2 rounded-lg border border-red-800 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        {/* Scan Result Feedback Banner */}
        {scanResult && (
          <div
            className={`p-3.5 border-b-2 flex items-start space-x-2.5 text-xs font-bold ${
              scanResult.loading
                ? "bg-blue-50 text-blue-900 border-blue-200"
                : scanResult.valid
                ? "bg-emerald-50 text-emerald-900 border-emerald-400"
                : "bg-red-50 text-red-900 border-red-400"
            }`}
          >
            {scanResult.loading ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            ) : scanResult.valid ? (
              <CheckCircle2 className="w-5 h-5 text-safety-green flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-safety-red flex-shrink-0" />
            )}
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wide opacity-75">
                Scanned Code: {scanResult.code} {scanResult.offline && "(Offline Queued)"}
              </div>
              <div className="text-sm font-black">{scanResult.message}</div>
            </div>
          </div>
        )}

        {/* Quick Test Barcode Palettes (Industrial Rugged Trigger Simulation) */}
        <div className="p-4 bg-industrial-50 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-industrial-700 flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Hardware Trigger Test Barcodes:</span>
            </span>
            <span className="text-[11px] font-mono text-industrial-500">1-Tap Verification</span>
          </div>

          {/* Test Buttons corresponding to active scan type */}
          {scanType === "DELIVERY_QR" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => handleExecuteScan(delivery?.id || "DEL-2026-00482", "DELIVERY_QR")}
                className="btn-touch px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-left border border-emerald-900 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold">Valid Delivery QR</div>
                  <div className="font-mono text-[11px] opacity-90">{delivery?.id || "DEL-2026-00482"}</div>
                </div>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleExecuteScan("DEL-INVALID-8888", "DELIVERY_QR")}
                className="btn-touch px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-left border border-red-900 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold">Invalid / Wrong QR</div>
                  <div className="font-mono text-[11px] opacity-90">DEL-INVALID-8888</div>
                </div>
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          )}

          {scanType === "MATERIAL_BARCODE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => handleExecuteScan(delivery?.materialCode || "MAT-STL-9901", "MATERIAL_BARCODE")}
                className="btn-touch px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-left border border-emerald-900 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold">Valid Coil Barcode</div>
                  <div className="font-mono text-[11px] opacity-90">{delivery?.materialCode || "MAT-STL-9901"}</div>
                </div>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleExecuteScan("MAT-WRONG-4040", "MATERIAL_BARCODE")}
                className="btn-touch px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-left border border-red-900 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold">Mismatched Material</div>
                  <div className="font-mono text-[11px] opacity-90">MAT-WRONG-4040</div>
                </div>
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          )}

          {scanType === "LOCATION_BARCODE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() => handleExecuteScan(delivery?.locationCode || "LOC-RMA-A14-B02", "LOCATION_BARCODE")}
                className="btn-touch px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-left border border-emerald-900 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold">Correct Put-Away Bin</div>
                  <div className="font-mono text-[11px] opacity-90">{delivery?.locationCode || "LOC-RMA-A14-B02"}</div>
                </div>
                <CheckCircle2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleExecuteScan("LOC-WRG-RMB-01", "LOCATION_BARCODE")}
                className="btn-touch px-3 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-left border border-red-900 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold">Wrong Location Bin</div>
                  <div className="font-mono text-[11px] opacity-90">LOC-WRG-RMB-01</div>
                </div>
                <AlertTriangle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Manual Entry Fallback */}
          <div className="pt-2 border-t border-industrial-200">
            <label className="text-xs font-semibold text-industrial-600 mb-1 flex items-center space-x-1">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Or Key In Barcode Manually:</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. MAT-STL-9901"
                className="flex-1 px-3 py-2 border-2 border-industrial-300 rounded-xl font-mono text-sm uppercase focus:outline-none focus:border-industrial-900"
              />
              <button
                onClick={() => handleExecuteScan(manualCode)}
                className="btn-touch px-4 py-2 bg-industrial-900 text-white rounded-xl font-bold text-xs"
              >
                Verify
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-industrial-200 flex justify-end">
          <button
            onClick={onClose}
            className="btn-touch px-5 py-2 bg-industrial-200 hover:bg-industrial-300 text-industrial-800 rounded-xl font-bold text-xs transition"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
