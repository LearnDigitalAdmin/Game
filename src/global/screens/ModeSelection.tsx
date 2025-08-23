import { motion } from "framer-motion";
import { Trophy, Shield, DollarSign } from "lucide-react";
import type { GameState, Mode } from "../types/GameTypes";

export function ModeSelection({ setGameState, onStartManager }: { setGameState: (s: GameState) => void, onStartManager: () => void }) {
  const cards = [
    {
      key: "player" as Mode,
      title: "Player",
      desc: "Rise from academy prospect to continental legend.",
      grad: "from-emerald-500 to-teal-600",
      icon: <Trophy className="w-6 h-6" />,
      action: () => setGameState("player"),
    },
    {
      key: "manager" as Mode,
      title: "Manager",
      desc: "Craft tactics, shape morale, and conquer leagues.",
      grad: "from-sky-500 to-indigo-600",
      icon: <Shield className="w-6 h-6" />,
      action: onStartManager,
    },
    {
      key: "owner" as Mode,
      title: "Owner",
      desc: "Balance finances, expand facilities, define an era.",
      grad: "from-amber-500 to-orange-600",
      icon: <DollarSign className="w-6 h-6" />,
      action: () => setGameState("owner"),
    },
  ];

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">Choose Your Starting Role</h2>
            <p className="text-slate-400 mt-1 text-sm sm:text-base">You can evolve between roles later.</p>
          </div>
          <button
            onClick={() => setGameState("landing")}
            className="px-3 py-2 text-sm rounded-lg border border-white/15 hover:bg-white/10 flex-shrink-0"
          >
            Back
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6 w-full max-w-7xl h-full max-h-96">
          {cards.map((c) => (
            <motion.div 
              key={c.key} 
              whileHover={{ y: -3, scale: 1.01 }}
              className="h-full"
            >
              <div className="h-full rounded-xl lg:rounded-2xl overflow-hidden bg-slate-900/60 border border-white/10 flex flex-col">
                <div className={`p-3 sm:p-4 lg:p-5 text-white bg-gradient-to-r ${c.grad} flex-shrink-0`}>
                  <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-lg lg:text-xl font-semibold">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6">
                      {c.icon}
                    </div>
                    <span>{c.title}</span>
                  </div>
                </div>
                <div className="flex-1 p-3 sm:p-4 lg:p-5 text-slate-300 flex flex-col justify-between">
                  <p className="text-xs sm:text-sm lg:text-base leading-relaxed">{c.desc}</p>
                  <button
                    className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                    onClick={c.action}
                  >
                    Enter {c.title}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}