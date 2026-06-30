import React, { useState, useEffect } from "react";
import { 
  Database, 
  Terminal, 
  Play, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Table, 
  Server, 
  ArrowRight,
  Info,
  Layers,
  FileText,
  Users,
  Briefcase
} from "lucide-react";
import { motion } from "motion/react";

interface TableInfo {
  name: string;
  count: number;
  schema: Array<{
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: any;
    pk: number;
  }>;
}

interface DbStatus {
  dbPath: string;
  journalMode: string;
  reportsCount: number;
  logsCount: number;
  workersCount?: number;
  citizensCount?: number;
  tables: TableInfo[];
}

export default function DatabaseExplorer() {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState("");
  
  const [sqlQuery, setSqlQuery] = useState("SELECT id, title, category, severity, status FROM reports ORDER BY createdAt DESC LIMIT 5;");
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [queryFields, setQueryFields] = useState<string[]>([]);
  const [runLoading, setRunLoading] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [affectedRows, setAffectedRows] = useState<any>(null);
  
  const [activeTableTab, setActiveTableTab] = useState<"reports" | "logs" | "workers" | "citizens">("reports");

  const fetchStatus = async () => {
    setLoadingStatus(true);
    setStatusError("");
    try {
      const res = await fetch("/api/db/status");
      if (!res.ok) throw new Error("Failed to load database status");
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      console.error(err);
      setStatusError(err.message || "Error communicating with server database");
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleRunQuery = async (queryToRun?: string) => {
    const q = queryToRun || sqlQuery;
    if (!q.trim()) return;
    
    setRunLoading(true);
    setQueryError("");
    setQueryResult(null);
    setQueryFields([]);
    setAffectedRows(null);

    try {
      const res = await fetch("/api/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: q })
      });
      
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || "SQL execution returned an error");
      }

      const result = data.result;
      if (Array.isArray(result)) {
        setQueryResult(result);
        if (result.length > 0) {
          setQueryFields(Object.keys(result[0]));
        }
      } else {
        // Was an INSERT/UPDATE/DELETE run statement
        setAffectedRows(result);
      }
    } catch (err: any) {
      console.error(err);
      setQueryError(err.message || "Failed to execute SQL query");
    } finally {
      setRunLoading(false);
    }
  };

  const handlePresetClick = (preset: string) => {
    setSqlQuery(preset);
    handleRunQuery(preset);
  };

  return (
    <div className="space-y-6">
      {/* DB Core Meta Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden border border-slate-800 shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-10">
          <Database className="w-64 h-64 text-blue-500" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">SQLite Database Active</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl font-sans">Municipal SQL Database Explorer</h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Your application persists all civic reports and AI-generated triage logs directly into an enterprise-grade 
              local SQL database. Explore schemas, structures, and live metrics below.
            </p>
          </div>
          
          <button
            onClick={fetchStatus}
            disabled={loadingStatus}
            className="self-start md:self-auto bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        {/* Database Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Database Filename</span>
            <span className="font-mono text-xs text-slate-300 break-all select-all block font-semibold">reports.db</span>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">SQLite Engine Mode</span>
            <span className="text-xs text-slate-300 block font-semibold flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-sky-400 rounded-full"></span>
              WAL (Write-Ahead Logging)
            </span>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Reports Count</span>
            <span className="text-base sm:text-lg font-bold text-slate-200 block">
              {loadingStatus ? "..." : status?.reportsCount ?? 0}
              <span className="text-xs text-slate-500 font-normal ml-1">rows</span>
            </span>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">Triage Logs Count</span>
            <span className="text-base sm:text-lg font-bold text-slate-200 block">
              {loadingStatus ? "..." : status?.logsCount ?? 0}
              <span className="text-xs text-slate-500 font-normal ml-1">rows</span>
            </span>
          </div>
        </div>
        
        {/* Full Server Path */}
        {status?.dbPath && (
          <div className="mt-4 bg-slate-950/80 rounded-lg p-2.5 px-3 border border-slate-850 flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Path:</span>
            <span className="font-mono text-[10px] text-slate-400 break-all select-all">{status.dbPath}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Schema and Table structure inspector */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Database Tables & Schemas</h3>
          </div>

          {/* Table Selector Tabs */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTableTab("reports")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTableTab === "reports"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>reports</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                {status?.reportsCount ?? 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTableTab("logs")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTableTab === "logs"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>logs</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                {status?.logsCount ?? 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTableTab("workers")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTableTab === "workers"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>workers</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                {status?.workersCount ?? 0}
              </span>
            </button>
            <button
              onClick={() => setActiveTableTab("citizens")}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTableTab === "citizens"
                  ? "bg-white text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>citizens</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                {status?.citizensCount ?? 0}
              </span>
            </button>
          </div>

          {/* Column list */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                  <th className="p-3">Column</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Attributes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {status?.tables
                  .find(t => t.name === activeTableTab)
                  ?.schema.map((col) => (
                    <tr key={col.cid} className="hover:bg-slate-50/55 transition-colors">
                      <td className="p-3 font-mono font-semibold text-slate-850">{col.name}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                          {col.type}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        {Boolean(col.pk) && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            PRIMARY KEY
                          </span>
                        )}
                        {Boolean(col.notnull) && (
                          <span className="bg-slate-100 text-slate-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            NOT NULL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>Relations & Foreign Keys</span>
            </div>
            <p>
              The <code className="bg-slate-200 font-mono text-[10px] px-1 py-0.2 rounded font-bold text-slate-800">logs</code> table references 
              the <code className="bg-slate-200 font-mono text-[10px] px-1 py-0.2 rounded font-bold text-slate-800">reports</code> table's Primary Key 
              via <code className="font-mono text-[10px] font-bold">reportId</code>. Cascade deletes are set up so that removing an incident automatically purges its respective triage logs.
            </p>
          </div>
        </div>

        {/* Live Playground and Query Terminal */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Interactive SQL Playground</h3>
            </div>
          </div>

          {/* Preset SQL buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Preset SQL Templates</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handlePresetClick("SELECT * FROM reports LIMIT 5;")}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] px-2.5 py-1 rounded-lg border border-slate-200/60 font-mono transition-colors cursor-pointer font-semibold"
              >
                List Reports
              </button>
              <button
                onClick={() => handlePresetClick("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 10;")}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] px-2.5 py-1 rounded-lg border border-slate-200/60 font-mono transition-colors cursor-pointer font-semibold"
              >
                List Triage Logs
              </button>
              <button
                onClick={() => handlePresetClick("SELECT category, count(*) as total FROM reports GROUP BY category;")}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] px-2.5 py-1 rounded-lg border border-slate-200/60 font-mono transition-colors cursor-pointer font-semibold"
              >
                Group By Category
              </button>
              <button
                onClick={() => handlePresetClick("SELECT status, count(*) as count FROM reports GROUP BY status;")}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] px-2.5 py-1 rounded-lg border border-slate-200/60 font-mono transition-colors cursor-pointer font-semibold"
              >
                Group By Status
              </button>
              <button
                onClick={() => handlePresetClick("SELECT * FROM workers;")}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] px-2.5 py-1 rounded-lg border border-slate-200/60 font-mono transition-colors cursor-pointer font-semibold font-bold"
              >
                List Workers
              </button>
              <button
                onClick={() => handlePresetClick("SELECT * FROM citizens;")}
                className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-[10px] px-2.5 py-1 rounded-lg border border-slate-200/60 font-mono transition-colors cursor-pointer font-semibold font-bold"
              >
                List Citizens
              </button>
            </div>
          </div>

          {/* SQL Editor Area */}
          <div className="relative">
            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full h-28 bg-slate-950 text-slate-100 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y shadow-inner leading-relaxed"
              placeholder="SELECT * FROM reports;"
            />
            
            <button
              onClick={() => handleRunQuery()}
              disabled={runLoading}
              className="absolute right-3 bottom-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {runLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Run SQL</span>
            </button>
          </div>

          {/* Query Feedback / Error Area */}
          {queryError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-700 leading-normal">
                <span className="font-bold block">SQLite Driver Exception:</span>
                <span className="font-mono">{queryError}</span>
              </div>
            </div>
          )}

          {affectedRows !== null && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-800">
                <span className="font-bold">SQL Statement executed successfully!</span>
                <span className="block text-[10px] opacity-90 mt-1 font-mono">
                  Changes: {affectedRows.changes} | LastInsertedRowid: {affectedRows.lastInsertRowid}
                </span>
              </div>
            </div>
          )}

          {/* Results Output Console */}
          <div className="flex-1 flex flex-col min-h-[160px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Query Results</span>
              {queryResult !== null && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {queryResult.length} rows returned
                </span>
              )}
            </div>

            <div className="flex-1 border border-slate-200 rounded-xl overflow-auto bg-slate-50 min-h-[150px] relative">
              {queryResult === null && !runLoading && !queryError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                  <Database className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">Ready to execute SQL query</p>
                  <p className="text-[10px] max-w-xs mt-1">Select a preset template or type a custom command and hit run.</p>
                </div>
              )}

              {runLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80">
                  <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
                  <span className="text-xs font-semibold text-slate-600 mt-2">Querying local SQLite engine...</span>
                </div>
              )}

              {queryResult !== null && queryResult.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                  <span className="text-xs font-bold font-mono text-slate-400">[Empty Result Set]</span>
                </div>
              )}

              {queryResult !== null && queryResult.length > 0 && (
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                      {queryFields.map((field) => (
                        <th key={field} className="p-2.5 font-mono text-slate-600 font-bold border-r border-slate-250">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700 bg-white">
                    {queryResult.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 font-mono">
                        {queryFields.map((field) => (
                          <td key={field} className="p-2.5 max-w-[200px] truncate border-r border-slate-150 select-all" title={String(row[field])}>
                            {row[field] === null ? (
                              <span className="text-slate-300 italic">NULL</span>
                            ) : typeof row[field] === "boolean" ? (
                              row[field] ? "true" : "false"
                            ) : (
                              String(row[field])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
