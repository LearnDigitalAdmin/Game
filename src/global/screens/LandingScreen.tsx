import { motion } from "framer-motion";
import type { GameState } from "../types/GameTypes";

export function LandingScreen({ 
  setGameState, 
  onLoadSave 
}: { 
  setGameState: (s: GameState) => void;
  onLoadSave?: (saveData: any) => void;
}) {
  return (
    <div className="w-screen h-screen overflow-hidden bg-gradient-to-br from-emerald-900 via-slate-950 to-black text-white">
      <div className="max-w-[1400px] mx-auto px-8 pt-10">
        <div className="flex items-end justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-emerald-200 to-teal-200"
            >
              Football Legacy
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="mt-3 text-slate-300 max-w-2xl"
            >
              A lightweight, text-first football sim focused on Africa & the Middle East. Start as a Player, command as a
              Manager, or reshape the game as an Owner.
            </motion.p>
            <div className="mt-6 flex items-center gap-3">
              <button
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 shadow"
                onClick={() => setGameState("player")}
              >
                Start as Player
              </button>
              <button 
                className="px-5 py-3 rounded-xl border border-white/15 hover:bg-white/10" 
                onClick={() => onLoadSave && onLoadSave(null)}
              >
                💾 Load Save
              </button>
            </div>
          </div>
          <div className="pb-2">
            <button
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 shadow-lg"
              onClick={() => setGameState("modeSelect")}
            >
              Select Mode
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 mt-10">
        <div className="h-[280px] rounded-2xl bg-emerald-900/40 border border-emerald-400/20 relative overflow-hidden">
          <div className="absolute inset-6 border-2 border-emerald-400/25 rounded-xl" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-emerald-400/25" />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-24 border-2 border-emerald-300/25 rounded" />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-24 border-2 border-emerald-300/25 rounded" />
          {[...Array(14)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-emerald-200/80"
              style={{ left: `${8 + ((i * 7.3) % 84)}%`, top: `${12 + ((i * 11.7) % 70)}%` }}
              animate={{ y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 2 + (i % 5) * 0.3 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}