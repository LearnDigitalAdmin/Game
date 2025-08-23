import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

type LeagueId = "KE" | "NG" | "ZA" | "GB";

export function ManagerClubSelection({ 
  leagues, 
  onComplete 
}: { 
  leagues: LeagueId[], 
  onComplete: (club: any) => void 
}) {
  const clubs = useMemo(() => {
    const allClubs: Record<LeagueId, { name: string; id: string; division: string; }[]> = {
      KE: [
        { name: "Gor Mahia FC", id: "GFC", division: "Premier League" },
        { name: "Tusker FC", id: "TFC", division: "Premier League" },
        { name: "AFC Leopards", id: "ALFC", division: "Premier League" },
        { name: "KCB FC", id: "KCB", division: "Premier League" },
        { name: "Bandari FC", id: "BFC", division: "Premier League" },
        { name: "Mathare United", id: "MUFC", division: "Premier League" },
        { name: "Sofapaka FC", id: "SFC", division: "Premier League" },
        { name: "Ulinzi Stars", id: "USFC", division: "Premier League" },
        { name: "Wazito FC", id: "WFC", division: "Super League" },
        { name: "Naivas FC", id: "NFC", division: "Super League" },
        { name: "Fortune Sacco", id: "FSFC", division: "Super League" },
        { name: "Kibera Black Stars", id: "KBSFC", division: "Super League" },
      ],
      NG: [
        { name: "Enyimba", id: "EFC", division: "Premier League" },
        { name: "Kano Pillars", id: "KPC", division: "Premier League" },
        { name: "Rivers United", id: "RUFC", division: "Premier League" },
        { name: "Plateau United", id: "PUFC", division: "Premier League" },
      ],
      ZA: [
        { name: "Mamelodi Sundowns", id: "MSD", division: "Premier League" },
        { name: "Kaizer Chiefs", id: "KC", division: "Premier League" },
        { name: "Orlando Pirates", id: "OP", division: "Premier League" },
        { name: "SuperSport United", id: "SSU", division: "Premier League" },
      ],
      GB: [
        { name: "Liverpool", id: "LIV", division: "Premier League" },
        { name: "Manchester City", id: "MNC", division: "Premier League" },
        { name: "Arsenal", id: "ARS", division: "Premier League" },
        { name: "Chelsea", id: "CHE", division: "Premier League" },
        { name: "Manchester United", id: "MNU", division: "Premier League" },
        { name: "Tottenham", id: "TOT", division: "Premier League" },
        { name: "Newcastle", id: "NEW", division: "Premier League" },
        { name: "Brighton", id: "BHA", division: "Premier League" },
        { name: "Aston Villa", id: "AVL", division: "Premier League" },
        { name: "West Ham", id: "WHU", division: "Premier League" },
      ]
    };
    
    return leagues.flatMap(leagueId => allClubs[leagueId] || []);
  }, [leagues]);

  const divisions = useMemo(() => {
    const divSet = new Set(clubs.map(c => c.division));
    return Array.from(divSet).sort();
  }, [clubs]);

  const [activeDivision, setActiveDivision] = useState(divisions[0] || "");
  const [selectedClub, setSelectedClub] = useState<{ name: string; id: string; division: string; } | null>(null);

  if (leagues.length === 0) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center p-6 bg-slate-800/60 border border-white/10 rounded-xl shadow-xl max-w-md">
          <p className="text-lg">Please go back and select at least one league to continue.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-sm"
          >
            Back to Leagues
          </button>
        </div>
      </div>
    );
  }

  const clubsInDivision = clubs.filter(c => c.division === activeDivision);
  
  // Dynamic grid with scroll fallback
  const getClubGridCols = (itemCount: number) => {
    if (itemCount <= 4) return 'grid-cols-4';
    if (itemCount <= 6) return 'grid-cols-6';
    if (itemCount <= 8) return 'grid-cols-8';
    // For 9+ clubs, use scrollable 6-column grid
    return 'grid-cols-6';
  };

  const clubsNeedScroll = clubsInDivision.length > 8;

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-extrabold tracking-tight">Select a Club to Manage</h2>
          <p className="text-slate-400 text-sm">Choose a club from the leagues you have selected.</p>
        </div>
      </div>

      {/* Division Tabs - Fixed height */}
      {divisions.length > 1 && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="max-w-7xl mx-auto flex items-center space-x-2">
            {divisions.map((div) => (
              <button
                key={div}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeDivision === div
                    ? "bg-sky-600 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
                onClick={() => setActiveDivision(div)}
              >
                {div} ({clubs.filter(c => c.division === div).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content - Flexible with conditional scroll */}
      <div className="flex-1 flex flex-col px-4 min-h-0">
        <div className={`flex-1 max-w-7xl mx-auto w-full ${clubsNeedScroll ? 'overflow-y-auto' : ''}`}>
          <div className={`grid gap-3 ${clubsNeedScroll ? 'pb-4' : 'h-full'} ${getClubGridCols(clubsInDivision.length)}`}>
            {clubsInDivision.map((club) => (
              <motion.div
                key={club.id}
                onClick={() => setSelectedClub(club)}
                className={`relative p-3 rounded-xl cursor-pointer transition-all border flex flex-col justify-between ${
                  clubsNeedScroll ? 'min-h-[80px]' : ''
                } ${
                  selectedClub?.id === club.id
                    ? "bg-sky-600/20 border-sky-500 ring-1 ring-sky-500"
                    : "bg-slate-800/60 border-white/10 hover:bg-slate-700/60"
                }`}
                whileHover={{ scale: 1.02 }}
              >
                <div>
                  <h3 className="text-sm font-semibold leading-tight mb-1">{club.name}</h3>
                  <p className="text-xs text-slate-400">{club.division}</p>
                </div>
                {selectedClub?.id === club.id && (
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
            {clubsInDivision.length} clubs available
            {clubsNeedScroll && <span className="ml-2 text-amber-400">• Scroll for more</span>}
          </div>
          <button
            onClick={() => selectedClub && onComplete(selectedClub)}
            disabled={!selectedClub}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              selectedClub
                ? "bg-sky-600 hover:bg-sky-500"
                : "bg-slate-700 text-slate-500 cursor-not-allowed"
            }`}
          >
            Confirm & Start Game
          </button>
        </div>
      </div>
    </div>
  );
}