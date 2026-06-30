import React, { useState, useEffect } from "react";
import { Report } from "../types";
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  ShieldAlert, 
  Trash2, 
  ChevronRight, 
  Building, 
  Eye, 
  MapPin, 
  CheckSquare, 
  Terminal, 
  Calendar,
  AlertCircle,
  Play,
  User,
  Users,
  UserCheck,
  Building2,
  ExternalLink,
  Edit2,
  FileText,
  Download,
  CalendarDays,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
}

interface TriageDashboardProps {
  reports: Report[];
  onUpdateReport: (id: string, updatedFields: Partial<Report>) => Promise<void>;
  onDeleteReport: (id: string) => Promise<void>;
  acknowledgedAlertIds: string[];
  onToggleAcknowledgeAlert: (id: string) => void;
}

export default function TriageDashboard({ 
  reports, 
  onUpdateReport, 
  onDeleteReport,
  acknowledgedAlertIds = [],
  onToggleAcknowledgeAlert
}: TriageDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSeverity, setSelectedSeverity] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reports[0]?.id || null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<string, Record<number, boolean>>>({});

  // Editable fields state
  const [editCategory, setEditCategory] = useState("");
  const [editSeverity, setEditSeverity] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editHeadline, setEditHeadline] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editEstDays, setEditEstDays] = useState<number>(5);

  // Workers State for Municipal dispatch
  const [workers, setWorkers] = useState<any[]>([]);
  const [assignWorkerId, setAssignWorkerId] = useState("");
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerMessage, setWorkerMessage] = useState("");

  const fetchWorkers = async () => {
    try {
      const res = await fetch("/api/workers");
      if (res.ok) {
        const data = await res.json();
        setWorkers(data);
      }
    } catch (e) {
      console.error("Failed to load workers:", e);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, [selectedReportId]);

  const selectedReport = reports.find(r => r.id === selectedReportId);

  const nearbyReports = selectedReport && selectedReport.latitude && selectedReport.longitude
    ? reports.filter(r => {
        if (r.id === selectedReport.id) return false;
        if (!r.latitude || !r.longitude) return false;
        const dist = calculateDistance(selectedReport.latitude!, selectedReport.longitude!, r.latitude, r.longitude);
        return dist <= 1.5; // within 1.5 kilometers!
      })
    : [];

  const handleAssignWorker = async () => {
    if (!selectedReport || !assignWorkerId) return;
    setWorkerLoading(true);
    setWorkerMessage("");
    try {
      const res = await fetch(`/api/reports/${selectedReport.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: assignWorkerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to assign worker");
      }
      const updatedReport = await res.json();
      await onUpdateReport(selectedReport.id, { _fullReport: updatedReport } as any);
      setAssignWorkerId("");
      fetchWorkers();
    } catch (err: any) {
      setWorkerMessage(err.message || "Failed to dispatch worker");
      setTimeout(() => setWorkerMessage(""), 5000);
    } finally {
      setWorkerLoading(false);
    }
  };

  const handleResolveWorker = async () => {
    if (!selectedReport) return;
    setWorkerLoading(true);
    setWorkerMessage("");
    try {
      const res = await fetch(`/api/reports/${selectedReport.id}/resolve`, {
        method: "POST"
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to resolve ticket");
      }
      const updatedReport = await res.json();
      await onUpdateReport(selectedReport.id, { _fullReport: updatedReport } as any);
      fetchWorkers();
    } catch (err: any) {
      setWorkerMessage(err.message || "Failed to resolve ticket");
      setTimeout(() => setWorkerMessage(""), 5000);
    } finally {
      setWorkerLoading(false);
    }
  };

  // Filter logic
  const filteredReports = reports.filter((r) => {
    const matchesSearch = 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.headline.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = selectedCategory === "All" || r.category === selectedCategory;
    const matchesSeverity = selectedSeverity === "All" || r.severity === selectedSeverity;
    
    let matchesStatus = true;
    if (selectedStatus === "All") {
      matchesStatus = true;
    } else if (selectedStatus === "Active") {
      matchesStatus = r.status !== "Spam" && r.status !== "Resolved";
    } else {
      matchesStatus = r.status === selectedStatus;
    }

    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
  });

  const handleSelectReport = (report: Report) => {
    setSelectedReportId(report.id);
    setAdminNotes(report.notes || "");
    setIsEditingMetadata(false);

    // Smooth scroll to details panel on mobile/tablet
    setTimeout(() => {
      const detailPanel = document.getElementById("incident_detail_panel");
      if (detailPanel && window.innerWidth < 1024) {
        detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleUpdateStatus = async (status: Report["status"]) => {
    if (!selectedReport) return;
    if (status === "Resolved" && !selectedReport.assigned_worker_id) {
      setWorkerMessage("Cannot resolve ticket: You must assign and dispatch a field worker first.");
      setTimeout(() => setWorkerMessage(""), 5000);
      return;
    }
    await onUpdateReport(selectedReport.id, { status });
  };

  const handleSaveNotes = async () => {
    if (!selectedReport) return;
    await onUpdateReport(selectedReport.id, { notes: adminNotes });
  };

  const handleSaveMetadata = async () => {
    if (!selectedReport) return;
    await onUpdateReport(selectedReport.id, {
      category: editCategory as Report["category"],
      severity: editSeverity as Report["severity"],
      assigned_department: editDept,
      headline: editHeadline,
      actionable_summary: editSummary,
      estimated_completion_days: Number(editEstDays)
    });
    setIsEditingMetadata(false);
  };

  const startEditing = () => {
    if (!selectedReport) return;
    setEditCategory(selectedReport.category);
    setEditSeverity(selectedReport.severity);
    setEditDept(selectedReport.assigned_department);
    setEditHeadline(selectedReport.headline);
    setEditSummary(selectedReport.actionable_summary);
    setEditEstDays(selectedReport.estimated_completion_days ?? 5);
    setIsEditingMetadata(true);
  };

  const handleDownloadCSV = () => {
    const headers = [
      "ID",
      "Title",
      "Category",
      "Severity",
      "Status",
      "Address",
      "Latitude",
      "Longitude",
      "Estimated Completion (Days)",
      "Created At",
      "Assigned Department",
      "Immediate Action Required",
      "AI Headline",
      "AI Actionable Summary",
      "Notes"
    ];

    const rows = reports.map(r => [
      r.id,
      r.title,
      r.category,
      r.severity,
      r.status,
      r.address || "",
      r.latitude || "",
      r.longitude || "",
      r.estimated_completion_days ?? "",
      new Date(r.createdAt).toISOString(),
      r.assigned_department || "",
      r.requires_immediate_action ? "YES" : "NO",
      r.headline || "",
      r.actionable_summary || "",
      r.notes ?? ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(val => {
          const stringVal = String(val).replace(/"/g, '""');
          return stringVal.includes(",") || stringVal.includes("\n") || stringVal.includes('"') 
            ? `"${stringVal}"` 
            : stringVal;
        }).join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `municipal_reports_queue_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Static Map Thumbnail helper with high-quality styled fallback
  const MapThumbnail = ({ lat, lng, address }: { lat: number, lng: number, address?: string }) => {
    const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
    const hasKey = 
      Boolean(API_KEY) && 
      API_KEY.startsWith("AIzaSy") &&
      !API_KEY.includes("YOUR_") && 
      !API_KEY.includes("placeholder") &&
      API_KEY !== "YOUR_API_KEY" && 
      API_KEY.trim() !== "";

    const [mapError, setMapError] = useState(false);

    if (hasKey && !mapError) {
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=200x120&scale=2&markers=color:red%7C${lat},${lng}&key=${API_KEY}`;
      return (
        <div className="w-24 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 relative shadow-3xs group-hover:border-indigo-300 transition-all duration-150">
          <img 
            src={staticMapUrl} 
            alt={`Map of ${address || 'incident'}`}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setMapError(true)}
          />
          <div className="absolute bottom-1 right-1 bg-slate-950/75 text-[7px] text-white px-1 py-0.2 rounded font-mono font-bold tracking-tight scale-90">
            MAPS
          </div>
        </div>
      );
    }

    return (
      <div className="w-24 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden border border-slate-200/80 bg-slate-50 flex-shrink-0 relative flex flex-col items-center justify-center p-1 group-hover:border-indigo-200 transition-all duration-150 shadow-3xs">
        <div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#64748b_1px,transparent_1px),linear-gradient(to_bottom,#64748b_1px,transparent_1px)] bg-[size:8px_8px]" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <MapPin className="w-4 h-4 text-rose-500 fill-rose-100 animate-bounce" style={{ animationDuration: "3s" }} />
          <span className="text-[7.5px] font-mono font-bold text-slate-500 mt-0.5 leading-none">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
          <span className="text-[6px] text-slate-400 font-bold tracking-wide uppercase mt-0.5 leading-none">
            PIN VIEW
          </span>
        </div>
      </div>
    );
  };

  // Helper for category colors
  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case "Pothole": return "bg-orange-50 text-orange-700 border-orange-100";
      case "Water Leakage": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Waste Management": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Streetlight": return "bg-amber-50 text-amber-700 border-amber-100";
      case "Public Safety": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  // Helper for severity colors
  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case "Critical": return "bg-rose-50 text-rose-700 border border-rose-100 font-bold uppercase tracking-wider";
      case "Medium": return "bg-amber-50 text-amber-700 border border-amber-100 font-bold uppercase tracking-wider";
      case "Low": return "bg-slate-50 text-slate-600 border border-slate-150 font-semibold uppercase tracking-wider";
      default: return "bg-slate-100 text-slate-700 border border-slate-200 font-semibold uppercase tracking-wider";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Pending": return "bg-amber-50 text-amber-800 border-amber-200";
      case "In Progress": return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "Resolved": return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "Spam": return "bg-rose-50 text-rose-800 border-rose-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending": return <Clock className="w-3.5 h-3.5 text-amber-600" />;
      case "In Progress": return <Play className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />;
      case "Resolved": return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
      case "Spam": return <AlertCircle className="w-3.5 h-3.5 text-rose-600" />;
      default: return null;
    }
  };

  // Actionable summary list renderer
  const renderActionableSummary = (summaryText: string) => {
    if (!summaryText) return null;
    // Split by common items (bullets, periods, lists)
    const items = summaryText
      .split(/[\n•\-]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (items.length <= 1) {
      return (
        <div className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <CheckSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <span>{summaryText}</span>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
            <input 
              type="checkbox" 
              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-3.5 w-3.5" 
              id={`task_${idx}`}
            />
            <label htmlFor={`task_${idx}`} className="cursor-pointer">{item}</label>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* List Queue */}
      <div className="lg:col-span-7 flex flex-col gap-4">
        {/* Filters Bar */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Reports Feed Queue</h3>
                <p className="text-[10px] text-slate-400">Manage real-time incoming citizen reports</p>
              </div>
            </div>
            <button
              onClick={handleDownloadCSV}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer self-start sm:self-center animate-none"
              id="download_csv_btn"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV Queue
            </button>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports, AI headlines, keywords..."
              className="bg-transparent outline-none w-full text-xs text-slate-700 placeholder-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="search_input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
              <select
                className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded outline-none text-slate-700 focus:border-indigo-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                id="filter_category"
              >
                <option value="All">All Categories</option>
                <option value="Pothole">Pothole</option>
                <option value="Water Leakage">Water Leakage</option>
                <option value="Waste Management">Waste Management</option>
                <option value="Streetlight">Streetlight</option>
                <option value="Public Safety">Public Safety</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity</label>
              <select
                className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded outline-none text-slate-700 focus:border-indigo-500"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                id="filter_severity"
              >
                <option value="All">All Severities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</label>
              <select
                className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded outline-none text-slate-700 focus:border-indigo-500"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                id="filter_status"
              >
                <option value="All">All Feed (Show Everything)</option>
                <option value="Active">Active Queue (No Spam/Resolved)</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Spam">Flagged Spam</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Grid / List Queue */}
        <div className="flex-1 overflow-y-auto max-h-[600px] space-y-3 pr-1">
          {filteredReports.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[300px]">
              <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
              <h4 className="text-sm font-semibold text-slate-600">No Incidents Found</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                There are no reports matching your search parameters. Try adjusting the filter settings or register a new problem.
              </p>
            </div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                onClick={() => handleSelectReport(report)}
                className={`group border rounded-xl p-4 transition-all duration-150 cursor-pointer relative overflow-hidden ${
                  selectedReportId === report.id
                    ? "border-slate-300 bg-blue-50/35 border-l-4 border-l-blue-600 shadow-2xs"
                    : "border-slate-100 bg-white hover:bg-slate-50/60 hover:border-slate-200 hover:shadow-3xs"
                }`}
              >
                {report.requires_immediate_action && report.status !== "Resolved" && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 flex gap-3.5 items-start min-w-0">
                    {report.latitude && report.longitude && (
                      <MapThumbnail lat={report.latitude} lng={report.longitude} address={report.address} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(report.category)}`}>
                          {report.category}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSeverityBadgeClass(report.severity)}`}>
                          {report.severity}
                        </span>
                        {report.requires_immediate_action && report.status !== "Resolved" && (
                          <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Emergency
                          </span>
                        )}
                        {report.predictive_maintenance_alert && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                            Cluster Warning
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                        {report.title}
                      </h3>

                      {report.headline && (
                        <p className="text-xs text-slate-500 font-medium font-mono mt-1.5 flex items-center gap-1">
                          <Terminal className="w-3 h-3 text-slate-400" />
                          AI Headline: "{report.headline}"
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {report.address && (
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {report.address}
                          </span>
                        )}
                        <span className="flex items-center gap-1 truncate text-indigo-700/80 font-medium">
                          <Building className="w-3 h-3" />
                          {report.assigned_department}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between gap-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${getStatusBadgeClass(report.status)}`}>
                      {getStatusIcon(report.status)}
                      {report.status}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-1 ${
                      selectedReportId === report.id ? "text-indigo-500" : ""
                    }`} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Inspect Detail Panel */}
      <div id="incident_detail_panel" className="lg:col-span-5 scroll-mt-6">
        <AnimatePresence mode="wait">
          {selectedReport ? (
            <motion.div
              key={selectedReport.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col gap-6 h-full min-h-[500px]"
            >
              {/* Header */}
              <div>
                <div className="flex justify-between items-start gap-4 mb-2">
                  <span className="text-[10px] font-mono text-slate-400">ID: {selectedReport.id}</span>
                  <div className="flex gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${getStatusBadgeClass(selectedReport.status)}`}>
                      {getStatusIcon(selectedReport.status)}
                      {selectedReport.status}
                    </span>
                  </div>
                </div>

                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedReport.title}
                </h2>
                <span className="text-xs text-slate-400 block mt-1">
                  Registered: {new Date(selectedReport.createdAt).toLocaleString()}
                </span>
              </div>

              {/* Status Actions */}
              <div className="border-t border-b border-slate-100 py-3 grid grid-cols-4 gap-1 text-center">
                <button
                  onClick={() => handleUpdateStatus("Pending")}
                  className={`text-[10px] font-bold py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedReport.status === "Pending"
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-600"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => handleUpdateStatus("Assigned")}
                  className={`text-[10px] font-bold py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedReport.status === "Assigned"
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-600"
                  }`}
                >
                  Assigned
                </button>
                <button
                  onClick={() => handleUpdateStatus("Resolved")}
                  className={`text-[10px] font-bold py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedReport.status === "Resolved"
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-600"
                  }`}
                >
                  Resolved
                </button>
                <button
                  onClick={() => handleUpdateStatus("Spam")}
                  className={`text-[10px] font-bold py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    selectedReport.status === "Spam"
                      ? "bg-rose-600 border-rose-600 text-white"
                      : "bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-600"
                  }`}
                >
                  Spam
                </button>
              </div>

              {/* Main Content Scroll */}
              <div className="flex-1 space-y-5 overflow-y-auto max-h-[420px] pr-1">
                {/* Image if available */}
                {selectedReport.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 max-h-[160px] flex items-center justify-center relative">
                    <img 
                      src={selectedReport.imageUrl} 
                      alt="Civic issue photo" 
                      className="object-cover w-full h-full"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-xs text-[10px] text-white px-2 py-0.5 rounded font-mono">
                      Visual Reference
                    </div>
                  </div>
                )}

                {/* Submissions Details */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Citizen Narrative
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100/75 whitespace-pre-line">
                    {selectedReport.description}
                  </p>
                  {selectedReport.imageDescription && (
                    <div className="mt-2 text-[11px] text-slate-500 font-medium italic flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span>AI Image Analysis context: "{selectedReport.imageDescription}"</span>
                    </div>
                  )}
                </div>

                {/* Citizen Profile Details */}
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" /> Citizen Submitter Profile
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Full Name</span>
                      <span className="text-slate-800 font-bold">{selectedReport.citizen_name || "Anonymous Submitter"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Contact Number</span>
                      <span className="text-slate-800 font-semibold">{selectedReport.citizen_contact || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Community Vouching & Escalation */}
                <div className="bg-indigo-50/45 border border-indigo-100/80 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> Community Vouching & Escalation
                    </h4>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-lg border border-indigo-200">
                      Priority: {selectedReport.priority_score || 1} pts
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 bg-white/85 p-3 rounded-xl border border-indigo-100/50 shadow-3xs">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 font-medium">Are you also affected by this issue?</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Vouching increases priority score by +10. Total vouches: <strong className="text-indigo-600 font-bold">{selectedReport.vouch_count || 0}</strong></p>
                    </div>
                    
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/reports/${selectedReport.id}/vouch`, { method: "POST" });
                          if (res.ok) {
                            const updated = await res.json();
                            await onUpdateReport(selectedReport.id, updated);
                          }
                        } catch (err) {
                          console.error("Vouch failed:", err);
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs py-1.5 px-4 rounded-xl transition-all shadow-3xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      👍 Vouch
                    </button>
                  </div>

                  {/* Co-located / Nearby duplicate prevention group */}
                  {nearbyReports.length > 0 && (
                    <div className="pt-2 border-t border-indigo-100/50 space-y-2">
                      <span className="text-[9px] font-mono text-indigo-700 font-bold uppercase tracking-wider block">📍 Grouped Nearby Reports ({nearbyReports.length})</span>
                      <div className="space-y-2 max-h-[150px] overflow-y-auto pr-0.5">
                        {nearbyReports.map(nr => (
                          <div key={nr.id} className="bg-white/70 border border-indigo-100/30 rounded-xl p-2.5 flex justify-between items-center gap-3">
                            <div className="min-w-0 text-left">
                              <h5 className="font-bold text-[11px] text-slate-800 truncate" title={nr.title}>{nr.title}</h5>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                {nr.category} • {calculateDistance(selectedReport.latitude!, selectedReport.longitude!, nr.latitude!, nr.longitude!).toFixed(2)} km away
                              </p>
                            </div>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const res = await fetch(`/api/reports/${nr.id}/vouch`, { method: "POST" });
                                  if (res.ok) {
                                    const updated = await res.json();
                                    await onUpdateReport(nr.id, updated);
                                  }
                                } catch (err) {
                                  console.error("Failed to vouch:", err);
                                }
                              }}
                              className="bg-slate-100 hover:bg-indigo-50 text-indigo-700 font-bold text-[9px] px-2 py-1 rounded-md transition-colors flex items-center gap-0.5 shrink-0 border border-indigo-150/50 cursor-pointer"
                            >
                              👍 Vouch ({nr.vouch_count || 0})
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Worker Assignment & Database Workflow */}
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" /> Municipal Worker Dispatch
                    </h4>
                    {selectedReport.assigned_worker_id ? (
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wide">
                        Worker Dispatched
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-100 uppercase tracking-wide">
                        Awaiting Worker
                      </span>
                    )}
                  </div>

                  {selectedReport.assigned_worker_id ? (
                    // Worker is Assigned: Show details & Resolve action
                    <div className="space-y-3">
                      {(() => {
                        const assignedWorker = workers.find(w => w.id === selectedReport.assigned_worker_id);
                        return (
                          <div className="bg-white border border-slate-100 p-3 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <div>
                                <span className="text-slate-400 text-[9px] uppercase font-bold block">Assigned Staff</span>
                                <span className="font-bold text-slate-800">{assignedWorker ? assignedWorker.name : `Worker ${selectedReport.assigned_worker_id}`}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 text-[9px] uppercase font-bold block">Department Category</span>
                                <span className="font-semibold text-slate-700">{assignedWorker ? assignedWorker.department : "Public Works"}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-50">
                              <div>
                                <span className="text-slate-400 text-[9px] uppercase font-bold block">Worker Contact</span>
                                <span className="font-mono text-slate-600">{assignedWorker ? assignedWorker.contact : "N/A"}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-400 text-[9px] uppercase font-bold block">Worker Status</span>
                                <span className="font-bold text-indigo-600 flex items-center gap-1 mt-0.5 justify-end">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
                                  On-Site / Active
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {selectedReport.task_checklist && (
                        <div className="bg-slate-950 text-slate-100 rounded-xl p-3 text-xs font-sans border border-slate-800/80 space-y-2 shadow-sm">
                          <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider block">📋 AI-Generated Worker Safety Checklist</span>
                          <div className="space-y-1.5 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                            {selectedReport.task_checklist.split('\n').map((line, lidx) => {
                              const cleanLine = line.replace(/^\s*[-*]\s*(\[\s*[xX ]\s*\])?\s*/, '').replace(/^\s*\d+\.\s*/, '');
                              if (!cleanLine.trim()) return null;
                              
                              const isChecked = Boolean(completedTasks[selectedReport.id]?.[lidx]);
                              
                              return (
                                <label
                                  key={lidx}
                                  className="flex items-center gap-2.5 text-[11px] cursor-pointer hover:bg-slate-900/60 p-1 rounded transition-colors group select-none text-left w-full"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setCompletedTasks((prev) => {
                                        const reportTasks = prev[selectedReport.id] || {};
                                        return {
                                          ...prev,
                                          [selectedReport.id]: {
                                            ...reportTasks,
                                            [lidx]: !reportTasks[lidx]
                                          }
                                        };
                                      });
                                    }}
                                    className="rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950 w-3.5 h-3.5 cursor-pointer accent-indigo-500"
                                  />
                                  <span className={`transition-all ${isChecked ? "text-slate-500 line-through decoration-indigo-500/50" : "text-slate-200 group-hover:text-white"}`}>
                                    {cleanLine}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {selectedReport.status !== "Resolved" && (
                        <button
                          onClick={handleResolveWorker}
                          disabled={workerLoading}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer disabled:opacity-50"
                        >
                          {workerLoading ? "Marking Resolved..." : "Mark as Resolved by Worker & Release"}
                        </button>
                      )}
                    </div>
                  ) : (
                    // No Worker Assigned: Show dropdown & Assign action
                    <div className="space-y-3 bg-white p-3 rounded-lg border border-slate-100">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select Field Worker to Dispatch</label>
                          <span className="text-[8px] text-indigo-600 font-mono font-bold uppercase">Sorted by Proximity</span>
                        </div>
                        <select
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-medium text-slate-700"
                          value={assignWorkerId}
                          onChange={(e) => setAssignWorkerId(e.target.value)}
                        >
                          <option value="">-- Choose nearest worker --</option>
                          {(() => {
                            // Calculate distance for each worker to selected report
                            const workersWithDistance = workers.map(w => {
                              if (selectedReport && selectedReport.latitude && selectedReport.longitude && w.latitude && w.longitude) {
                                const distance = calculateDistance(
                                  selectedReport.latitude,
                                  selectedReport.longitude,
                                  w.latitude,
                                  w.longitude
                                );
                                return { ...w, distance };
                              }
                              return { ...w, distance: Infinity };
                            });

                            // Sort available workers first, then sort by distance
                            const sorted = [...workersWithDistance].sort((a, b) => {
                              if (a.availability === "Available" && b.availability !== "Available") return -1;
                              if (a.availability !== "Available" && b.availability === "Available") return 1;
                              return a.distance - b.distance;
                            });

                            return sorted.map((w) => {
                              // Highlight workers matching category department
                              const categoryClean = selectedReport.category.toLowerCase();
                              const deptClean = w.department.toLowerCase();
                              const isRecommended = 
                                (categoryClean.includes("pothole") && deptClean.includes("pothole")) ||
                                (categoryClean.includes("water") && deptClean.includes("water")) ||
                                (categoryClean.includes("waste") && deptClean.includes("waste")) ||
                                (categoryClean.includes("streetlight") && deptClean.includes("streetlight")) ||
                                (categoryClean.includes("safety") && deptClean.includes("safety"));
                              
                              const distText = w.distance !== Infinity ? `(${w.distance.toFixed(1)} km away)` : "";
                              
                              return (
                                <option key={w.id} value={w.id} disabled={w.availability !== "Available"}>
                                  {w.name} ({w.department}) — {distText} [{w.availability}]{isRecommended ? " ★ Recommended" : ""}
                                </option>
                              );
                            });
                          })()}
                        </select>
                      </div>

                      <button
                        onClick={handleAssignWorker}
                        disabled={!assignWorkerId || workerLoading}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer"
                      >
                        {workerLoading ? "Dispatching..." : "Assign & Dispatch Worker"}
                      </button>
                    </div>
                  )}

                  {workerMessage && (
                    <p className="text-[10px] font-semibold text-rose-600 text-center animate-pulse">{workerMessage}</p>
                  )}
                </div>

                {/* Metadata Settings / AI Analysis */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Terminal className="w-3.5 h-3.5" /> AI Agent Triage Metadata
                    </h4>
                    {!isEditingMetadata ? (
                      <button 
                        onClick={startEditing}
                        className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" /> Override
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsEditingMetadata(false)}
                          className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleSaveMetadata}
                          className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingMetadata ? (
                    <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/20 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Category</label>
                          <select 
                            className="w-full text-xs p-1 bg-white border border-slate-200 rounded outline-none"
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                          >
                            <option value="Pothole">Pothole</option>
                            <option value="Water Leakage">Water Leakage</option>
                            <option value="Waste Management">Waste Management</option>
                            <option value="Streetlight">Streetlight</option>
                            <option value="Public Safety">Public Safety</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Severity</label>
                          <select 
                            className="w-full text-xs p-1 bg-white border border-slate-200 rounded outline-none"
                            value={editSeverity}
                            onChange={(e) => setEditSeverity(e.target.value)}
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Assigned Department</label>
                        <input 
                          type="text" 
                          className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded outline-none"
                          value={editDept}
                          onChange={(e) => setEditDept(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Estimated Completion Time (Days)</label>
                        <input 
                          type="number" 
                          min={0}
                          max={365}
                          className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded outline-none"
                          value={editEstDays}
                          onChange={(e) => setEditEstDays(Number(e.target.value))}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">AI Headline</label>
                        <input 
                          type="text" 
                          className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded outline-none font-mono"
                          value={editHeadline}
                          onChange={(e) => setEditHeadline(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Actionable Tasks</label>
                        <textarea 
                          rows={2}
                          className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded outline-none resize-none"
                          value={editSummary}
                          onChange={(e) => setEditSummary(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3.5">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">VERIFIED HEADLINE</span>
                          <strong className="text-slate-800 font-mono text-[11px] leading-snug">{selectedReport.headline}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">ROUTE RECOMMENDATION</span>
                          <strong className="text-indigo-800 flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 flex-shrink-0" />
                            {selectedReport.assigned_department}
                          </strong>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-100/50">
                        <div>
                          <span className="text-slate-400 block text-[10px]">ESTIMATED RESOLUTION</span>
                          <span className="text-slate-700 font-semibold flex items-center gap-1 mt-0.5">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            {selectedReport.estimated_completion_days !== undefined
                              ? selectedReport.estimated_completion_days === 0
                                ? "Immediate / Unresolvable"
                                : `${selectedReport.estimated_completion_days} ${selectedReport.estimated_completion_days === 1 ? 'day' : 'days'}`
                              : "TBD"}
                          </span>
                        </div>
                      </div>

                      {/* Hazard Flags & Acknowledge Control */}
                      {selectedReport.requires_immediate_action && selectedReport.status !== "Resolved" && (
                        <div className="p-3 bg-red-50/80 border border-red-100 rounded-xl space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-red-700 font-semibold text-[10px]">
                              <ShieldAlert className="w-4 h-4 text-red-600 flex-shrink-0 animate-pulse" />
                              <span>CRITICAL SAFETY THREAT: REQUIRES IMMEDIATE EMERGENCY DISPATCH</span>
                            </div>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              acknowledgedAlertIds.includes(selectedReport.id)
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800 animate-pulse"
                            }`}>
                              {acknowledgedAlertIds.includes(selectedReport.id) ? "Acknowledged" : "Active Alert"}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center bg-white/70 px-2.5 py-1.5 rounded-lg border border-red-100/40">
                            <span className="text-[10px] text-slate-500">Dismiss persistent banner alert for this incident?</span>
                            <button
                              onClick={() => onToggleAcknowledgeAlert && onToggleAcknowledgeAlert(selectedReport.id)}
                              className={`text-[9px] font-bold px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                                acknowledgedAlertIds.includes(selectedReport.id)
                                  ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                  : "bg-red-600 hover:bg-red-700 text-white shadow-3xs"
                              }`}
                            >
                               {acknowledgedAlertIds.includes(selectedReport.id) ? "Re-activate Alert" : "Acknowledge Alert"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Predictive Clustering warning banner */}
                      {selectedReport.predictive_maintenance_alert && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                          <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[10px] tracking-wide uppercase">
                            <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                            <span>Predictive Clustering Warning</span>
                          </div>
                          <p className="text-xs text-amber-900 font-medium leading-relaxed">
                            {selectedReport.predictive_maintenance_alert}
                          </p>
                        </div>
                      )}

                      {/* Actionable Summary Tasks list */}
                      <div>
                        <span className="text-slate-400 block text-[10px] mb-1.5 uppercase font-semibold">Actionable Task Breakdown</span>
                        {renderActionableSummary(selectedReport.actionable_summary)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Raw JSON Code Block */}
                <div>
                  <details className="group border border-slate-100 rounded-xl overflow-hidden bg-slate-50">
                    <summary className="text-[10px] font-bold text-slate-400 uppercase tracking-wider p-3 cursor-pointer select-none hover:bg-slate-100/55 flex justify-between items-center transition-colors">
                      <span className="flex items-center gap-1"><Terminal className="w-3.5 h-3.5" /> RAW TRIAGE JSON SCHEMATICS</span>
                      <span className="text-indigo-600 text-[9px] font-semibold group-open:hidden">VIEW SCHEMATICS</span>
                      <span className="text-indigo-600 text-[9px] font-semibold hidden group-open:block">HIDE SCHEMATICS</span>
                    </summary>
                    <div className="bg-slate-900 text-emerald-400 text-[10px] font-mono p-4 border-t border-slate-800 overflow-x-auto max-h-[220px]">
                      <pre>{JSON.stringify({
                        is_valid: selectedReport.is_valid,
                        category: selectedReport.category,
                        severity: selectedReport.severity,
                        headline: selectedReport.headline,
                        actionable_summary: selectedReport.actionable_summary,
                        assigned_department: selectedReport.assigned_department,
                        requires_immediate_action: selectedReport.requires_immediate_action
                      }, null, 2)}</pre>
                    </div>
                  </details>
                </div>

                {/* Admin Notes */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Internal Dispatches & Status Logs
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add dispatcher updates or progress details..."
                      className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50/30"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      id="admin_notes_input"
                    />
                    <button
                      onClick={handleSaveNotes}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-950 text-white text-xs font-semibold cursor-pointer transition-colors flex-shrink-0"
                    >
                      Log Update
                    </button>
                  </div>
                </div>

                {/* Submission & Triage Timeline */}
                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Incident History Audit Log</h4>
                  <div className="space-y-2 font-mono text-[10px]">
                    {selectedReport.logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 bg-slate-50/60 p-2 rounded-lg border border-slate-100/40 text-slate-600">
                        <span className="text-slate-400 shrink-0">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <div className="flex-1">
                          <strong className="text-slate-800 text-[11px] font-semibold">{log.step}:</strong> {log.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Delete Panel */}
              <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                <button
                  onClick={() => onDeleteReport(selectedReport.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  id="delete_report_button"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Incident File
                </button>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Auto-routed</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center text-slate-400 h-full min-h-[500px]">
              <Eye className="w-12 h-12 text-slate-200 mb-2" />
              <h4 className="text-sm font-semibold text-slate-600">No Incident File Selected</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Select an reported incident ticket from the left queue to open the detailed AI analysis file, inspection records, and admin control boards.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
