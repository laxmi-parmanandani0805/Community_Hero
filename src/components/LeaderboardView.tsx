import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Sparkles, 
  Star, 
  Users, 
  Briefcase, 
  RefreshCw, 
  AlertCircle,
  Award,
  Shield,
  Medal
} from "lucide-react";
import { motion } from "motion/react";

interface CitizenRank {
  id: string;
  name: string;
  contact: string;
  civic_impact_score: number;
}

interface WorkerRank {
  id: string;
  name: string;
  department: string;
  score: number;
  availability: "Available" | "Busy";
}

interface LeaderboardViewProps {
  myPoints: number | null;
  myProfileName: string;
  onNavigateToReport: () => void;
}

export default function LeaderboardView({ myPoints, myProfileName, onNavigateToReport }: LeaderboardViewProps) {
  const [citizens, setCitizens] = useState<CitizenRank[]>([]);
  const [workers, setWorkers] = useState<WorkerRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<"all" | "citizens" | "workers">("all");

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to synchronize municipal leaderboard.");
      const data = await res.json();
      setCitizens(data.citizens || []);
      setWorkers(data.workers || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            🥇
          </div>
        );
      case 1:
        return (
          <div className="w-6 h-6 rounded-full bg-slate-150 border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            🥈
          </div>
        );
      case 2:
        return (
          <div className="w-6 h-6 rounded-full bg-orange-100 border border-orange-300 text-orange-700 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            🥉
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
            {index + 1}
          </div>
        );
    }
  };

  return (
    <div className="space-y-8" id="leaderboard-view-container">
      {/* Dynamic Personal Score Greeting Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 -mr-6 -mt-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
        <div className="absolute left-1/3 bottom-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Civic Leaderboard
              </span>
            </div>
            
            {myPoints !== null ? (
              <>
                <h2 className="text-xl font-extrabold tracking-tight">
                  Welcome back, <span className="text-indigo-300">{myProfileName}</span>!
                </h2>
                <p className="text-xs text-indigo-200/80 leading-relaxed max-w-md">
                  You are making our city better. Detailed reports earn <span className="font-semibold text-white">+10 pts</span>, and resolving problems gives our hero teams another reason to celebrate!
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-extrabold tracking-tight">Become a Neighborhood Hero</h2>
                <p className="text-xs text-indigo-200/80 leading-relaxed max-w-md">
                  Submit a highly detailed, proper issue report with coordinates to earn a <span className="font-semibold text-white">+10 pts detailed bonus</span>, and score up to <span className="font-semibold text-white">+50 pts</span> upon ticket resolution!
                </p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-white/5 p-4 rounded-xl border border-white/10 self-stretch sm:self-center justify-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5 animate-bounce" />
            </div>
            <div className="text-left">
              <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">Your Civic Balance</span>
              <span className="font-black text-2xl text-amber-400 font-mono">
                {myPoints !== null ? `${myPoints} pts` : "0 pts"}
              </span>
            </div>
          </div>
        </div>

        {myPoints === null && (
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={onNavigateToReport}
              className="px-3.5 py-1.5 bg-white text-indigo-950 hover:bg-slate-100 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-sm"
            >
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              File Your First Report (+10 pts)
            </button>
          </div>
        )}
      </motion.div>

      {/* Leaderboard tabs & manual refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveLeaderboardTab("all")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeLeaderboardTab === "all"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All Rankings
          </button>
          <button
            onClick={() => setActiveLeaderboardTab("citizens")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeLeaderboardTab === "citizens"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Citizens
          </button>
          <button
            onClick={() => setActiveLeaderboardTab("workers")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeLeaderboardTab === "workers"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Field Agents
          </button>
        </div>

        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer self-end sm:self-center flex items-center justify-center"
          title="Refresh stats"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Synchronizing scores...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Citizen Leaderboard Column */}
          {(activeLeaderboardTab === "all" || activeLeaderboardTab === "citizens") && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-800">Civic Action Leaderboard (Citizens)</h3>
              </div>

              {citizens.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No citizens active in the system yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                  {citizens.map((citizen, index) => {
                    const isSelf = myProfileName && citizen.name.toLowerCase() === myProfileName.toLowerCase();
                    return (
                      <div 
                        key={citizen.id} 
                        className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                          isSelf ? "bg-indigo-50/50" : "hover:bg-slate-50/50"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getRankBadge(index)}
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] uppercase">
                            {citizen.name.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold truncate ${isSelf ? "text-indigo-950 font-black" : "text-slate-850"}`}>
                                {citizen.name}
                              </span>
                              {isSelf && (
                                <span className="bg-indigo-100 text-indigo-800 text-[8px] font-black uppercase px-1.5 py-0.2 rounded border border-indigo-200">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                              {citizen.reported_issue_text || "Community Contributor"}
                            </span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="font-mono font-extrabold text-slate-800 text-xs bg-slate-100 border border-slate-150 px-2 py-1 rounded-lg">
                            ⭐ {citizen.civic_impact_score || 0} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Worker Leaderboard Column */}
          {(activeLeaderboardTab === "all" || activeLeaderboardTab === "workers") && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs flex flex-col">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-xs sm:text-sm text-slate-800">Dispatch Hero Leaderboard (Field Agents)</h3>
              </div>

              {workers.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No workers registered in the database yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                  {workers.map((worker, index) => (
                    <div 
                      key={worker.id} 
                      className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {getRankBadge(index)}
                        <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-[10px] uppercase">
                          {worker.name.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-850 block truncate">
                            {worker.name}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-medium uppercase block">
                            {worker.department}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="font-mono font-extrabold text-emerald-800 text-xs bg-emerald-50 border border-emerald-150 px-2 py-1 rounded-lg">
                          🛠️ {worker.score || 0} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
