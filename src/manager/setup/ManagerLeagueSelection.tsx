// import { useState } from "react";
// import { motion } from "framer-motion";
// import { Check } from "lucide-react";

// export function ManagerLeagueSelection({ onComplete }: { onComplete: (leagues: any) => void }) {
//   const [selectedLeagues, setSelectedLeagues] = useState<string[]>([]);
//   const [activeFederation, setActiveFederation] = useState("CAF");

//   type Federations = {
//     [key: string]: { id: string; name: string; }[];
//   };

//   const federations: Federations = {
//     CAF: [
//       { id: "KE", name: "Kenya" },
//       { id: "NG", name: "Nigeria" },
//       { id: "GH", name: "Ghana" },
//       { id: "EG", name: "Egypt" },
//       { id: "ZA", name: "South Africa" },
//       { id: "MA", name: "Morocco" },
//       { id: "TN", name: "Tunisia" },
//       { id: "DZ", name: "Algeria" },
//       { id: "CI", name: "Ivory Coast" },
//       { id: "SN", name: "Senegal" },
//     ],
//     UEFA: [
//       { id: "GB", name: "England" },
//       { id: "ES", name: "Spain" },
//       { id: "DE", name: "Germany" },
//       { id: "FR", name: "France" },
//       { id: "IT", name: "Italy" },
//       { id: "NL", name: "Netherlands" },
//       { id: "PT", name: "Portugal" },
//       { id: "BE", name: "Belgium" },
//       { id: "TR", name: "Turkey" },
//       { id: "RU", name: "Russia" },
//     ],
//     CONCACAF: [
//       { id: "MX", name: "Mexico" },
//       { id: "US", name: "USA" },
//       { id: "CA", name: "Canada" },
//     ],
//   };

//   const handleSelectLeague = (leagueId: string) => {
//     setSelectedLeagues((prev) =>
//       prev.includes(leagueId) ? prev.filter((id) => id !== leagueId) : [...prev, leagueId]
//     );
//   };

//   const currentLeagues = federations[activeFederation];
  
//   // Dynamic grid calculation with minimum card size
//   const getGridCols = (itemCount: number) => {
//     if (itemCount <= 3) return 'grid-cols-3';
//     if (itemCount <= 4) return 'grid-cols-4';
//     if (itemCount <= 5) return 'grid-cols-5';
//     if (itemCount <= 6) return 'grid-cols-6';
//     if (itemCount <= 8) return 'grid-cols-8';
//     // For 9+ items, use scrollable grid with fixed columns
//     return 'grid-cols-6';
//   };

//   const needsScroll = currentLeagues.length > 8;

//   return (
//     <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
//       {/* Header - Fixed height */}
//       <div className="flex-shrink-0 px-4 py-3">
//         <div className="max-w-7xl mx-auto">
//           <h2 className="text-2xl font-extrabold tracking-tight">Active Leagues</h2>
//           <p className="text-slate-400 text-sm">Select the countries you want to load into your game.</p>
//         </div>
//       </div>

//       {/* Federation Tabs - Fixed height */}
//       <div className="flex-shrink-0 px-4 pb-2">
//         <div className="max-w-7xl mx-auto flex items-center space-x-2">
//           {Object.keys(federations).map((fed) => (
//             <button
//               key={fed}
//               className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
//                 activeFederation === fed
//                   ? "bg-sky-600 text-white"
//                   : "bg-white/10 text-white/70 hover:bg-white/20"
//               }`}
//               onClick={() => setActiveFederation(fed)}
//             >
//               {fed} ({federations[fed].length})
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Main Content - Flexible with conditional scroll */}
//       <div className="flex-1 flex flex-col px-4 min-h-0">
//         <div className={`flex-1 max-w-7xl mx-auto w-full ${needsScroll ? 'overflow-y-auto' : ''}`}>
//           <div className={`grid gap-3 ${needsScroll ? 'pb-4' : 'h-full'} ${getGridCols(currentLeagues.length)}`}>
//             {currentLeagues.map((league) => (
//               <motion.div
//                 key={league.id}
//                 onClick={() => handleSelectLeague(league.id)}
//                 className={`relative p-3 rounded-xl cursor-pointer transition-all border flex flex-col justify-center ${
//                   needsScroll ? 'min-h-[80px]' : ''
//                 } ${
//                   selectedLeagues.includes(league.id)
//                     ? "bg-sky-600/20 border-sky-500 ring-1 ring-sky-500"
//                     : "bg-slate-800/60 border-white/10 hover:bg-slate-700/60"
//                 }`}
//                 whileHover={{ scale: 1.02 }}
//               >
//                 <div className="text-center">
//                   <h3 className="text-sm font-semibold leading-tight mb-1">{league.name}</h3>
//                   <p className="text-xs text-slate-400">Top Division</p>
//                 </div>
//                 {selectedLeagues.includes(league.id) && (
//                   <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
//                     <Check className="w-3 h-3" />
//                   </div>
//                 )}
//               </motion.div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Footer - Fixed height */}
//       <div className="flex-shrink-0 px-4 py-3">
//         <div className="max-w-7xl mx-auto flex justify-between items-center">
//           <div className="text-sm text-slate-400">
//             {selectedLeagues.length} league{selectedLeagues.length !== 1 ? 's' : ''} selected
//             {needsScroll && <span className="ml-2 text-amber-400">• Scroll for more</span>}
//           </div>
//           <button
//             onClick={() => onComplete(selectedLeagues)}
//             disabled={selectedLeagues.length === 0}
//             className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
//               selectedLeagues.length > 0
//                 ? "bg-sky-600 hover:bg-sky-500"
//                 : "bg-slate-700 text-slate-500 cursor-not-allowed"
//             }`}
//           >
//             Next: Select Club
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

// Import JSON data
import countriesData from "../../assets/countries.json"//".src/assets/countries.json";
import federationsData from "../../assets/federationsContinent.json";

interface Country {
  id: string;
  name: string;
  federationId: string;
  continentFedId: string;
  rank: number;
}

interface Federation {
  id: string;
  name: string;
  region: string;
  founded: number;
  hq: string;
  tournaments: string[];
}

interface CountriesByFederation {
  [federationId: string]: Country[];
}

export function ManagerLeagueSelection({ onComplete }: { onComplete: (countries: string[]) => void }) {
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [activeFederation, setActiveFederation] = useState<string>("");
  const [countriesByFederation, setCountriesByFederation] = useState<CountriesByFederation>({});
  const [federations, setFederations] = useState<Federation[]>([]);

  useEffect(() => {
    // Load and organize data
    const countries = countriesData as Country[];
    const feds = federationsData as Federation[];
    
    setFederations(feds);
    
    // Group countries by federation
    const grouped = countries.reduce((acc, country) => {
      if (!acc[country.continentFedId]) {
        acc[country.continentFedId] = [];
      }
      acc[country.continentFedId].push(country);
      return acc;
    }, {} as CountriesByFederation);

    // Sort countries by rank (lower rank = better)
    Object.keys(grouped).forEach(fedId => {
      grouped[fedId].sort((a, b) => a.rank - b.rank);
    });

    setCountriesByFederation(grouped);
    
    // Set default active federation to the first one with countries
    const federationWithCountries = feds.find(fed => grouped[fed.id]?.length > 0);
    if (federationWithCountries) {
      setActiveFederation(federationWithCountries.id);
    }
  }, []);

  const handleSelectCountry = (countryId: string) => {
    setSelectedCountries((prev) =>
      prev.includes(countryId) ? prev.filter((id) => id !== countryId) : [...prev, countryId]
    );
  };

  const currentCountries = countriesByFederation[activeFederation] || [];
  const activeFederationData = federations.find(f => f.id === activeFederation);
  
  // Dynamic grid calculation
  const getGridCols = (itemCount: number) => {
    if (itemCount <= 3) return 'grid-cols-3';
    if (itemCount <= 4) return 'grid-cols-4';
    if (itemCount <= 5) return 'grid-cols-5';
    if (itemCount <= 6) return 'grid-cols-6';
    if (itemCount <= 8) return 'grid-cols-8';
    return 'grid-cols-6';
  };

  const needsScroll = currentCountries.length > 8;

  if (federations.length === 0) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading federations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-extrabold tracking-tight">Active Countries</h2>
          <p className="text-slate-400 text-sm">Select the countries you want to load into your game.</p>
          {activeFederationData && (
            <p className="text-slate-500 text-xs mt-1">
              {activeFederationData.name} • {activeFederationData.region} • HQ: {activeFederationData.hq}
            </p>
          )}
        </div>
      </div>

      {/* Federation Tabs - Fixed height */}
      <div className="flex-shrink-0 px-4 pb-2">
        <div className="max-w-7xl mx-auto flex items-center space-x-2">
          {federations.map((fed) => {
            const countryCount = countriesByFederation[fed.id]?.length || 0;
            return (
              <button
                key={fed.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeFederation === fed.id
                    ? "bg-sky-600 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                } ${countryCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => countryCount > 0 && setActiveFederation(fed.id)}
                disabled={countryCount === 0}
              >
                {fed.id} ({countryCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content - Flexible with conditional scroll */}
      <div className="flex-1 flex flex-col px-4 min-h-0">
        <div className={`flex-1 max-w-7xl mx-auto w-full ${needsScroll ? 'overflow-y-auto' : ''}`}>
          {currentCountries.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-slate-400">No countries available in this federation.</p>
            </div>
          ) : (
            <div className={`grid gap-3 ${needsScroll ? 'pb-4' : 'h-full'} ${getGridCols(currentCountries.length)}`}>
              {currentCountries.map((country) => (
                <motion.div
                  key={country.id}
                  onClick={() => handleSelectCountry(country.id)}
                  className={`relative p-3 rounded-xl cursor-pointer transition-all border flex flex-col justify-center ${
                    needsScroll ? 'min-h-[90px]' : ''
                  } ${
                    selectedCountries.includes(country.id)
                      ? "bg-sky-600/20 border-sky-500 ring-1 ring-sky-500"
                      : "bg-slate-800/60 border-white/10 hover:bg-slate-700/60"
                  }`}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-center">
                    <h3 className="text-sm font-semibold leading-tight mb-1">{country.name}</h3>
                    <p className="text-xs text-slate-400">FIFA Rank: {country.rank}</p>
                    <p className="text-xs text-slate-500">{country.federationId}</p>
                  </div>
                  {selectedCountries.includes(country.id) && (
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
            {selectedCountries.length} countr{selectedCountries.length !== 1 ? 'ies' : 'y'} selected
            {needsScroll && <span className="ml-2 text-amber-400">• Scroll for more</span>}
          </div>
          <button
            onClick={() => onComplete(selectedCountries)}
            disabled={selectedCountries.length === 0}
            className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              selectedCountries.length > 0
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