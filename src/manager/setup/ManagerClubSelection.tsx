
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";

// Import JSON data
import clubsData from "../../assets/clubs.json";
import divisionsData from "../../assets/divisions.json";
import countriesData from "../../assets/countries.json";

interface Club {
  id: string;
  name: string;
  divisionId: string;
  countryId: string;
  rank: number;
  status: "pro" | "semi-pro";
  balance: "rich" | "average" | "poor";
}

interface Division {
  id: string;
  name: string;
  countryId: string;
  tier: number;
  clubs: number;
  rules: {
    promotion: number;
    relegation: number;
    cafclQualify: number | null;
    cafccQualify: number | null;
    transferWindows: Array<{ start: string; end: string }> | null;
    suspensions: {
      yellowCardAccumulation: number;
      redCard: number;
    } | null;
  };
}

interface Country {
  id: string;
  name: string;
  federationId: string;
  continentFedId: string;
  rank: number;
}

interface ClubWithDetails extends Club {
  divisionName: string;
  countryName: string;
  tier: number;
}

export function ManagerClubSelection({ 
  selectedCountries, 
  onComplete 
}: { 
  selectedCountries: string[], 
  onComplete: (club: ClubWithDetails) => void 
}) {
  const [activeDivision, setActiveDivision] = useState("");
  const [selectedClub, setSelectedClub] = useState<ClubWithDetails | null>(null);

  const { availableClubs, divisionsByCountry, countries } = useMemo(() => {
    const clubs = clubsData as Club[];
    const divisions = divisionsData as Division[];
    const countriesMap = (countriesData as Country[]).reduce((acc, country) => {
      acc[country.id] = country;
      return acc;
    }, {} as Record<string, Country>);

    // Filter clubs for selected countries
    const filteredClubs = clubs.filter(club => 
      selectedCountries.includes(club.countryId)
    );

    // Create division lookup
    const divisionsMap = divisions.reduce((acc, division) => {
      acc[division.id] = division;
      return acc;
    }, {} as Record<string, Division>);

    // Add additional details to clubs
    const clubsWithDetails = filteredClubs.map(club => ({
      ...club,
      divisionName: divisionsMap[club.divisionId]?.name || 'Unknown Division',
      countryName: countriesMap[club.countryId]?.name || 'Unknown Country',
      tier: divisionsMap[club.divisionId]?.tier || 1
    }));

    // Group divisions by country
    const divsByCountry = selectedCountries.reduce((acc, countryId) => {
      const countryDivisions = divisions
        .filter(div => div.countryId === countryId)
        .sort((a, b) => a.tier - b.tier);
      
      if (countryDivisions.length > 0) {
        acc[countryId] = countryDivisions;
      }
      return acc;
    }, {} as Record<string, Division[]>);

    return {
      availableClubs: clubsWithDetails,
      divisionsByCountry: divsByCountry,
      countries: countriesMap
    };
  }, [selectedCountries]);

  const allDivisions = useMemo(() => {
    const divisions: Array<Division & { countryName: string }> = [];
    Object.entries(divisionsByCountry).forEach(([countryId, countryDivisions]) => {
      countryDivisions.forEach(division => {
        divisions.push({
          ...division,
          countryName: countries[countryId]?.name || 'Unknown'
        });
      });
    });
    return divisions.sort((a, b) => {
      if (a.countryName !== b.countryName) {
        return a.countryName.localeCompare(b.countryName);
      }
      return a.tier - b.tier;
    });
  }, [divisionsByCountry, countries]);

  // Set default active division
  if (!activeDivision && allDivisions.length > 0) {
    setActiveDivision(allDivisions[0].id);
  }

  if (selectedCountries.length === 0) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center p-6 bg-slate-800/60 border border-white/10 rounded-xl shadow-xl max-w-md">
          <p className="text-lg">Please go back and select at least one country to continue.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-sm"
          >
            Back to Countries
          </button>
        </div>
      </div>
    );
  }

  const clubsInDivision = availableClubs.filter(c => c.divisionId === activeDivision);
  const activeDivisionData = allDivisions.find(d => d.id === activeDivision);
  
  // Dynamic grid with scroll fallback
  const getClubGridCols = (itemCount: number) => {
    if (itemCount <= 4) return 'grid-cols-4';
    if (itemCount <= 6) return 'grid-cols-5';
    if (itemCount <= 8) return 'grid-cols-5';
    return 'grid-cols-5';
  };

  const clubsNeedScroll = clubsInDivision.length > 8;

  const getBalanceColor = (balance: string) => {
    switch (balance) {
      case 'rich': return 'text-green-400';
      case 'average': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'pro' ? 'Professional' : 'Semi-Professional';
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-extrabold tracking-tight">Select a Club to Manage</h2>
          <p className="text-slate-400 text-sm">Choose a club from the countries you have selected.</p>
          {activeDivisionData && (
            <p className="text-slate-500 text-xs mt-1">
              {activeDivisionData.name} • {activeDivisionData.countryName} • Tier {activeDivisionData.tier}
            </p>
          )}
        </div>
      </div>

      {/* Division Tabs - Fixed height with scroll if needed */}
      {allDivisions.length > 1 && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              {allDivisions.map((div) => {
                const clubCount = availableClubs.filter(c => c.divisionId === div.id).length;
                return (
                  <button
                    key={div.id}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      activeDivision === div.id
                        ? "bg-sky-600 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/20"
                    }`}
                    onClick={() => setActiveDivision(div.id)}
                  >
                    {div.countryName} - {div.name} ({clubCount})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Flexible with conditional scroll */}
      <div className="flex-1 flex flex-col px-4 min-h-0">
        <div className={`flex-1 max-w-7xl mx-auto w-full ${clubsNeedScroll ? 'overflow-y-auto' : ''}`}>
          {clubsInDivision.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-slate-400">No clubs available in this division.</p>
            </div>
          ) : (
            <div className={`grid gap-3 ${clubsNeedScroll ? 'pb-4' : 'h-full'} ${getClubGridCols(clubsInDivision.length)}`}>
              {clubsInDivision
                .sort((a, b) => a.rank - b.rank) // Sort by league position
                .map((club) => (
                <motion.div
                  key={club.id}
                  onClick={() => setSelectedClub(club)}
                  className={`relative p-3 rounded-xl cursor-pointer transition-all border flex flex-col justify-between ${
                    clubsNeedScroll ? 'min-h-[100px]' : ''
                  } ${
                    selectedClub?.id === club.id
                      ? "bg-sky-600/20 border-sky-500 ring-1 ring-sky-500"
                      : "bg-slate-800/60 border-white/10 hover:bg-slate-700/60"
                  }`}
                  whileHover={{ scale: 1.02 }}
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold leading-tight flex-1 pr-2">{club.name}</h3>
                      <div className="flex items-center text-xs text-slate-400">
                        {club.rank === 1 && <Star className="w-3 h-3 text-yellow-400 mr-1" />}
                        #{club.rank}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">{club.divisionName}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{getStatusBadge(club.status)}</span>
                        <span className={`text-xs font-medium ${getBalanceColor(club.balance)}`}>
                          {club.balance.charAt(0).toUpperCase() + club.balance.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedClub?.id === club.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer - Fixed height */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-sm text-slate-400">
            {clubsInDivision.length} clubs available
            {clubsNeedScroll && <span className="ml-2 text-amber-400">• Scroll for more</span>}
            {activeDivisionData && (
              <span className="ml-2 text-slate-500">
                • {activeDivisionData.clubs} total capacity
              </span>
            )}
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