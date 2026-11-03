// client/src/components/ExceptionModal.jsx - Standardized operational exception filing and escalation (TASK-022, TASK-023)
import React, { useState } from 'react';
import { 
  AlertOctagon, 
  X, 
  PhoneCall, 
  ShieldAlert, 
  Send, 
  CheckCircle2,
  FileWarning
} from 'lucide-react';
import { api, sound } from '../api';

export default function ExceptionModal({
  isOpen,
  onClose,
  delivery,
  currentUser,
  currentRole
}) {
  const exceptionCodes = [
    { code: "WRONG_MATERIAL", label: "Wrong Material / Grade Discrepancy", priority: "HIGH" },
    { code: "QUANTITY_MISMATCH", label: "Quantity Mismatch vs PO Manifest", priority: "HIGH" },
    { code: "DAMAGED_MATERIAL", label: "Damaged Pallet / Coil Deformity", priority: "CRITICAL" },
    { code: "WRONG_STORAGE_LOCATION", label: "Storage Location Full / Inaccessible", priority: "MEDIUM" },
    { code: "WRONG_VEHICLE", label: "Unauthorized / Unscheduled Vehicle", priority: "CRITICAL" },
    { code: "INVALID_QR", label: "Unreadable / Tampered Barcode or QR", priority: "MEDIUM" },
    { code: "RESTRICTED_ROUTE", label: "Obstruction on Designated Plant Route", priority: "MEDIUM" },
    { code: "GPS_UNAVAILABLE", label: "GPS / Geofence Telemetry Loss", priority: "LOW" },
  ];

  const [selectedCode, setSelectedCode] = useState(exceptionCodes[0].code);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const chosen = exceptionCodes.find(c => c.code === selectedCode);
    try {
      await api.reportException({
        code: selectedCode,
        reason: chosen?.label || "Operational Exception",
        deliveryId: delivery?.id || "DEL-2026-00482",
        reportedBy: currentUser?.name || "Operator",
        role: currentRole,
        notes: notes || "Immediate supervisor intervention required.",
        priority: chosen?.priority || "HIGH"
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      alert("Error reporting exception: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-industrial-950/80 backdrop-blur-sm select-none animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border-4 border-red-700 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-red-700 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-6 h-6" />
            <div>
              <h2 className="text-base font-black tracking-wide">Raise Operational Exception</h2>
              <p className="text-[11px] font-mono text-red-200">
                TASK-022: Standardized Defect & Escalation Protocol
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-red-800 hover:bg-red-900 rounded-full text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {success ? (
            <div className="p-8 text-center space-y-3">
              <CheckCircle2 className="w-14 h-14 text-safety-green mx-auto" />
              <h3 className="text-lg font-black text-industrial-900">Exception Escalated!</h3>
              <p className="text-xs text-industrial-600">
                Supervisor Anita Sharma has received priority alert. Audit log recorded.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Delivery Reference */}
              <div className="bg-industrial-100 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-industrial-600">Delivery Ref:</span>
                <span className="font-bold text-industrial-900">{delivery?.id || "DEL-2026-00482"} ({delivery?.vehicleNumber})</span>
              </div>

              {/* Exception Code Select */}
              <div>
                <label className="text-xs font-bold text-industrial-700 block mb-1">
                  Select Exception Category:
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {exceptionCodes.map((item) => (
                    <label
                      key={item.code}
                      onClick={() => setSelectedCode(item.code)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border-2 text-xs font-bold cursor-pointer transition ${
                        selectedCode === item.code
                          ? "bg-red-50 border-red-600 text-red-950 shadow-sm"
                          : "bg-white border-industrial-200 text-industrial-700 hover:bg-industrial-50"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="exceptionCode"
                          checked={selectedCode === item.code}
                          onChange={() => setSelectedCode(item.code)}
                          className="text-red-600"
                        />
                        <span>{item.label}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-black ${
                        item.priority === "CRITICAL"
                          ? "bg-red-600 text-white"
                          : item.priority === "HIGH"
                          ? "bg-amber-500 text-industrial-950"
                          : "bg-industrial-200 text-industrial-700"
                      }`}>
                        {item.priority}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-industrial-700 block mb-1">
                  Detailed Observation & Immediate Action Taken:
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Coil edge cracked during transit; unloading halted pending QA supervisor clearance."
                  required
                  className="w-full px-3 py-2 border-2 border-industrial-300 rounded-xl text-xs focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Escalation Hotline Box */}
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between text-xs text-amber-950">
                <div className="flex items-center space-x-2">
                  <PhoneCall className="w-4 h-4 text-amber-700" />
                  <div>
                    <div className="font-bold">Plant Control Room Escalation</div>
                    <div className="text-[11px] text-amber-800">Ext: 4401 | Mobile: +91 94444 88888</div>
                  </div>
                </div>
                <span className="font-bold text-amber-900 bg-amber-200/60 px-2 py-1 rounded text-[11px]">
                  24/7 Support
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-touch flex-1 bg-industrial-200 hover:bg-industrial-300 text-industrial-800 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-touch flex-1 bg-red-700 hover:bg-red-800 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? "Submitting..." : "Escalate Exception"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
