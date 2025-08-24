import { useState, useEffect } from "react";
import { Search, Filter, TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import { Stat } from "../../global/components/Stat";
import type { FootballManagerDB } from "../../global/database/Save";
import type { Position } from "../../global/utils/PlayerGeneration";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  countryId: string;
  clubId: string | null;
  position: string;
  secondaryPosition?: Position | null;
  rating: number;
  potential: number;
  value: number;
  wage: number;
  height: number;
  weight: number;
  foot: string;
  personality: string;
  // Add the missing properties
  morale?: number;
  fitness?: number;
  matchSharpness?: number;
}

interface Transfer {
  id: string;
  playerId: string;
  fromClubId: string | null;
  toClubId: string | null;
  fee: number;
  date: string;
  type: 'permanent' | 'loan' | 'free' | 'release';
  status: 'completed' | 'pending' | 'rejected';
  contractLength: number;
  wage: number;
}

export function TransfersPanel({ 
  database, 
  managerData 
}: { 
  database: FootballManagerDB;
  managerData: any;
}) {
  const [activeTab, setActiveTab] = useState<'freeagents' | 'targets' | 'bids' | 'history'>('freeagents');
  const [freeAgents, setFreeAgents] = useState<Player[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [maxValueFilter, setMaxValueFilter] = useState<number>(50000000);
  const [clubBudget, setClubBudget] = useState({ transfer: 0, wage: 0 });

  const positions = ["GK", "LB", "CB", "RB", "LWB", "RWB", "CDM", "CM", "CAM", "LM", "RM", "LW", "RW", "CF", "ST"];

  useEffect(() => {
    loadTransferData();
  }, [database, managerData]);

  const loadTransferData = async () => {
    try {
      setLoading(true);
      
      // Load free agents
      const freeAgentsData = await database.getFreeAgents();
      setFreeAgents(freeAgentsData || []);

      // Load club budget
      if (managerData.selectedClub?.id) {
        const clubData = await database.getClub(managerData.selectedClub.id);
        if (clubData) {
          setClubBudget({
            transfer: clubData.transferBudget,
            wage: clubData.wageBudget
          });
        }

        // Load transfer history
        const transferHistory = await database.getTransfers(managerData.selectedClub.id);
        setTransfers(transferHistory || []);
      }
    } catch (error) {
      console.error('Error loading transfer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFreeAgents = freeAgents.filter(player => {
    const matchesSearch = searchTerm === "" || 
      `${player.firstName} ${player.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = positionFilter === "all" || 
      player.position === positionFilter || 
      player.secondaryPosition === positionFilter;
    
    const matchesValue = player.value <= maxValueFilter;

    return matchesSearch && matchesPosition && matchesValue;
  });

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

  const canAffordPlayer = (player: Player) => {
    const estimatedWage = Math.round(player.value * 0.0001); // Rough estimation
    return estimatedWage * 52 <= clubBudget.wage;
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
      {/* Transfer Budget Stats */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat 
          label="Transfer Budget" 
          value={`€${(clubBudget.transfer / 1000000).toFixed(1)}M`}
          size="sm" 
          icon={<DollarSign className="w-5 h-5" />}
        />
        <Stat 
          label="Wage Budget" 
          value={`€${(clubBudget.wage / 1000000).toFixed(1)}M`}
          size="sm" 
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <Stat 
          label="Free Agents" 
          value={freeAgents.length}
          size="sm" 
          icon={<Users className="w-5 h-5" />}
        />
        <Stat 
          label="Recent Transfers" 
          value={transfers.filter(t => t.status === 'completed').length}
          size="sm"
        />
      </div>

      {/* Tab Navigation */}
      <div className="col-span-12 mb-6">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          {[
            { key: 'freeagents', label: 'Free Agents', icon: Users },
            { key: 'targets', label: 'Targets', icon: TrendingUp },
            { key: 'bids', label: 'Bids', icon: DollarSign },
            { key: 'history', label: 'History', icon: TrendingDown }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeTab === tab.key
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Filter Controls */}
      {activeTab === 'freeagents' && (
        <div className="col-span-12 mb-6">
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search free agents..."
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Max Value:</span>
              <select
                value={maxValueFilter}
                onChange={(e) => setMaxValueFilter(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value={50000000}>€50M</option>
                <option value={20000000}>€20M</option>
                <option value={10000000}>€10M</option>
                <option value={5000000}>€5M</option>
                <option value={1000000}>€1M</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Content based on active tab */}
      <div className="col-span-12">
        {activeTab === 'freeagents' && (
          <div>
            {filteredFreeAgents.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No free agents found</h3>
                <p className="text-slate-500">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFreeAgents.slice(0, 20).map((player) => (
                  <div
                    key={player.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-all duration-200"
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

                    <div className="flex items-center justify-between mb-4">
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
                      <div className="text-xs text-slate-500">
                        Est. Wage: €{Math.round(player.value * 0.0001 / 1000)}K/wk
                      </div>
                      <div className="flex gap-2">
                        <button
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            canAffordPlayer(player)
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          }`}
                          disabled={!canAffordPlayer(player)}
                        >
                          {canAffordPlayer(player) ? 'Scout' : 'Too Expensive'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'targets' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Transfer Targets</h3>
            <p className="text-slate-500 mb-4">Scout players to add them to your transfer targets</p>
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
              Browse Free Agents
            </button>
          </div>
        )}

        {activeTab === 'bids' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Active Bids</h3>
            <p className="text-slate-500">Your transfer bids will appear here</p>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200">
              <h4 className="font-semibold text-slate-800">Transfer History</h4>
              <p className="text-sm text-slate-500">Recent completed transfers</p>
            </div>
            <div className="p-6">
              {transfers.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingDown className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <h4 className="font-medium text-slate-600 mb-2">No Transfer History</h4>
                  <p className="text-slate-500">Your completed transfers will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transfers.slice(0, 10).map((transfer) => (
                    <div key={transfer.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <div className="font-medium text-slate-800">Transfer #{transfer.id.slice(-8)}</div>
                        <div className="text-sm text-slate-500">
                          {transfer.date} • {transfer.type} • {transfer.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-800">€{(transfer.fee / 1000000).toFixed(1)}M</div>
                        <div className="text-sm text-slate-500">{transfer.contractLength}yr contract</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}