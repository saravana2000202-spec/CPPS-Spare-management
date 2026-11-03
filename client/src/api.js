// client/src/api.js - Centralized API, WebSocket client, Audio Beeps, and Offline Queue Manager

const API_BASE = window.location.hostname === 'localhost' && window.location.port === '3000'
  ? 'http://localhost:3001/api'
  : '/api';

const WS_URL = window.location.hostname === 'localhost' && window.location.port === '3000'
  ? 'ws://localhost:3001'
  : `ws://${window.location.host}`;

// Web Audio API Synthesizer for Industrial Audio Feedback
class IndustrialAudioFeedback {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, this.ctx.currentTime + 0.15); // A6
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.18);
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  playError() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.setValueAtTime(160, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.25);
    } catch (e) {
      // Audio autoplay catch
    }
  }

  playBeep() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // Audio autoplay catch
    }
  }
}

export const sound = new IndustrialAudioFeedback();

// Offline Manager
class OfflineManager {
  constructor() {
    this.isForcedOffline = false;
    this.queue = this.loadQueue();
    this.listeners = [];
  }

  loadQueue() {
    try {
      const data = localStorage.getItem("PLANT_OFFLINE_QUEUE");
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveQueue() {
    try {
      localStorage.setItem("PLANT_OFFLINE_QUEUE", JSON.stringify(this.queue));
    } catch (e) {
      console.warn("Storage save error", e);
    }
    this.notify();
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  notify() {
    this.listeners.forEach(fn => fn(this.getStatus()));
  }

  setForcedOffline(val) {
    this.isForcedOffline = val;
    this.notify();
    if (!val) {
      this.syncNow();
    }
  }

  isOffline() {
    return this.isForcedOffline || !navigator.onLine;
  }

  getStatus() {
    return {
      isOffline: this.isOffline(),
      forcedOffline: this.isForcedOffline,
      pendingCount: this.queue.length,
      queue: this.queue
    };
  }

  enqueue(action) {
    const item = {
      id: `OFFQ-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      timestamp: new Date().toISOString(),
      ...action
    };
    this.queue.push(item);
    this.saveQueue();
    return item;
  }

  async syncNow() {
    if (this.queue.length === 0 || this.isOffline()) return { synced: 0 };
    const itemsToSync = [...this.queue];
    try {
      const res = await fetch(`${API_BASE}/wms/sync-queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offlineQueue: itemsToSync })
      });
      const data = await res.json();
      if (data.success) {
        this.queue = [];
        this.saveQueue();
        sound.playSuccess();
        return { synced: data.processedCount };
      }
    } catch (err) {
      console.error("Offline sync failed:", err);
    }
    return { synced: 0 };
  }
}

export const offlineMgr = new OfflineManager();

// Centralized REST API Wrapper
export const api = {
  // Auth
  async login(role, username = "demo") {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, username })
    });
    return res.json();
  },

  // Deliveries
  async getDeliveries() {
    const res = await fetch(`${API_BASE}/deliveries`);
    return res.json();
  },

  async getDelivery(id) {
    const res = await fetch(`${API_BASE}/deliveries/${id}`);
    return res.json();
  },

  async updateStatus(id, status, user, role) {
    if (offlineMgr.isOffline()) {
      offlineMgr.enqueue({ type: "STATUS_UPDATE", deliveryId: id, payload: { status, user, role } });
      return { success: true, offline: true };
    }
    const res = await fetch(`${API_BASE}/deliveries/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, user, role })
    });
    return res.json();
  },

  // Geofence
  async triggerGeofence(deliveryId, geofenceZone, userRole) {
    sound.playBeep();
    const res = await fetch(`${API_BASE}/geofence/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId, geofenceZone, userRole })
    });
    return res.json();
  },

  // Gate clearance
  async gateDecision(deliveryId, decision, guardName, notes) {
    if (decision === "ALLOW_ENTRY") sound.playSuccess();
    else sound.playError();

    const res = await fetch(`${API_BASE}/gate/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId, decision, guardName, notes })
    });
    return res.json();
  },

  // Barcode / QR validation
  async validateScan(deliveryId, scanCode, scanType, scannedBy, role) {
    if (offlineMgr.isOffline()) {
      offlineMgr.enqueue({
        type: "SCAN_VALIDATION",
        deliveryId,
        payload: { scanCode, scanType, scannedBy, role }
      });
      // Local optimistic validation for offline mode
      const isMatch = (scanType === "DELIVERY_QR" && scanCode === "DEL-2026-00482") ||
                      (scanType === "MATERIAL_BARCODE" && scanCode === "MAT-STL-9901") ||
                      (scanType === "LOCATION_BARCODE" && scanCode === "LOC-RMA-A14-B02");
      if (isMatch) sound.playSuccess();
      else sound.playError();

      return {
        result: {
          valid: isMatch,
          match: isMatch,
          scanType,
          scanCode,
          message: isMatch ? `[OFFLINE VALIDATED] Scanned code matched locally.` : `[OFFLINE WARNING] Mismatch detected locally.`
        },
        offline: true
      };
    }

    const res = await fetch(`${API_BASE}/scans/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId, scanCode, scanType, scannedBy, role })
    });
    const data = await res.json();
    if (data.result && data.result.valid) {
      sound.playSuccess();
    } else {
      sound.playError();
    }
    return data;
  },

  // Proof of Delivery
  async submitPOD(deliveryId, driverSignature, receiverName, photoUrl, notes) {
    sound.playSuccess();
    const res = await fetch(`${API_BASE}/driver/pod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId, driverSignature, receiverName, photoUrl, notes })
    });
    return res.json();
  },

  // Exceptions
  async getExceptions() {
    const res = await fetch(`${API_BASE}/exceptions`);
    return res.json();
  },

  async reportException(payload) {
    sound.playError();
    const res = await fetch(`${API_BASE}/exceptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return res.json();
  },

  async resolveException(id, resolutionNotes) {
    const res = await fetch(`${API_BASE}/exceptions/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolutionNotes })
    });
    return res.json();
  },

  // Audit
  async getAudit(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/audit?${query}`);
    return res.json();
  },

  // Notifications
  async getNotifications(role) {
    const res = await fetch(`${API_BASE}/notifications?role=${encodeURIComponent(role || '')}`);
    return res.json();
  },

  async markNotificationsRead(role, id) {
    const res = await fetch(`${API_BASE}/notifications/mark-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, id })
    });
    return res.json();
  },

  // Reset Demo
  async resetDemo() {
    const res = await fetch(`${API_BASE}/reset`, { method: "POST" });
    return res.json();
  },

  // 7,000+ Parts Criticality Analyzer API
  async getParts(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/parts?${query}`);
    return res.json();
  },

  async getPartsSummary() {
    const res = await fetch(`${API_BASE}/parts/summary`);
    return res.json();
  },

  async classifyParts(config) {
    const res = await fetch(`${API_BASE}/parts/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    return res.json();
  },

  async uploadParts(parts) {
    const res = await fetch(`${API_BASE}/parts/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parts })
    });
    return res.json();
  },

  async resetParts() {
    const res = await fetch(`${API_BASE}/parts/reset`, { method: "POST" });
    return res.json();
  },

  getPartsExportUrl(filter = 'ALL') {
    return `${API_BASE}/parts/export?filter=${encodeURIComponent(filter)}`;
  }
};

// Real-time WebSocket Client
export class RealtimeChannel {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this.ws = null;
    this.reconnectTimer = null;
    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen = () => {
        console.log("[WS] Connected to live plant telemetry");
      };
      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (this.onMessage) this.onMessage(payload);
        } catch (e) {
          console.error("WS Parse error", e);
        }
      };
      this.ws.onclose = () => {
        console.log("[WS] Disconnected. Reconnecting in 3s...");
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };
      this.ws.onerror = (err) => {
        this.ws.close();
      };
    } catch (e) {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    }
  }

  close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}
