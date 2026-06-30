import React, { useState, useEffect, useRef } from "react";
import { 
  MapPin, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  Navigation,
  ExternalLink,
  ThumbsUp,
  Search,
  Filter,
  Eye,
  Settings,
  HelpCircle,
  TrendingUp,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Report } from "../types";

// Import Google Maps elements dynamically, but handle errors gracefully if package is not present
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow,
  useMap 
} from "@vis.gl/react-google-maps";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

// Standard Google Maps API keys are 39 chars and start with "AIzaSy"
const isKeyFormatValid = (key: string) => {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.startsWith("AIzaSy") && trimmed.length >= 35 && !trimmed.includes("YOUR") && !trimmed.includes("placeholder");
};

interface MapExplorerProps {
  reports: Report[];
  onVouch?: (reportId: string) => void;
  onSelectReportInApp?: (report: Report) => void;
}

export default function MapExplorer({ reports, onVouch, onSelectReportInApp }: MapExplorerProps) {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 37.7749, lng: -122.4194 }); // default to generic center
  const [mapZoom, setMapZoom] = useState(13);
  const [showKeyInstructions, setShowKeyInstructions] = useState(false);
  const [vouchingIds, setVouchingIds] = useState<string[]>([]);
  const [mapAuthFailed, setMapAuthFailed] = useState(false);

  // Fallback to beautiful simulator if key is physically invalid or auth fails at runtime
  const isMapActive = isKeyFormatValid(API_KEY) && !mapAuthFailed;

  // Global listener for Google Maps auth failures (like InvalidKeyMapError)
  useEffect(() => {
    const originalAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps JavaScript API authentication failed - switching to radar sandbox fallback.");
      setMapAuthFailed(true);
      if (originalAuthFailure) {
        try { originalAuthFailure(); } catch (e) {}
      }
    };
    return () => {
      (window as any).gm_authFailure = originalAuthFailure;
    };
  }, []);

  // Filter reports that have valid coordinates
  const mappedReports = reports.filter(r => r.latitude !== undefined && r.longitude !== undefined);

  // Apply filters
  const filteredMappedReports = mappedReports.filter(r => {
    const matchesCategory = filterCategory === "all" || r.category === filterCategory;
    const matchesStatus = filterStatus === "all" || r.status === filterStatus;
    const matchesSearch = searchQuery === "" || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Calculate default map center based on reports if any exist
  useEffect(() => {
    if (filteredMappedReports.length > 0) {
      const avgLat = filteredMappedReports.reduce((sum, r) => sum + (r.latitude || 0), 0) / filteredMappedReports.length;
      const avgLng = filteredMappedReports.reduce((sum, r) => sum + (r.longitude || 0), 0) / filteredMappedReports.length;
      setMapCenter({ lat: avgLat, lng: avgLng });
    }
  }, [reports]);

  // Handle zooming to a specific report
  const handleZoomToReport = (report: Report) => {
    if (report.latitude && report.longitude) {
      setMapCenter({ lat: report.latitude, lng: report.longitude });
      setMapZoom(16);
      setSelectedReport(report);
    }
  };

  const handleLocalVouch = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (vouchingIds.includes(reportId)) return;
    setVouchingIds(prev => [...prev, reportId]);

    try {
      const res = await fetch(`/api/reports/${reportId}/vouch`, {
        method: "POST"
      });
      if (res.ok) {
        if (onVouch) onVouch(reportId);
        // Alert successful vouching
        const updated = await res.json();
        // Update selectedReport state if currently active
        if (selectedReport && selectedReport.id === reportId) {
          setSelectedReport(prev => prev ? { ...prev, vouch_count: updated.vouch_count } : null);
        }
      }
    } catch (err) {
      console.error("Vouch failed", err);
    } finally {
      setVouchingIds(prev => prev.filter(id => id !== reportId));
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "bg-rose-100 text-rose-800 border-rose-200";
      case "Medium": return "bg-amber-100 text-amber-800 border-amber-200";
      default: return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending": return "bg-amber-50 text-amber-800 border-amber-200";
      case "Assigned": return "bg-blue-50 text-blue-800 border-blue-200";
      case "Resolved": return "bg-emerald-50 text-emerald-850 border-emerald-250";
      default: return "bg-rose-50 text-rose-800 border-rose-200";
    }
  };

  const getPinColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "#f43f5e"; // rose-500
      case "Medium": return "#f59e0b"; // amber-500
      default: return "#10b981"; // emerald-500
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col md:grid md:grid-cols-12 md:h-[650px]" id="map-explorer-panel">
      {/* Sidebar List and Filters (4 Cols) */}
      <div className="col-span-4 border-r border-slate-100 flex flex-col h-[350px] md:h-full">
        {/* Header and Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="font-extrabold text-sm text-slate-850">Neighborhood Map</h3>
            </div>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold font-mono">
              {filteredMappedReports.length} pins
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports on map..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-medium text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Quick Category & Status Selectors */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1 text-[10px] font-bold text-slate-700 cursor-pointer focus:outline-hidden"
              >
                <option value="all">All Items</option>
                <option value="Pothole">Potholes</option>
                <option value="Water Leakage">Water Leaks</option>
                <option value="Waste Management">Waste</option>
                <option value="Streetlight">Streetlights</option>
                <option value="Public Safety">Safety</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-1 text-[10px] font-bold text-slate-700 cursor-pointer focus:outline-hidden"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredMappedReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 h-full">
              <MapPin className="w-8 h-8 text-slate-300 stroke-1" />
              <span>No geotagged reports match filters.</span>
            </div>
          ) : (
            filteredMappedReports.map((report) => (
              <button
                key={report.id}
                onClick={() => handleZoomToReport(report)}
                className={`w-full text-left p-3.5 transition-colors block cursor-pointer border-l-3 ${
                  selectedReport?.id === report.id
                    ? "bg-blue-50/50 border-blue-600"
                    : "hover:bg-slate-50/50 border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-150 font-bold tracking-tight uppercase">
                    {report.category}
                  </span>
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${getSeverityColor(report.severity)}`}>
                    {report.severity}
                  </span>
                </div>

                <h4 className="font-extrabold text-xs text-slate-800 mt-1.5 truncate">
                  {report.title}
                </h4>

                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {report.address || "Local coordinates geotagged"}
                </p>

                <div className="flex items-center justify-between mt-2.5">
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getStatusBadge(report.status)}`}>
                    {report.status}
                  </span>
                  
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <ThumbsUp className="w-3 h-3 text-slate-400" />
                    <span>{report.vouch_count || 0} vouches</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Map Box (8 Cols) */}
      <div className="col-span-8 relative bg-slate-100 h-[300px] md:h-full flex flex-col overflow-hidden">
        {isMapActive ? (
          <APIProvider apiKey={API_KEY} version="weekly">
            <div className="w-full h-full relative" id="google-maps-canvas-container">
              <Map
                center={mapCenter}
                zoom={mapZoom}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                style={{ width: "100%", height: "100%" }}
                onCameraChanged={(ev) => {
                  setMapZoom(ev.detail.zoom);
                }}
              >
                {filteredMappedReports.map((report) => (
                  <AdvancedMarker
                    key={report.id}
                    position={{ lat: report.latitude || 0, lng: report.longitude || 0 }}
                    onClick={() => setSelectedReport(report)}
                    title={report.title}
                  >
                    <Pin 
                      background={getPinColor(report.severity)} 
                      glyphColor="#fff" 
                      borderColor="#ffffff"
                    />
                  </AdvancedMarker>
                ))}

                {selectedReport && selectedReport.latitude && selectedReport.longitude && (
                  <InfoWindow
                    position={{ lat: selectedReport.latitude, lng: selectedReport.longitude }}
                    onCloseClick={() => setSelectedReport(null)}
                  >
                    <div className="p-1 max-w-xs space-y-2 text-slate-800 font-sans" id={`info-window-${selectedReport.id}`}>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-bold uppercase tracking-tight">
                            {selectedReport.category}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded border ${getSeverityColor(selectedReport.severity)}`}>
                            {selectedReport.severity}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-xs text-slate-900 mt-1 leading-snug">
                          {selectedReport.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">
                          {selectedReport.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                        <button
                          onClick={(e) => handleLocalVouch(selectedReport.id, e)}
                          disabled={vouchingIds.includes(selectedReport.id)}
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[9px] font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <ThumbsUp className="w-2.5 h-2.5" />
                          {vouchingIds.includes(selectedReport.id) ? "..." : `Vouch (${selectedReport.vouch_count || 0})`}
                        </button>

                        {onSelectReportInApp && (
                          <button
                            onClick={() => onSelectReportInApp(selectedReport)}
                            className="text-blue-600 hover:underline text-[9px] font-extrabold flex items-center gap-0.5 cursor-pointer"
                          >
                            Inspect <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Map>
            </div>
          </APIProvider>
        ) : (
          /* SVG/Canvas Sandbox Map Simulator and Setup Splash */
          <div className="w-full h-full relative bg-slate-900 text-white p-6 flex flex-col justify-between overflow-hidden">
            {/* Background grid grid */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            
            {/* Radar ring effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-slate-700/30 rounded-full animate-pulse"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-slate-700/20 rounded-full"></div>

            {/* Simulated Interactive Pins */}
            <div className="absolute inset-0 z-10">
              {filteredMappedReports.map((report, idx) => {
                // Map coordinates roughly onto a stable position on screen
                const seededX = 15 + ((report.longitude || 0) * 100000 % 70);
                const seededY = 15 + ((report.latitude || 0) * 100000 % 70);
                const isSelected = selectedReport?.id === report.id;

                return (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    style={{ left: `${seededX}%`, top: `${seededY}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-all duration-200"
                  >
                    <div className={`p-1.5 rounded-full shadow-lg border relative flex items-center justify-center transition-all ${
                      isSelected 
                        ? "bg-blue-600 border-white scale-125 z-30 ring-4 ring-blue-500/30" 
                        : "bg-slate-800 hover:bg-slate-700 border-slate-600 scale-100 hover:scale-110 z-20"
                    }`}>
                      <MapPin className={`w-3.5 h-3.5`} style={{ color: getPinColor(report.severity) }} />
                    </div>
                    
                    {/* Tiny badge */}
                    <span className="opacity-0 group-hover:opacity-100 bg-slate-950 text-white text-[9px] font-bold px-2 py-0.5 rounded border border-slate-800 shadow-xl mt-1.5 pointer-events-none transition-opacity whitespace-nowrap">
                      {report.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Simulation Header */}
            <div className="relative z-20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                <span className="text-[9px] bg-slate-800/80 text-slate-300 font-extrabold uppercase px-2 py-0.5 rounded border border-slate-700 tracking-wider">
                  Civic-Sandbox Radar Simulator
                </span>
              </div>
              
              <button
                onClick={() => setShowKeyInstructions(true)}
                className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-950 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs border border-slate-200"
              >
                <Settings className="w-3.5 h-3.5 text-slate-700" />
                Configure Google Maps
              </button>
            </div>

            {/* Bottom Panel Info overlay */}
            <div className="relative z-20 self-center max-w-sm w-full bg-slate-950/95 border border-slate-800 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
              <AnimatePresence mode="wait">
                {selectedReport ? (
                  <motion.div 
                    key={selectedReport.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 font-extrabold uppercase">
                        {selectedReport.category}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.2 rounded border ${getSeverityColor(selectedReport.severity)}`}>
                        {selectedReport.severity}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-xs text-white leading-snug">{selectedReport.title}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{selectedReport.description}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        onClick={(e) => handleLocalVouch(selectedReport.id, e)}
                        disabled={vouchingIds.includes(selectedReport.id)}
                        className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-900 text-indigo-300 text-[9px] font-bold rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ThumbsUp className="w-2.5 h-2.5" />
                        {vouchingIds.includes(selectedReport.id) ? "..." : `Vouch (${selectedReport.vouch_count || 0})`}
                      </button>

                      {onSelectReportInApp && (
                        <button
                          onClick={() => onSelectReportInApp(selectedReport)}
                          className="text-indigo-400 hover:underline text-[9px] font-extrabold flex items-center gap-0.5 cursor-pointer"
                        >
                          Inspect Details <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center py-2 space-y-1">
                    <HelpCircle className="w-6 h-6 text-indigo-400 mx-auto animate-bounce" style={{ animationDuration: '4s' }} />
                    <h4 className="font-bold text-xs text-white">Interactive Sandbox Active</h4>
                    <p className="text-[10px] text-slate-400">
                      Click any sidebar ticket or scatter point on the screen to view details.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Floating Google Maps configuration drawer overlay if instructions clicked */}
        <AnimatePresence>
          {showKeyInstructions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 p-6 flex flex-col justify-center items-center text-white text-center"
            >
              <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl relative">
                <button
                  onClick={() => setShowKeyInstructions(false)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  ✕
                </button>

                <div className="w-12 h-12 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 mx-auto mb-4">
                  <Navigation className="w-6 h-6 animate-pulse" />
                </div>

                <h3 className="font-extrabold text-base mb-1 text-slate-100">Activate High-Fidelity Google Maps</h3>
                <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                  Connect your Google Maps Platform key to unlock the dynamic map.
                </p>

                <div className="space-y-4 text-left bg-slate-950 p-4 rounded-xl border border-slate-850/80">
                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 border border-blue-700/50 text-[10px] font-bold flex items-center justify-center text-blue-300 shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <a 
                        href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline inline-flex items-center gap-0.5 font-bold"
                      >
                        Get an API Key <ExternalLink className="w-3 h-3" />
                      </a> from Google Cloud Platform.
                    </p>
                  </div>

                  <div className="flex gap-2.5 items-start">
                    <span className="w-5 h-5 rounded-full bg-blue-900 border border-blue-700/50 text-[10px] font-bold flex items-center justify-center text-blue-300 shrink-0 mt-0.5">2</span>
                    <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
                      <span>Add your key as an environment variable:</span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px] mt-1">
                        <li>Click <strong>Settings</strong> (⚙️ gear icon, top-right of your workspace).</li>
                        <li>Select <strong>Secrets</strong>.</li>
                        <li>Type <code className="text-slate-200 bg-slate-900 border border-slate-850 px-1 py-0.2 rounded font-mono font-bold">GOOGLE_MAPS_PLATFORM_KEY</code> as the name, press <strong>Enter</strong>.</li>
                        <li>Paste your API key value, press <strong>Enter</strong>.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 mt-4 italic">
                  The application compiles and hot-reloads automatically after saving your secret.
                </p>

                <button
                  onClick={() => setShowKeyInstructions(false)}
                  className="mt-6 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors shadow-sm"
                >
                  Continue in Sandbox Mode
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
