import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export function ManagerLeagueSelection({ onComplete }: { onComplete: (leagues: any) => void }) {
  const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
  const [activeFederation, setActiveFederation] = useState("CAF");

  type Federations = {
    [key: string]: { id: string; name: string; }[];
  };

  const federations: Federations = {
    CAF: [
      { id: "KE", name: "Kenya" },
      { id: "NG", name: "Nigeria" },
      { id: "GH", name: "Ghana" },
      { id: "EG", name: "Egypt" },
      { id: "ZA", name: "South Africa" },
      { id: "MA", name: "Morocco" },
      { id: "TN", name: "Tunisia" },
      { id: "DZ", name: "Algeria" },
      { id: "CI", name: "Ivory Coast" },
      { id: "SN", name: "Senegal" },
    ],
    UEFA: [
      { id: "GB", name: "England" },
      { id: "ES", name: "Spain" },
      { id: "DE", name: "Germany" },
      { id: "FR", name: "France" },
      { id: "IT", name: "Italy" },
      { id: "NL", name: "Netherlands" },
      { id: "PT", name: "Portugal" },
      { id: "BE", name: "Belgium" },
      { id: "TR", name: "Turkey" },
      { id: "RU", name: "Russia" },
    ],
    CONCACAF: [
      { id: "MX", name: "Mexico" },
      { id: "US", name: "USA" },
      { id: "CA", name: "Canada" },
    ],
  };

  const handleSelectLeague = (leagueId: string) => {
    setSelectedLeagues((prev) =>
      prev.includes(leagueId) ? prev.filter((id) => id !== leagueId) : [...prev, leagueId]
    );
  };

  const currentLeagues = federations[activeFederation];
  
  // Dynamic grid calculation with minimum card size
  const getGridCols = (itemCount: number) => {
    if (itemCount <= 3) return 'grid-cols-3';
    if (itemCount <= 4) return 'grid-cols-4';
    if (itemCount <= 5) return 'grid-cols-5';
    if (itemCount <= 6) return 'grid-cols-6';
    if (itemCount <= 8) return 'grid-cols-8';
    // For 9+ items, use scrollable grid with fixed columns
    return 'grid-cols-6';
  };

  const needsScroll = currentLeagues.length > 8;

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-extrabold tracking-tight">Active Leagues</h2>
          <p className="text-slate-400 text-sm">Select the countries you want to load into your game.</p>
        </div>
      </div>

      {/* Federation Tabs - Fixed height */}
      <div className="flex-shrink-0 px-4 pb-2">
        <div className="max-w-7xl mx-auto flex items-center space-x-2">
          {Object.keys(federations).map((fed) => (
            <button
              key={fed}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeFederation === fed
                  ? "bg-sky-600 text-white"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
              onClick={() => setActiveFederation(fed)}
            >
              {fed} ({federations[fed].length})
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Flexible with conditional scroll */}
      <div className="flex-1 flex flex-col px-4 min-h-0">
        <div className={`flex-1 max-w-7xl mx-auto w-full ${needsScroll ? 'overflow-y-auto' : ''}`}>
          <div className={`grid gap-3 ${needsScroll ? 'pb-4' : 'h-full'} ${getGridCols(currentLeagues.length)}`}>
            {currentLeagues.map((league) => (
              <motion.div
                key={league.id}
                onClick={() => handleSelectLeague(league.id)}
                className={`relative p-3 rounded-xl cursor-pointer transition-all border flex flex-col justify-center ${
                  needsScroll ? 'min-h-[80px]' : ''
                } ${
                  selectedLeagues.includes(league.id)
                    ? "bg-sky-600/20 border-sky-500 ring-1 ring-sky-500"
                    : "bg-slate-800/60 border-white/10 hover:bg-slate-700/60"
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-center">
                  <h3 className="text-sm font-semibold leading-tight mb-1">{league.name}</h3>
                  <p className="text-xs text-slate-400">Top Division</p>
                </div>
                {selectedLeagues.includes(league.id) && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer - Fixed height */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-sm text-slate-400">
            {selectedLeagues.length} league{selectedLeagues.length !== 1 ? 's' : ''} selected
            {needsScroll && <span className="ml-2 text-amber-400">• Scroll for more</span>}
          </div>
          <button
            onClick={() => onComplete(selectedLeagues)}
            disabled={selectedLeagues.length === 0}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              selectedLeagues.length > 0
                ? "bg-sky-600 hover:bg-sky-500"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            Next: Select Club
          </button>
        </div>
      </div>
    </div>
  );
}