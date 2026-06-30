import React, { useState, useEffect } from "react";
import { 
  Users, 
  Briefcase, 
  Search, 
  Phone, 
  MapPin, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  Clock
} from "lucide-react";
import { motion } from "motion/react";

interface Citizen {
  id: string;
  name: string;
  contact: string;
  latitude?: number;
  longitude?: number;
  reported_issue_text?: string;
  civic_impact_score?: number;
}

interface Worker {
  id: string;
  name: string;
  contact: string;
  department: string;
  availability: "Available" | "Busy";
  score?: number;
}

export default function DirectoriesList() {
  const [activeTab, setActiveTab] = useState<"citizens" | "workers">("citizens");
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [citRes, wkRes] = await Promise.all([
        fetch("/api/citizens"),
        fetch("/api/workers")
      ]);

      if (!citRes.ok || !wkRes.ok) {
        throw new Error("Failed to fetch directories from server.");
      }

      const citData = await citRes.json();
      const wkData = await wkRes.json();

      setCitizens(citData);
      setWorkers(wkData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Could not synchronize directory databases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCitizens = citizens.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.reported_issue_text && c.reported_issue_text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="directories-list-root">
      {/* Overview stats & action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">Personnel & Citizen Registry</h2>
          <p className="text-xs text-slate-500">Autonomous directory tracking registered civic profiles and municipal personnel databases.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer flex items-center justify-center"
            title="Refresh database records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === "citizens" ? "Search citizens by name, contact, report..." : "Search workers by name, contact, dept..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Segmented control tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl max-w-md">
        <button
          onClick={() => { setActiveTab("citizens"); setSearchQuery(""); }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "citizens"
              ? "bg-white text-slate-950 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4 text-indigo-500" />
          <span>Citizens Directory</span>
          <span className="bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {citizens.length}
          </span>
        </button>
        <button
          onClick={() => { setActiveTab("workers"); setSearchQuery(""); }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "workers"
              ? "bg-white text-slate-950 shadow-xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Briefcase className="w-4 h-4 text-emerald-500" />
          <span>Municipal Workers</span>
          <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
            {workers.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Directory Table Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-xs text-slate-500 font-medium">Synchronizing SQL records...</span>
          </div>
        ) : activeTab === "citizens" ? (
          <div>
            {filteredCitizens.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No citizen records found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  {searchQuery ? `No results match "${searchQuery}". Try altering your search terms.` : "No complaints have been processed to seed the citizen profiles directory yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="p-4 pl-6">Citizen Profile ID</th>
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Contact Number</th>
                      <th className="p-4">Civic Impact Score</th>
                      <th className="p-4">Report GPS Location</th>
                      <th className="p-4">Report Narrative</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredCitizens.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 font-mono text-[10px] text-slate-400 font-bold">{c.id}</td>
                        <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-[10px] uppercase">
                            {c.name.substring(0, 2)}
                          </div>
                          <span>{c.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-150 text-slate-700 font-medium flex items-center gap-1.5 w-fit">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.contact}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg text-[11px] inline-flex items-center gap-1 shadow-3xs animate-pulse" style={{ animationDuration: "5s" }}>
                            ⭐ {c.civic_impact_score || 0} pts
                          </span>
                        </td>
                        <td className="p-4">
                          {c.latitude && c.longitude ? (
                            <span className="font-mono text-slate-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-500" />
                              {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Not provided</span>
                          )}
                        </td>
                        <td className="p-4 max-w-sm">
                          <p className="truncate text-slate-600" title={c.reported_issue_text}>
                            {c.reported_issue_text || "No descriptive complaint record stored."}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {filteredWorkers.length === 0 ? (
              <div className="py-16 text-center">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No worker records found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  No workers match your filter or department selection.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="p-4 pl-6">Worker ID</th>
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Department Specialty</th>
                      <th className="p-4">Remediation Score</th>
                      <th className="p-4">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredWorkers.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 pl-6 font-mono text-[10px] text-slate-400 font-bold">{w.id}</td>
                        <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-[10px] uppercase">
                            {w.name.substring(0, 2)}
                          </div>
                          <span>{w.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-150 text-slate-700 font-medium flex items-center gap-1.5 w-fit">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {w.contact}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-800">{w.department}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg text-[11px] inline-flex items-center gap-1 shadow-3xs">
                            🛠️ {w.score || 0} pts
                          </span>
                        </td>
                        <td className="p-4">
                          {w.availability === "Available" ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              Available
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3 text-amber-500" />
                              Busy / Dispatched
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
