import { useState, useEffect } from "react";
import { Search, Filter, Heart, Zap, Activity } from "lucide-react";
import { Stat } from "../../global/components/Stat";
import type { FootballManagerDB } from "../../global/database/Save";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  countryId: string;
  clubId: string;
  position: string;
  secondaryPosition?: string;
  rating: number;
  potential: number;
  value: number;
  wage: number;
  height: number;
  weight: number;
  foot: string;
  personality: string;
  form: number;
  morale: number;
  fitness: number;
  matchSharpness: number;
}

export function SquadPanel({ 
  database, 
  managerData 
}: { 
  database: FootballManagerDB;
  managerData: any;
}) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const positions = ["GK", "LB", "CB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"];

  useEffect(() => {
    loadSquad();
  }, [database, managerData]);

  useEffect(() => {
    filterPlayers();
  }, [players, searchTerm, positionFilter]);

  const loadSquad = async () => {
    try {
      setLoading(true);
      if (managerData.selectedClub?.id) {
        const squadData = await database.getClubPlayers(managerData.selectedClub.id);
        setPlayers(squadData as Player[] || []);
      }
    } catch (error) {
      console.error('Error loading squad:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = [...players];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(player =>
        `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Position filter
    if (positionFilter !== "all") {
      filtered = filtered.filter(player =>
        player.position === positionFilter || player.secondaryPosition === positionFilter
      );
    }

    setFilteredPlayers(filtered);
  };

  const getPositionColor = (position: string) => {
    if (position === 'GK') return 'bg-yellow-100 text-yellow-800';
    if (['LB', 'CB', 'RB', 'LWB', 'RWB'].includes(position)) return 'bg-blue-100 text-blue-800';
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(position)) return 'bg-green-100 text-green-800';
    if (['LW', 'RW', 'CF', 'ST'].includes(position)) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 80) return 'text-emerald-600';
    if (rating >= 70) return 'text-blue-600';
    if (rating >= 60) return 'text-yellow-600';
    return 'text-slate-600';
  };

  const getFormIcon = (form: number) => {
    if (form >= 80) return <Zap className="w-4 h-4 text-green-500" />;
    if (form >= 60) return <Activity className="w-4 h-4 text-yellow-500" />;
    return <Activity className="w-4 h-4 text-red-500" />;
  };

  const getMoraleIcon = (morale: number) => {
    if (morale >= 80) return <Heart className="w-4 h-4 text-red-500 fill-current" />;
    if (morale >= 60) return <Heart className="w-4 h-4 text-yellow-500" />;
    return <Heart className="w-4 h-4 text-gray-400" />;
  };

  const squadStats = {
    totalPlayers: players.length,
    avgRating: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.rating, 0) / players.length) : 0,
    injuries: players.filter(p => p.fitness < 100).length,
    goodForm: players.filter(p => p.form >= 75).length,
    avgAge: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.age, 0) / players.length) : 0,
    avgMorale: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.morale, 0) / players.length) : 0
  };

  if (loading) {
    return (
      <div className="col-span-12 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Squad Statistics */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Stat label="Total Players" value={squadStats.totalPlayers} size="sm" />
        <Stat label="Avg Rating" value={squadStats.avgRating} size="sm" />
        <Stat label="Avg Age" value={squadStats.avgAge} size="sm" />
        <Stat label="Good Form" value={squadStats.goodForm} size="sm" color="green" />
        <Stat label="Injuries" value={squadStats.injuries} size="sm" color={squadStats.injuries > 0 ? "red" : "green"} />
        <Stat label="Squad Morale" value={`${squadStats.avgMorale}%`} size="sm" />
      </div>

      {/* Search and Filter Controls */}
      <div className="col-span-12 mb-6">
        <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Positions</option>
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      <div className="col-span-12">
        {filteredPlayers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-slate-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No players found</h3>
            <p className="text-slate-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02]"
                onClick={() => setSelectedPlayer(player)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-slate-800">
                      {player.firstName} {player.lastName}
                    </h4>
                    <p className="text-sm text-slate-500">Age {player.age}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPositionColor(player.position)}`}>
                    {player.position}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="text-center">
                    <div className={`text-xl font-bold ${getRatingColor(player.rating)}`}>
                      {player.rating}
                    </div>
                    <div className="text-xs text-slate-400">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-600">
                      {player.potential}
                    </div>
                    <div className="text-xs text-slate-400">Potential</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-600">
                      €{(player.value / 1000000).toFixed(1)}M
                    </div>
                    <div className="text-xs text-slate-400">Value</div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {getFormIcon(player.form)}
                    <span className="text-xs text-slate-500">Form</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {getMoraleIcon(player.morale)}
                    <span className="text-xs text-slate-500">Morale</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {player.fitness}% fit
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal 
          player={selectedPlayer} 
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  );
}

function PlayerDetailModal({ player, onClose }: { player: Player; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {player.firstName} {player.lastName}
              </h2>
              <p className="text-slate-500">
                {player.position} • Age {player.age} • {player.foot} footed
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">{player.rating}</div>
              <div className="text-sm text-slate-500">Current Rating</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{player.potential}</div>
              <div className="text-sm text-slate-500">Potential</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-lg font-bold text-slate-700">€{(player.value / 1000000).toFixed(1)}M</div>
              <div className="text-sm text-slate-500">Market Value</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-lg font-bold text-slate-700">€{(player.wage / 1000).toFixed(0)}K</div>
              <div className="text-sm text-slate-500">Weekly Wage</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Physical</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Height:</span>
                  <span className="font-medium">{player.height}cm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Weight:</span>
                  <span className="font-medium">{player.weight}kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Preferred Foot:</span>
                  <span className="font-medium">{player.foot}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Form:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${player.form}%` }}
                      />
                    </div>
                    <span className="font-medium text-sm">{player.form}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Morale:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${player.morale}%` }}
                      />
                    </div>
                    <span className="font-medium text-sm">{player.morale}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Fitness:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all duration-300"
                        style={{ width: `${player.fitness}%` }}
                      />
                    </div>
                    <span className="font-medium text-sm">{player.fitness}%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Match Sharpness:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 rounded-full transition-all duration-300"
                        style={{ width: `${player.matchSharpness}%` }}
                      />
                    </div>
                    <span className="font-medium text-sm">{player.matchSharpness}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold text-slate-800 mb-3">Personality</h3>
            <div className="p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-700">{player.personality}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
              View Full Profile
            </button>
            <button className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              Contract Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}