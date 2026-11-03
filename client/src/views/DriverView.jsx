// client/src/views/DriverView.jsx - Driver workflow: assignment, turn-by-turn guidance, and digital POD
import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  QrCode, 
  FileSignature, 
  ChevronRight,
  Navigation,
  Info
} from 'lucide-react';
import { api, sound } from '../api';

export default function DriverView({
  delivery,
  onOpenScanner,
  onOpenExceptions,
  currentUser
}) {
  const [showPodModal, setShowPodModal] = useState(false);
  const [receiverName, setReceiverName] = useState("Manoj Verma (Storekeeper)");
  const [driverNotes, setDriverNotes] = useState("Unloaded 12 pallets without transit damage.");
  const [podSubmitting, setPodSubmitting] = useState(false);
  const [podSuccess, setPodSuccess] = useState(false);

  const handleSubmitPod = async (e) => {
    e.preventDefault();
    if (!delivery) return;
    setPodSubmitting(true);
    try {
      await api.submitPOD(
        delivery.id,
        `${currentUser?.name || "Rajesh Kumar"} (E-Signature Token)`,
        receiverName,
        "/assets/proof-sample.png",
        driverNotes
      );
      setPodSuccess(true);
      setTimeout(() => {
        setShowPodModal(false);
        setPodSuccess(false);
      }, 1500);
    } catch (err) {
      alert("Error submitting POD: " + err.message);
    } finally {
      setPodSubmitting(false);
    }
  };

  if (!delivery) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border-2 border-industrial-200">
        <Truck className="w-12 h-12 text-industrial-400 mx-auto mb-2" />
        <p className="text-industrial-600 font-bold">No active delivery assigned to your vehicle.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none">
      {/* 1. Main Delivery Assignment Card (TASK-006) */}
      <div className="bg-white rounded-2xl border-2 border-industrial-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-industrial-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-industrial-700">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-industrial-300">DISPATCH MANIFEST</div>
              <h2 className="text-lg font-black tracking-wide">{delivery.id}</h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-industrial-800 text-white font-mono text-xs font-bold rounded-lg border border-industrial-600">
              VEHICLE: {delivery.vehicleNumber}
            </span>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-industrial-50 p-3.5 rounded-xl border border-industrial-200">
            <div className="text-[11px] font-bold text-industrial-500 uppercase tracking-wider flex items-center space-x-1">
              <Package className="w-3.5 h-3.5 text-industrial-600" />
              <span>Material & Cargo</span>
            </div>
            <div className="text-sm font-black text-industrial-900 mt-1">{delivery.materialName}</div>
            <div className="text-xs font-mono text-industrial-600 mt-0.5">
              Code: <span className="font-bold text-industrial-900">{delivery.materialCode}</span>
            </div>
            <div className="text-xs text-industrial-700 font-semibold mt-1">
              Quantity: {delivery.quantity} {delivery.unit} ({delivery.weightKg.toLocaleString()} kg)
            </div>
          </div>

          <div className="bg-industrial-50 p-3.5 rounded-xl border border-industrial-200">
            <div className="text-[11px] font-bold text-industrial-500 uppercase tracking-wider flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-safety-green" />
              <span>Assigned Storage Point</span>
            </div>
            <div className="text-sm font-black text-industrial-900 mt-1">{delivery.destination}</div>
            <div className="text-xs text-industrial-600 mt-0.5">
              Dock: <span className="font-bold text-blue-700">{delivery.dockAssigned}</span>
            </div>
            <div className="text-xs text-industrial-600">
              Gate: <span className="font-bold text-amber-700">{delivery.gateAssigned}</span>
            </div>
          </div>

          <div className="bg-industrial-50 p-3.5 rounded-xl border border-industrial-200">
            <div className="text-[11px] font-bold text-industrial-500 uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-safety-cyan" />
              <span>Estimated Plant Arrival</span>
            </div>
            <div className="text-sm font-black text-industrial-900 mt-1">ETA: {delivery.eta}</div>
            <div className="text-xs text-industrial-600 mt-0.5">
              PO Ref: <span className="font-mono font-bold text-industrial-800">{delivery.poNumber}</span>
            </div>
            <div className="text-xs text-industrial-600">
              Supplier: <span className="font-semibold text-industrial-800">{delivery.vendor}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Destination Guidance Hierarchy Card (TASK-008) */}
      <div className="bg-gradient-to-r from-industrial-900 to-industrial-800 text-white rounded-2xl p-5 border-2 border-industrial-700 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Navigation className="w-5 h-5 text-safety-cyan" />
            <h3 className="text-sm font-black tracking-wide">Destination Route Hierarchy (TASK-008)</h3>
          </div>
          <span className="text-xs font-mono text-safety-green bg-industrial-950 px-2.5 py-1 rounded border border-safety-green/30">
            Barcode: {delivery.locationCode}
          </span>
        </div>

        {/* 4-level breadcrumb: Store -> Zone -> Rack -> Bin */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="bg-industrial-950/80 p-3 rounded-xl border border-industrial-700">
            <span className="text-[10px] font-mono text-industrial-400 block uppercase">Level 1: Store</span>
            <span className="text-sm font-black text-white">{delivery.store}</span>
          </div>
          <div className="bg-industrial-950/80 p-3 rounded-xl border border-industrial-700">
            <span className="text-[10px] font-mono text-industrial-400 block uppercase">Level 2: Zone</span>
            <span className="text-sm font-black text-white">{delivery.zone}</span>
          </div>
          <div className="bg-industrial-950/80 p-3 rounded-xl border border-industrial-700">
            <span className="text-[10px] font-mono text-industrial-400 block uppercase">Level 3: Rack</span>
            <span className="text-sm font-black text-safety-green">{delivery.rack}</span>
          </div>
          <div className="bg-industrial-950/80 p-3 rounded-xl border border-industrial-700">
            <span className="text-[10px] font-mono text-industrial-400 block uppercase">Level 4: Bin</span>
            <span className="text-sm font-black text-safety-green">{delivery.bin}</span>
          </div>
        </div>
      </div>

      {/* 3. Plant Safety & Gate Instructions */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start space-x-3 text-amber-950">
        <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-black text-sm text-amber-900">Driver Plant Entry Instructions</div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-900/90 font-medium">
            <li>Proceed through <strong>Gate 1 Inbound</strong> and present Delivery QR at the Security Checkpoint.</li>
            <li>Maintain plant maximum speed limit of <strong>15 km/h</strong> at all times.</li>
            <li>Wear standard industrial PPE (high-visibility vest, steel-toe shoes, safety glasses).</li>
            <li>Park reverse into <strong>Dock 2 Bay</strong> for overhead crane unloading.</li>
          </ul>
        </div>
      </div>

      {/* 4. Action bar for Driver */}
      <div className="bg-white p-4 rounded-2xl border-2 border-industrial-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenScanner("DELIVERY_QR")}
            className="btn-touch px-4 py-2.5 bg-industrial-900 hover:bg-industrial-800 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm"
          >
            <QrCode className="w-4 h-4 text-safety-green" />
            <span>Show / Scan Delivery QR</span>
          </button>

          <button
            onClick={() => setShowPodModal(true)}
            disabled={delivery.status !== "Complete" && delivery.status !== "Verified"}
            className={`btn-touch px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-sm transition ${
              delivery.status === "Complete" || delivery.status === "Verified"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-industrial-100 text-industrial-400 cursor-not-allowed"
            }`}
          >
            <FileSignature className="w-4 h-4" />
            <span>Digital Proof of Delivery (POD)</span>
          </button>
        </div>

        {delivery.proofOfDelivery && (
          <div className="flex items-center space-x-1.5 text-xs text-safety-green font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>POD Completed & Stored</span>
          </div>
        )}
      </div>

      {/* POD Modal */}
      {showPodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-industrial-950/80 backdrop-blur-sm select-none">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border-4 border-industrial-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileSignature className="w-6 h-6 text-blue-600" />
                <h3 className="text-base font-black text-industrial-900">Digital Proof of Delivery</h3>
              </div>
              <button
                onClick={() => setShowPodModal(false)}
                className="text-industrial-400 hover:text-industrial-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {podSuccess ? (
              <div className="p-6 bg-emerald-50 text-emerald-900 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-safety-green mx-auto" />
                <div className="text-base font-black">Proof of Delivery Captured!</div>
                <p className="text-xs text-emerald-700">Digital receipt signed and synced to WMS audit log.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPod} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-industrial-700 block mb-1">
                    Storekeeper / Receiving Agent:
                  </label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border-2 border-industrial-300 rounded-xl font-bold text-sm focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-industrial-700 block mb-1">
                    Delivery Condition & Handover Notes:
                  </label>
                  <textarea
                    rows={2}
                    value={driverNotes}
                    onChange={(e) => setDriverNotes(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-industrial-300 rounded-xl text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Digital Signature Pad Box */}
                <div className="p-3 bg-industrial-50 rounded-xl border-2 border-dashed border-industrial-300 text-center">
                  <span className="text-[11px] font-mono text-industrial-500 block mb-1">
                    Driver Digital E-Signature:
                  </span>
                  <div className="h-14 bg-white rounded border border-industrial-200 flex items-center justify-center font-serif italic text-lg text-industrial-700 select-none">
                    {currentUser?.name || "Rajesh Kumar"} — Verified ID
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPodModal(false)}
                    className="btn-touch flex-1 bg-industrial-200 hover:bg-industrial-300 text-industrial-800 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={podSubmitting}
                    className="btn-touch flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-sm"
                  >
                    {podSubmitting ? "Signing..." : "Sign & Close Delivery"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
