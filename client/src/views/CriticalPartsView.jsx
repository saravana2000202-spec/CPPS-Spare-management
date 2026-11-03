// client/src/views/CriticalPartsView.jsx - Plant Parts Criticality, Consumption & Procurement Intelligence
import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock,
  TrendingUp,
  Package,
  Wrench,
  Zap,
  Building2,
  ShoppingCart,
  Boxes,
  RotateCcw,
  X
} from 'lucide-react';
import { api } from '../api';

export default function CriticalPartsView() {
  // State
  const [parts, setParts] = useState([]);
  const [totalParts, setTotalParts] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [activeFilter, setActiveFilter] = useState('CRITICAL'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('compositeScore');
  const [sortDir, setSortDir] = useState('desc');

  // Modals & Panels
  const [selectedPart, setSelectedPart] = useState(null);
  const [tuningOpen, setTuningOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null);

  // Tunable weights & thresholds
  const [config, setConfig] = useState({
    impactWeight: 0.45,
    leadTimeWeight: 0.35,
    usageWeight: 0.20,
    criticalCutoff: 2.30,
    semiCutoff: 1.70,
    ltHighCutoff: 60,
    ltMedCutoff: 15
  });

  // Fetch summary analytics
  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.getPartsSummary();
      if (data) {
        setSummary(data);
        if (data.currentConfig) {
          setConfig(data.currentConfig);
        }
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  }, []);

  // Fetch paginated parts
  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getParts({
        page,
        pageSize,
        search: searchTerm,
        filter: activeFilter,
        category: categoryFilter,
        sortBy,
        sortDir
      });
      if (res && res.parts) {
        setParts(res.parts);
        setTotalParts(res.total);
        setTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching parts:', err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, activeFilter, categoryFilter, sortBy, sortDir]);

  // Initial load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Handle tuning submission
  const handleApplyTuning = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.classifyParts(config);
      await fetchSummary();
      await fetchParts();
      setTuningOpen(false);
    } catch (err) {
      alert('Error updating configuration: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset to default weights
  const handleResetDefaults = () => {
    setConfig({
      impactWeight: 0.45,
      leadTimeWeight: 0.35,
      usageWeight: 0.20,
      criticalCutoff: 2.30,
      semiCutoff: 1.70,
      ltHighCutoff: 60,
      ltMedCutoff: 15
    });
  };

  // Quick export
  const handleExport = (filterType) => {
    const url = api.getPartsExportUrl(filterType);
    window.open(url, '_blank');
  };

  // Categories list
  const categoryOptions = [
    'ALL',
    'Mechanical & Power Transmission',
    'Mechanical & Spares',
    'Pneumatics & Hydraulics',
    'Electrical & Automation',
    'Pumps & Fluid Handling',
    'Fasteners & Hardware'
  ];

  const pSum = summary?.procurementSummary || {};

  return (
    <div className="space-y-5 animate-fade-in text-industrial-100">
      {/* 1. Header Banner */}
      <div className="bg-industrial-900 border-2 border-industrial-700 rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-safety-cyan text-xs font-mono font-bold tracking-wider uppercase mb-1">
            <Building2 className="w-4 h-4 text-safety-cyan" />
            <span>Cab Panel Press Shop (CPPS) • Plant 2003 • Storage NPE1 • Owner: PE Team</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-3">
            <span>Critical Parts Analyzer & Procurement Planner</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-safety-red/20 text-safety-red border border-safety-red/40">
              {summary ? `${summary.totalParts.toLocaleString()} Master Spares` : '7,340 Master Spares'}
            </span>
          </h1>
          <p className="text-xs text-industrial-400 mt-1 max-w-3xl">
            Inventory parameters (<strong className="text-industrial-200">Safety Stock, Min, Reorder Level [ROL], Reorder Qty [ROQ], Max</strong>) computed dynamically from 32 months of actual issue history (<strong className="text-industrial-200">NPE1 history.xlsx</strong>) and plant VED risk matrices.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Procurement Indents Required */}
          <button
            onClick={() => handleExport('PROCURE_NOW')}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black flex items-center space-x-1.5 transition shadow-md animate-pulse"
            title="Download all parts requiring immediate procurement or indent"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            <span>Export Indents Plan CSV ({pSum.actionRequiredTotal || 0})</span>
          </button>

          {/* Export Isolated Critical Parts */}
          <button
            onClick={() => handleExport('CRITICAL')}
            className="px-3 py-2 bg-red-950/80 hover:bg-red-900 border border-red-600 text-red-200 hover:text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
            title="Download separated Critical Parts CSV"
          >
            <Download className="w-4 h-4 text-red-400" />
            <span>Export Critical CSV</span>
          </button>

          {/* Tuning Drawer Button */}
          <button
            onClick={() => setTuningOpen(true)}
            className="px-3 py-2 bg-industrial-800 hover:bg-industrial-700 border border-industrial-600 hover:border-safety-cyan text-industrial-200 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
          >
            <Sliders className="w-4 h-4 text-safety-cyan" />
            <span>Rules & Weights</span>
          </button>

          {/* Export All */}
          <button
            onClick={() => handleExport('ALL')}
            className="px-3 py-2 bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 text-industrial-300 hover:text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-industrial-400" />
            <span>Export All ({summary?.totalParts || 0})</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards: Criticality & Procurement Triggers */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Master Spares */}
        <div
          onClick={() => { setActiveFilter('ALL'); setPage(1); }}
          className={`cursor-pointer bg-industrial-900/90 border rounded-xl p-3.5 transition hover:border-industrial-500 ${
            activeFilter === 'ALL' ? 'border-industrial-400 ring-2 ring-industrial-400/30' : 'border-industrial-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-industrial-400 mb-1">
            <span className="font-mono">Total Spares</span>
            <Package className="w-4 h-4 text-industrial-400" />
          </div>
          <div className="text-xl font-black text-white">
            {summary ? summary.totalParts.toLocaleString() : '7,340'}
          </div>
          <div className="text-[11px] text-industrial-400 mt-1 font-mono">Hosur CPPS Master</div>
        </div>

        {/* Critical Spares Total */}
        <div
          onClick={() => { setActiveFilter('CRITICAL'); setPage(1); }}
          className={`cursor-pointer bg-red-950/40 border rounded-xl p-3.5 transition hover:border-red-500 ${
            activeFilter === 'CRITICAL' ? 'border-red-500 ring-2 ring-red-500/50 bg-red-950/70' : 'border-red-900/70'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400 font-bold mb-1">
            <span>Critical Spares</span>
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
          </div>
          <div className="text-xl font-black text-red-200">
            {summary?.criticalCount ? summary.criticalCount.toLocaleString() : '1,017'}
          </div>
          <div className="text-[11px] text-red-400 font-bold mt-1 font-mono">
            {summary?.criticalPct ? `${summary.criticalPct}% of Inventory` : 'High Priority'}
          </div>
        </div>

        {/* 🚨 Critical Spares Needing Urgent Indent */}
        <div
          onClick={() => { setActiveFilter('CRITICAL_PROCURE'); setPage(1); }}
          className={`cursor-pointer bg-red-950/60 border rounded-xl p-3.5 transition hover:border-red-400 ${
            activeFilter === 'CRITICAL_PROCURE' ? 'border-red-400 ring-2 ring-red-400/60 bg-red-900/60' : 'border-red-700/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-300 font-extrabold mb-1">
            <span>Critical Stockouts</span>
            <ShoppingCart className="w-4 h-4 text-red-400 animate-bounce" />
          </div>
          <div className="text-xl font-black text-white">
            {pSum.critActionRequiredTotal ? pSum.critActionRequiredTotal.toLocaleString() : '668'}
          </div>
          <div className="text-[11px] text-red-300 font-mono mt-1">
            🚨 Immediate Indents
          </div>
        </div>

        {/* ⚠️ Reorder Point Hit (ROL) */}
        <div
          onClick={() => { setActiveFilter('REORDER_TRIGGERED'); setPage(1); }}
          className={`cursor-pointer bg-amber-950/30 border rounded-xl p-3.5 transition hover:border-amber-500 ${
            activeFilter === 'REORDER_TRIGGERED' ? 'border-amber-500 ring-2 ring-amber-500/40 bg-amber-950/50' : 'border-amber-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold mb-1">
            <span>Reorder Point Hit</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-200">
            {pSum.reorderCount ? pSum.reorderCount.toLocaleString() : '173'}
          </div>
          <div className="text-[11px] text-amber-400/90 mt-1 font-mono">
            ⚠️ Stock ≤ ROL (Procure)
          </div>
        </div>

        {/* ✅ Healthy Stock Buffer */}
        <div
          onClick={() => { setActiveFilter('HEALTHY'); setPage(1); }}
          className={`cursor-pointer bg-emerald-950/30 border rounded-xl p-3.5 transition hover:border-emerald-500 ${
            activeFilter === 'HEALTHY' ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-950/50' : 'border-emerald-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold mb-1">
            <span>Healthy Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-200">
            {pSum.healthyCount ? pSum.healthyCount.toLocaleString() : '178'}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-mono">
            ROL &lt; Stock ≤ Max
          </div>
        </div>

        {/* 📦 Overstock / Excess Buffer */}
        <div
          onClick={() => { setActiveFilter('OVERSTOCK'); setPage(1); }}
          className={`cursor-pointer bg-blue-950/30 border rounded-xl p-3.5 transition hover:border-blue-500 ${
            activeFilter === 'OVERSTOCK' ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-950/50' : 'border-blue-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-300 font-bold mb-1">
            <span>Overstock Spares</span>
            <Boxes className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-black text-blue-200">
            {pSum.overstockCount ? pSum.overstockCount.toLocaleString() : '785'}
          </div>
          <div className="text-[11px] text-blue-400 mt-1 font-mono">
            Stock &gt; Max Level
          </div>
        </div>
      </div>

      {/* 3. Filter Navigation Tabs & Search Toolbar */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl p-4 shadow space-y-3">
        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 border-b border-industrial-800 pb-3">
          <span className="text-xs font-mono text-industrial-400 mr-2 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-safety-cyan" />
            <span>Procurement & Criticality Views:</span>
          </span>

          <button
            onClick={() => { setActiveFilter('CRITICAL'); setPage(1); }}
            className={`btn-touch px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
              activeFilter === 'CRITICAL'
                ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400/40'
                : 'bg-industrial-800 text-red-400 hover:bg-industrial-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Critical Spares Isolated ({summary?.criticalCount || 0})</span>
          </button>

          <button
            onClick={() => { setActiveFilter('CRITICAL_PROCURE'); setPage(1); }}
            className={`btn-touch px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition ${
              activeFilter === 'CRITICAL_PROCURE'
                ? 'bg-red-700 text-white shadow-md ring-2 ring-red-400/40'
                : 'bg-industrial-800 text-red-300 hover:bg-industrial-700'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>🚨 Critical Indents Needed ({pSum.critActionRequiredTotal || 0})</span>
          </button>

          <button
            onClick={() => { setActiveFilter('PROCURE_NOW'); setPage(1); }}
            className={`btn-touch px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              activeFilter === 'PROCURE_NOW'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-industrial-800 text-amber-300 hover:bg-industrial-700'
            }`}
          >
            <span>All Indents / Reorders ({pSum.actionRequiredTotal || 0})</span>
          </button>

          <button
            onClick={() => { setActiveFilter('CONSUMED_SPARES'); setPage(1); }}
            className={`btn-touch px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              activeFilter === 'CONSUMED_SPARES'
                ? 'bg-cyan-700 text-white shadow-md'
                : 'bg-industrial-800 text-cyan-300 hover:bg-industrial-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Active Consumed Spares ({pSum.activeConsumedCount || 0})</span>
          </button>

          <button
            onClick={() => { setActiveFilter('ALL'); setPage(1); }}
            className={`btn-touch px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              activeFilter === 'ALL'
                ? 'bg-industrial-600 text-white shadow-md'
                : 'bg-industrial-800 text-industrial-300 hover:bg-industrial-700'
            }`}
          >
            <span>All Parts ({summary?.totalParts || 0})</span>
          </button>

          <button
            onClick={() => { setActiveFilter('HEALTHY'); setPage(1); }}
            className={`btn-touch px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              activeFilter === 'HEALTHY'
                ? 'bg-emerald-700 text-white shadow-md'
                : 'bg-industrial-800 text-emerald-400 hover:bg-industrial-700'
            }`}
          >
            <span>Healthy Stock ({pSum.healthyCount || 0})</span>
          </button>

          <button
            onClick={() => { setActiveFilter('OVERSTOCK'); setPage(1); }}
            className={`btn-touch px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition ${
              activeFilter === 'OVERSTOCK'
                ? 'bg-blue-700 text-white shadow-md'
                : 'bg-industrial-800 text-blue-300 hover:bg-industrial-700'
            }`}
          >
            <span>Overstock ({pSum.overstockCount || 0})</span>
          </button>
        </div>

        {/* Search & Category Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-center">
          {/* Search box */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 text-industrial-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Part #, Description, Storage Loc (NPE1), or Domain..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full bg-industrial-950 border border-industrial-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-industrial-500 focus:outline-none focus:border-safety-cyan"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-industrial-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="w-full bg-industrial-950 border border-industrial-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-safety-cyan"
            >
              {categoryOptions.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Engineering Domains' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-industrial-950 border border-industrial-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-safety-cyan"
            >
              <option value="compositeScore">Sort: Criticality Score</option>
              <option value="totalConsumed32Mo">Sort: 32-Mo Consumption</option>
              <option value="currentStock">Sort: Current Stock</option>
              <option value="reorderLevel">Sort: Reorder Level (ROL)</option>
              <option value="leadTimeDays">Sort: Lead Time (Days)</option>
              <option value="partNumber">Sort: Part Number</option>
            </select>
            <button
              onClick={() => setSortDir(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-2.5 py-2 bg-industrial-800 border border-industrial-700 rounded-lg text-industrial-300 hover:text-white text-xs font-mono"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Active Filter Banner & Summary Count */}
      <div className="flex items-center justify-between text-xs px-1 text-industrial-400">
        <div className="flex items-center space-x-2">
          <span>Active View:</span>
          <span className="font-bold text-white px-2 py-0.5 rounded bg-industrial-800 border border-industrial-700">
            {activeFilter === 'CRITICAL' ? '⚠️ CRITICAL SPARES' : activeFilter === 'CRITICAL_PROCURE' ? '🚨 CRITICAL INDENTS REQUIRED' : activeFilter === 'PROCURE_NOW' ? '⚠️ REORDERS & STOCKOUTS' : activeFilter}
          </span>
          <span>• Found <strong className="text-white">{totalParts.toLocaleString()}</strong> plant parts</span>
        </div>

        <div className="flex items-center space-x-2">
          <span>Items per page:</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="bg-industrial-900 border border-industrial-700 rounded px-2 py-0.5 text-xs text-white"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* 5. Inventory Planning & Procurement Data Table */}
      <div className="bg-industrial-900 border border-industrial-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-industrial-950/80 text-industrial-400 uppercase font-mono tracking-wider border-b border-industrial-800">
              <tr>
                <th className="py-3 px-3">Material / Part #</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 text-center">Current Stock</th>
                <th className="py-3 px-3 text-center">Safety Stock (Min)</th>
                <th className="py-3 px-3 text-center">Reorder Level (ROL)</th>
                <th className="py-3 px-3 text-center">Reorder Qty (ROQ)</th>
                <th className="py-3 px-3 text-center">Max Stock</th>
                <th className="py-3 px-3 text-center">32-Mo Consumed</th>
                <th className="py-3 px-3 text-center">Procurement Indication</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-industrial-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-safety-cyan" />
                    <span>Calculating inventory planning & procurement triggers...</span>
                  </td>
                </tr>
              ) : parts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-industrial-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-industrial-600" />
                    <p className="text-sm font-semibold text-industrial-300">No parts found matching this filter.</p>
                  </td>
                </tr>
              ) : (
                parts.map((p) => {
                  const isStockout = p.procurementStatus === 'CRITICAL_STOCKOUT';
                  const isReorder = p.procurementStatus === 'REORDER_TRIGGERED';
                  const isHealthy = p.procurementStatus === 'HEALTHY';
                  const isOverstock = p.procurementStatus === 'OVERSTOCK';
                  const isCrit = p.categoryTag === 'CRITICAL';

                  return (
                    <tr
                      key={p.partNumber}
                      onClick={() => setSelectedPart(p)}
                      className={`cursor-pointer transition hover:bg-industrial-800/60 ${
                        isStockout && isCrit ? 'bg-red-950/25' : isStockout ? 'bg-red-950/10' : isReorder ? 'bg-amber-950/15' : ''
                      }`}
                    >
                      {/* Part Number */}
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        <div className="flex items-center space-x-1.5">
                          {isCrit && <span title="Critical Spare" className="text-red-400 font-black">●</span>}
                          <span className="hover:text-safety-cyan">{p.partNumber}</span>
                        </div>
                        <div className="text-[10px] text-industrial-500 font-normal">
                          {p.category}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-industrial-100 max-w-xs truncate" title={p.description}>
                          {p.description}
                        </div>
                        <div className="text-[10px] text-industrial-400 flex items-center space-x-1.5 mt-0.5 font-mono">
                          <span>LT: {p.leadTimeDays || 'N/A'}d</span>
                          <span>•</span>
                          <span>{p.storageLocation || 'NPE1'}</span>
                        </div>
                      </td>

                      {/* Current Stock */}
                      <td className="py-3 px-3 text-center font-mono">
                        <div className={`font-black text-sm ${
                          p.currentStock <= 0
                            ? 'text-red-400 font-extrabold'
                            : p.currentStock < p.minStock
                            ? 'text-amber-400'
                            : 'text-white'
                        }`}>
                          {p.currentStock ?? 0} {p.uom || 'EA'}
                        </div>
                        {p.stockValue > 0 && (
                          <div className="text-[10px] text-industrial-500">₹{Number(p.stockValue).toLocaleString()}</div>
                        )}
                      </td>

                      {/* Safety Stock (Min) */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-industrial-950 text-industrial-200 border border-industrial-800 font-bold">
                          {p.safetyStock} {p.uom || 'EA'}
                        </span>
                      </td>

                      {/* Reorder Level (ROL) */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60 font-bold">
                          {p.reorderLevel} {p.uom || 'EA'}
                        </span>
                      </td>

                      {/* Reorder Quantity (ROQ) */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-safety-cyan border border-cyan-800/60 font-bold">
                          {p.roq} {p.uom || 'EA'}
                        </span>
                      </td>

                      {/* Max Stock */}
                      <td className="py-3 px-3 text-center font-mono text-industrial-400">
                        {p.maxStock} {p.uom || 'EA'}
                      </td>

                      {/* 32-Mo Consumed */}
                      <td className="py-3 px-3 text-center font-mono">
                        {p.totalConsumed32Mo > 0 ? (
                          <div>
                            <span className="font-bold text-white">{p.totalConsumed32Mo}</span>
                            <div className="text-[10px] text-industrial-400">({p.avgMonthlyUsage}/mo)</div>
                          </div>
                        ) : (
                          <span className="text-industrial-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Procurement Indication Status */}
                      <td className="py-3 px-3 text-center">
                        {isStockout ? (
                          <span className="px-2.5 py-1 rounded bg-red-600 text-white font-extrabold text-[10px] shadow-sm inline-flex items-center space-x-1">
                            <ShoppingCart className="w-3 h-3 flex-shrink-0" />
                            <span>🚨 URGENT INDENT</span>
                          </span>
                        ) : isReorder ? (
                          <span className="px-2.5 py-1 rounded bg-amber-600 text-industrial-950 font-black text-[10px] shadow-sm inline-flex items-center space-x-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span>⚠️ REORDER (ROL)</span>
                          </span>
                        ) : isOverstock ? (
                          <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700 text-[10px] font-bold">
                            📦 OVERSTOCK
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
                            ✅ HEALTHY
                          </span>
                        )}
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPart(p); }}
                          className="px-2.5 py-1 bg-industrial-800 hover:bg-industrial-700 text-industrial-200 hover:text-white rounded border border-industrial-700 text-[11px] font-mono"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 6. Pagination Footer */}
        <div className="bg-industrial-950 p-3 border-t border-industrial-800 flex flex-col sm:flex-row items-center justify-between text-xs text-industrial-400 gap-2">
          <div>
            Showing <strong className="text-white">{parts.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{' '}
            <strong className="text-white">{Math.min(page * pageSize, totalParts)}</strong> of{' '}
            <strong className="text-white">{totalParts.toLocaleString()}</strong> filtered parts
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              className="px-3 py-1 bg-industrial-800 hover:bg-industrial-700 disabled:opacity-40 disabled:hover:bg-industrial-800 text-white rounded border border-industrial-700 flex items-center space-x-1 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="font-mono text-industrial-300 px-2">
              Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              className="px-3 py-1 bg-industrial-800 hover:bg-industrial-700 disabled:opacity-40 disabled:hover:bg-industrial-800 text-white rounded border border-industrial-700 flex items-center space-x-1 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7. Part Detail & Risk Breakdown Modal */}
      {selectedPart && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-industrial-900 border-2 border-industrial-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-industrial-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-lg font-black text-white">{selectedPart.partNumber}</span>
                  {selectedPart.procurementStatus === 'CRITICAL_STOCKOUT' ? (
                    <span className="px-2 py-0.5 rounded bg-red-600 text-white text-xs font-black">
                      🚨 URGENT INDENT REQUIRED
                    </span>
                  ) : selectedPart.procurementStatus === 'REORDER_TRIGGERED' ? (
                    <span className="px-2 py-0.5 rounded bg-amber-600 text-black text-xs font-black">
                      ⚠️ REORDER POINT HIT
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-800 text-white text-xs font-bold">
                      ✅ {selectedPart.procurementStatus}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-industrial-200 mt-1">{selectedPart.description}</h3>
              </div>
              <button
                onClick={() => setSelectedPart(null)}
                className="p-1.5 text-industrial-400 hover:text-white hover:bg-industrial-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inventory Planning Parameters Card */}
            <div className="bg-industrial-950 p-4 rounded-xl border border-industrial-800 space-y-3">
              <div className="text-xs font-mono text-safety-cyan font-bold uppercase flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Assigned Inventory Parameters (NPE1 Consumption Formula)</span>
                </span>
                <span className="text-[11px] text-industrial-400 font-mono">UOM: {selectedPart.uom || 'EA'}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="bg-industrial-900 p-2.5 rounded-lg border border-industrial-800">
                  <div className="text-[10px] text-industrial-400">Current Stock</div>
                  <div className={`text-base font-black mt-0.5 ${
                    selectedPart.currentStock <= 0 ? 'text-red-400' : 'text-white'
                  }`}>
                    {selectedPart.currentStock ?? 0}
                  </div>
                  <div className="text-[9px] text-industrial-500">In SAP NPE1</div>
                </div>

                <div className="bg-industrial-900 p-2.5 rounded-lg border border-industrial-800">
                  <div className="text-[10px] text-industrial-400">Safety Stock (Min)</div>
                  <div className="text-base font-black text-amber-400 mt-0.5">
                    {selectedPart.safetyStock}
                  </div>
                  <div className="text-[9px] text-industrial-500">Min Buffer</div>
                </div>

                <div className="bg-industrial-900 p-2.5 rounded-lg border border-industrial-800">
                  <div className="text-[10px] text-industrial-400">Reorder Level (ROL)</div>
                  <div className="text-base font-black text-safety-cyan mt-0.5">
                    {selectedPart.reorderLevel}
                  </div>
                  <div className="text-[9px] text-industrial-500">Trigger Point</div>
                </div>

                <div className="bg-industrial-900 p-2.5 rounded-lg border border-industrial-800">
                  <div className="text-[10px] text-industrial-400">Reorder Qty (ROQ)</div>
                  <div className="text-base font-black text-emerald-400 mt-0.5">
                    {selectedPart.roq}
                  </div>
                  <div className="text-[9px] text-industrial-500">Batch Order</div>
                </div>

                <div className="bg-industrial-900 p-2.5 rounded-lg border border-industrial-800">
                  <div className="text-[10px] text-industrial-400">Maximum Stock</div>
                  <div className="text-base font-black text-industrial-200 mt-0.5">
                    {selectedPart.maxStock}
                  </div>
                  <div className="text-[9px] text-industrial-500">Ceiling Level</div>
                </div>
              </div>

              {/* Procurement Action Indication */}
              <div className="p-3 bg-industrial-900 rounded-lg text-xs border border-industrial-800 space-y-1">
                <div className="text-[10px] font-mono text-safety-cyan font-bold uppercase">
                  PROCUREMENT INDICATION & RECOMMENDATION
                </div>
                <div className="font-bold text-white text-sm">
                  {selectedPart.procurementAction}
                </div>
                {selectedPart.suggestedOrderQty > 0 && (
                  <div className="text-xs text-safety-cyan font-mono font-bold mt-1">
                    ➡️ Recommended Order Quantity: {selectedPart.suggestedOrderQty} {selectedPart.uom || 'EA'}
                  </div>
                )}
              </div>
            </div>

            {/* Consumption History Details from NPE1 history.xlsx */}
            <div className="bg-industrial-950 p-4 rounded-xl border border-industrial-800 space-y-2 text-xs">
              <div className="text-xs font-mono text-industrial-400 font-bold uppercase flex items-center justify-between">
                <span>32-Month Consumption Analytics (Apr 2024 – Nov 2026)</span>
                <span className="text-safety-cyan">{selectedPart.txCount || 0} issue transactions</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-industrial-900 p-2 rounded">
                  <div className="text-[10px] text-industrial-500">Total Consumed (32 Mo)</div>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedPart.totalConsumed32Mo || 0} {selectedPart.uom || 'EA'}</div>
                </div>
                <div className="bg-industrial-900 p-2 rounded">
                  <div className="text-[10px] text-industrial-500">Avg Monthly Usage</div>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedPart.avgMonthlyUsage || 0} {selectedPart.uom || 'EA'}/mo</div>
                </div>
                <div className="bg-industrial-900 p-2 rounded">
                  <div className="text-[10px] text-industrial-500">Peak Month Usage</div>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedPart.maxMonthlyUsage || 0} {selectedPart.uom || 'EA'}</div>
                </div>
              </div>
              {selectedPart.lastConsumedDate && (
                <div className="text-[11px] text-industrial-400 font-mono mt-1">
                  Last issued to production: <strong className="text-white">{selectedPart.lastConsumedDate}</strong>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPart(null)}
                className="px-4 py-2 bg-industrial-800 hover:bg-industrial-700 text-white rounded-lg text-xs font-semibold"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Tuning & Rules Slider Drawer */}
      {tuningOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-industrial-900 border-2 border-industrial-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-industrial-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-safety-cyan" />
                <h3 className="text-lg font-black text-white">Criticality Matrix Rules & Weights</h3>
              </div>
              <button
                onClick={() => setTuningOpen(false)}
                className="p-1 text-industrial-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyTuning} className="space-y-4 text-xs">
              <div className="space-y-3 bg-industrial-950 p-4 rounded-xl border border-industrial-800">
                <div className="font-bold text-white text-xs uppercase font-mono tracking-wider text-safety-cyan">
                  Scoring Weights (Sum = 1.0)
                </div>

                <div>
                  <div className="flex justify-between text-industrial-300 mb-1">
                    <span>Operational Impact Weight (VED):</span>
                    <span className="font-mono font-bold text-white">{(config.impactWeight * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.70"
                    step="0.05"
                    value={config.impactWeight}
                    onChange={(e) => setConfig({ ...config, impactWeight: parseFloat(e.target.value) })}
                    className="w-full accent-safety-cyan"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-industrial-300 mb-1">
                    <span>Lead Time Risk Weight (SDE):</span>
                    <span className="font-mono font-bold text-white">{(config.leadTimeWeight * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="0.60"
                    step="0.05"
                    value={config.leadTimeWeight}
                    onChange={(e) => setConfig({ ...config, leadTimeWeight: parseFloat(e.target.value) })}
                    className="w-full accent-safety-cyan"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-industrial-300 mb-1">
                    <span>Production Usage Weight:</span>
                    <span className="font-mono font-bold text-white">{(config.usageWeight * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.50"
                    step="0.05"
                    value={config.usageWeight}
                    onChange={(e) => setConfig({ ...config, usageWeight: parseFloat(e.target.value) })}
                    className="w-full accent-safety-cyan"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3 py-2 bg-industrial-800 hover:bg-industrial-700 text-industrial-300 rounded-lg text-xs"
                >
                  Reset to Defaults
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setTuningOpen(false)}
                    className="px-3 py-2 bg-industrial-800 hover:bg-industrial-700 text-industrial-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-safety-cyan hover:bg-cyan-400 text-industrial-950 font-black rounded-lg text-xs shadow-md transition"
                  >
                    Recalculate Spares
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
