

import { useState, useEffect } from "react";

// Import JSON data
import countriesData from "../../assets/countries.json";
import playersData from "../../assets/players.json";

interface Country {
  id: string;
  name: string;
  federationId: string;
  continentFedId: string;
  rank: number;
}

interface PlayerNames {
  [countryId: string]: {
    firstNames: string[];
    lastNames: string[];
  };
}

export function ManagerSetupScreen({ onComplete }: { onComplete: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: "",
    age: 35,
    nationality: "",
    coachingStyle: "Attacking",
  });
  const [countries, setCountries] = useState<Country[]>([]);
  const [playerNames, setPlayerNames] = useState<PlayerNames>({});

  useEffect(() => {
    // Load data
    const countryData = countriesData as Country[];
    const namesData = playersData as PlayerNames;
    
    // Sort countries by rank (better countries first)
    const sortedCountries = countryData.sort((a, b) => a.rank - b.rank);
    setCountries(sortedCountries);
    setPlayerNames(namesData);
    
    // Set default values
    if (sortedCountries.length > 0) {
      setFormData(prev => ({
        ...prev,
        nationality: sortedCountries[0].name
      }));
      
      // Generate a random manager name based on the first country
      generateRandomName(sortedCountries[0].id);
    }
  }, []);

  const generateRandomName = (countryId: string) => {
    const names = playerNames[countryId];
    if (names && names.firstNames.length > 0 && names.lastNames.length > 0) {
      const firstName = names.firstNames[Math.floor(Math.random() * names.firstNames.length)];
      const lastName = names.lastNames[Math.floor(Math.random() * names.lastNames.length)];
      setFormData(prev => ({ ...prev, name: `${firstName} ${lastName}` }));
    }
  };

  const handleChange = (e: { target: { name: any; value: any; }; }) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // If nationality changes, generate new random name
    if (name === 'nationality') {
      const selectedCountry = countries.find(c => c.name === value);
      if (selectedCountry && playerNames[selectedCountry.id]) {
        generateRandomName(selectedCountry.id);
      }
    }
  };

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    // Add additional country info to the form data
    const selectedCountry = countries.find(c => c.name === formData.nationality);
    const managerData = {
      ...formData,
      countryId: selectedCountry?.id || '',
      countryFederation: selectedCountry?.federationId || '',
      countryRank: selectedCountry?.rank || 0
    };
    
    onComplete(managerData);
  };

  const handleRandomizeName = () => {
    const selectedCountry = countries.find(c => c.name === formData.nationality);
    if (selectedCountry) {
      generateRandomName(selectedCountry.id);
    }
  };

    if (countries.length === 0) {
    return (
      <div className="w-screen h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading manager setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header - Fixed height */}
      <div className="flex-shrink-0 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-extrabold tracking-tight">Manager Profile</h2>
          <p className="text-slate-400 text-sm">Enter your details to start your journey.</p>
        </div>
      </div>
      
      {/* Main Content - Flexible */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="bg-slate-800/60 border border-white/10 rounded-xl shadow-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="text-sm font-medium text-slate-300 block mb-1">
                    Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 pr-16 bg-slate-700/50 rounded-md border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                      placeholder="Manager Name"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleRandomizeName}
                      className="absolute right-1 top-1 bottom-1 px-2 bg-slate-600 hover:bg-slate-500 rounded text-xs text-slate-200"
                    >
                      Random
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="age" className="text-sm font-medium text-slate-300 block mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700/50 rounded-md border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 text-sm"
                    min="25"
                    max="70"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nationality" className="text-sm font-medium text-slate-300 block mb-1">
                    Nationality
                  </label>
                  <select
                    id="nationality"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700/50 rounded-md border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none text-sm"
                    required
                  >
                    {countries.map((country) => (
                      <option key={country.id} value={country.name}>
                        {country.name} (FIFA Rank: {country.rank})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="coachingStyle" className="text-sm font-medium text-slate-300 block mb-1">
                    Coaching Style
                  </label>
                  <select
                    id="coachingStyle"
                    name="coachingStyle"
                    value={formData.coachingStyle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-700/50 rounded-md border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none text-sm"
                  >
                    <option>Attacking</option>
                    <option>Defensive</option>
                    <option>Possession-based</option>
                    <option>Counter-attacking</option>
                    <option>High-pressing</option>
                    <option>Balanced</option>
                  </select>
                </div>
              </div>
              
              {/* Manager Info Display */}
              <div className="bg-slate-700/30 rounded-lg p-3 mt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Manager Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500">From:</span> {formData.nationality}
                  </div>
                  <div>
                    <span className="text-slate-500">Style:</span> {formData.coachingStyle}
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 font-semibold text-sm transition-colors"
                >
                  Next: Select Countries
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )};
