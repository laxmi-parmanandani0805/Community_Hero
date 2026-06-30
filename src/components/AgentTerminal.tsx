import React, { useState } from "react";
import { Report } from "../types";
import { 
  Terminal, 
  Cpu, 
  Play, 
  Info, 
  Settings, 
  Check, 
  AlertTriangle, 
  Building,
  RefreshCw,
  BarChart2,
  PieChart,
  Activity
} from "lucide-react";

interface AgentTerminalProps {
  reports: Report[];
}

export default function AgentTerminal({ reports }: AgentTerminalProps) {
  const [sandboxText, setSandboxText] = useState("");
  const [sandboxTitle, setSandboxTitle] = useState("");
  const [sandboxResult, setSandboxResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTestSandbox = async () => {
    if (!sandboxTitle || !sandboxText) {
      setError("Please provide both a title and details for testing.");
      return;
    }
    setError("");
    setSandboxResult(null);
    setLoading(true);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sandboxTitle,
          description: sandboxText,
        }),
      });

      if (!res.ok) throw new Error("Sandbox Triage API error");
      const data = await res.json();
      setSandboxResult(data);
    } catch (err) {
      setError("Failed to run sandbox triage. Ensure GEMINI_API_KEY is configured.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPreset = (title: string, desc: string) => {
    setSandboxTitle(title);
    setSandboxText(desc);
  };

  // Compute stats
  const totalReports = reports.length;
  const validReports = reports.filter(r => r.is_valid).length;
  const spamReports = reports.filter(r => !r.is_valid).length;

  const categoryCounts = reports.reduce((acc, r) => {
    if (r.is_valid) {
      acc[r.category] = (acc[r.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const severityCounts = reports.reduce((acc, r) => {
    if (r.is_valid) {
      acc[r.severity] = (acc[r.severity] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const deptCounts = reports.reduce((acc, r) => {
    if (r.is_valid) {
      acc[r.assigned_department] = (acc[r.assigned_department] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const SYSTEM_PROMPT_COPY = `You are the core backend engine for "Community Hero: Hyperlocal Problem Solver," an AI-powered civic platform.
Your job is to act as an intelligent agent that triages, extracts data from, and tracks municipal/infrastructure complaints reported by citizens.

Execute these steps meticulously:
1. Validate if the issue is a genuine infrastructure/civic problem (e.g., potholes, trash dumping, water leakage, broken streetlights, public safety hazards). If it is spam, commercial, or unrelated chat, flag it as is_valid = false.
2. Classify the issue into a strict category.
3. Assess the severity level (Low, Medium, Critical).
4. Extract automated headline and actionable task summaries.
5. Autonomous routing recommendations for local body departments.`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Sandbox & Prompt Specifications */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        {/* Sandbox Console */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md flex flex-col">
          <div className="flex items-center gap-2.5 mb-4 border-b border-slate-800 pb-3">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold">AI Agent Sandbox & Prompt Sandbox</h2>
              <p className="text-[11px] text-slate-400">Evaluate Gemini's structured output, safety parsing, and compliance constraints.</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Test custom reports here without altering the production dispatch dashboard. Enter anything (a true emergency, a subtle complaint, or obvious spam ads) and see how the agent responds.
          </p>

          <div className="space-y-4 mb-4">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mr-2 mt-1">Preset Presets:</span>
              <button
                onClick={() => handleSetPreset(
                  "Gas leak in basement corner",
                  "I can smell a strong rotten eggs odor near the water heaters in our building basement at 450 Broadway. The gas meter is hissing softly. Need help immediately!"
                )}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded cursor-pointer transition-colors"
              >
                Critical: Gas Leak
              </button>
              <button
                onClick={() => handleSetPreset(
                  "Get low rate mortgages today",
                  "Low rate home loans starting from 2.1%. Refinance your mortgage easily! Zero down-payment options. Call our hotline now!"
                )}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded cursor-pointer transition-colors"
              >
                Spam Ad
              </button>
              <button
                onClick={() => handleSetPreset(
                  "Graffiti on historical library pillars",
                  "Someone spray-painted red slogans all over the stone pillars on the west wing of the historical municipal library. It looks awful, need cleaning teams."
                )}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded cursor-pointer transition-colors"
              >
                Nuisance: Graffiti
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Sandbox Title / Short Input</label>
              <input
                type="text"
                placeholder="e.g. Broken park swing, water leakage..."
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 font-mono text-slate-100"
                value={sandboxTitle}
                onChange={(e) => setSandboxTitle(e.target.value)}
                id="sandbox_title"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Sandbox Description Details</label>
              <textarea
                rows={4}
                placeholder="Write description notes..."
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 font-mono text-slate-100 resize-none"
                value={sandboxText}
                onChange={(e) => setSandboxText(e.target.value)}
                id="sandbox_desc"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900 rounded-lg text-xs text-red-400 font-mono mb-4">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              onClick={handleTestSandbox}
              disabled={loading || !sandboxText || !sandboxTitle}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              id="sandbox_execute_button"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Triaging Pipeline...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Execute Sandbox Triage
                </>
              )}
            </button>
          </div>

          {sandboxResult && (
            <div className="mt-5 border-t border-slate-800 pt-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span>SANDBOX EXECUTED (RAW JSON OUTPUT)</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-[220px]">
                <pre>{JSON.stringify(sandboxResult, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Prompt Specifications Box */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4 border-b border-slate-100 pb-3">
            <Settings className="w-5 h-5 text-slate-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">System Blueprint & Guidelines</h3>
              <p className="text-[11px] text-slate-500">The core prompt logic injected into the Gemini API backend calls.</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 font-mono overflow-auto max-h-[160px] leading-relaxed">
            <pre className="whitespace-pre-wrap">{SYSTEM_PROMPT_COPY}</pre>
          </div>
        </div>
      </div>

      {/* Analytics & Micro SVG Graphs */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        {/* Core AI Health Panel */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Activity className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Agent Performance Index</h3>
              <p className="text-[11px] text-slate-500">Auto-triage accuracy and workload health stats.</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Auto-Route %</span>
              <strong className="text-xl font-bold text-indigo-600 font-mono block mt-1">100%</strong>
              <span className="text-[9px] text-slate-400 block mt-0.5">Zero manual wait</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Filtered Spam</span>
              <strong className="text-xl font-bold text-rose-600 font-mono block mt-1">{spamReports}</strong>
              <span className="text-[9px] text-slate-400 block mt-0.5">Auto blocked</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/60 text-center">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Valid Tickets</span>
              <strong className="text-xl font-bold text-emerald-600 font-mono block mt-1">{validReports}</strong>
              <span className="text-[9px] text-slate-400 block mt-0.5">Dispatched logs</span>
            </div>
          </div>

          {/* Category Workload Graph */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-slate-400" />
              <span>Category Distribution</span>
            </h4>

            {validReports === 0 ? (
              <p className="text-xs text-slate-400">No active reports registered.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(categoryCounts).map(([cat, val]) => {
                  const pct = Math.round((val / validReports) * 100);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono font-medium text-slate-600">
                        <span>{cat}</span>
                        <span>{val} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Department Workload Graph */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-400" />
              <span>Department Dispatches</span>
            </h4>

            {validReports === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No valid departments assigned.</p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(deptCounts).map(([dept, val]) => {
                  const pct = Math.round((val / validReports) * 100);
                  return (
                    <div key={dept} className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 font-medium truncate w-[130px] font-mono leading-tight">{dept}</span>
                      <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-slate-700 font-semibold font-mono w-[20px] text-right">{val}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Severity Levels comparing */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-slate-400" />
              <span>Severity Demographics</span>
            </h4>

            {validReports === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No active severity records.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="border border-slate-100 bg-slate-50/45 p-2 rounded-lg text-center">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Critical</span>
                  <strong className="text-sm font-extrabold text-red-600 block font-mono mt-0.5">
                    {severityCounts["Critical"] || 0}
                  </strong>
                </div>
                <div className="border border-slate-100 bg-slate-50/45 p-2 rounded-lg text-center">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Medium</span>
                  <strong className="text-sm font-extrabold text-amber-600 block font-mono mt-0.5">
                    {severityCounts["Medium"] || 0}
                  </strong>
                </div>
                <div className="border border-slate-100 bg-slate-50/45 p-2 rounded-lg text-center">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">Low</span>
                  <strong className="text-sm font-extrabold text-slate-600 block font-mono mt-0.5">
                    {severityCounts["Low"] || 0}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Educational Info box */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-800 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 font-bold">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Understanding Civic AI Pipelines</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Every submission triggers a deep natural language reasoning step. The agent prevents critical errors such as routing water issues to electrical teams, while identifying prank complaints as spam immediately using Gemini's high comprehension capabilities.
          </p>
        </div>
      </div>
    </div>
  );
}
