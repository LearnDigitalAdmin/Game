import { useState, useEffect } from "react";
import { Building, Users, TrendingUp, Award, DollarSign, Target, Heart, Star, Wrench, GraduationCap, TrendingDown, AlertTriangle } from "lucide-react";
import type { FootballManagerDB } from "../../global/database/Save";

interface ClubData {
  id: string;
  name: string;
  divisionId: string;
  countryId: string;
  rank: number;
  status: 'pro' | 'semi-pro';
  balance: 'rich' | 'average' | 'poor';
  reputation: string;
  boardConfidence: number;
  fanSupport: number;
  transferBudget: number;
  wageBudget: number;
  facilities: number;
  training: number;
  youth: number;
}

interface StaffMember {
  id: string;
  clubId: string;
  name: string;
  role: string;
  age: number;
  nationality: string;
  rating: number;
  wage: number;
  contractEnd: string;
}

interface Division {
  id: string;
  name: string;
  countryId: string;
  tier: number;
  clubs: number;
  season: string;
  matchday: number;
  status: 'active' | 'finished' | 'paused';
}

interface LeaguePosition {
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export function ClubPanel({ 
  database, 
  managerData 
}: { 
  database: FootballManagerDB;
  managerData: any;
}) {
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [division, setDivision] = useState<Division | null>(null);
  const [leaguePosition, setLeaguePosition] = useState<LeaguePosition | null>(null);
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClubData();
  }, [database, managerData]);

  const loadClubData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!managerData?.selectedClub?.id && !managerData?.clubId) {
        throw new Error('No club selected');
      }

      const clubId = managerData.selectedClub?.id || managerData.clubId;
      
      // Load club data
      const club = await database.getClub(clubId);
      if (!club) {
        throw new Error('Club not found');
      }
      setClubData(club);

      // Load division data
      if (club.divisionId) {
        const divisions = await database.getDivisions();
        const clubDivision = divisions.find(d => d.id === club.divisionId);
        setDivision(clubDivision || null);
      }

      // Load league position
      if (club.divisionId) {
        const leagueTable = await database.getLeagueTable(club.divisionId);
        const clubPosition = leagueTable.find(t => t.teamId === clubId);
        if (clubPosition) {
          setLeaguePosition({
            position: clubPosition.position,
            points: clubPosition.points,
            played: clubPosition.played,
            won: clubPosition.won,
            drawn: clubPosition.drawn,
            lost: clubPosition.lost,
            goalsFor: clubPosition.goalsFor,
            goalsAgainst: clubPosition.goalsAgainst,
            goalDifference: clubPosition.goalDifference
          });
        }
      }

      // Load staff
      const clubStaff = await database.getClubStaff(clubId);
      setStaff(clubStaff || []);

      // Load player count
      const players = await database.getClubPlayers(clubId);
      setPlayerCount(players.length);

    } catch (error) {
      console.error('Error loading club data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load club data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}K`;
    }
    return `€${amount.toLocaleString()}`;
  };

  const getReputationData = (reputation: string) => {
    const repMap: Record<string, { color: string; icon: any; level: number }> = {
      'local': { color: 'text-slate-600 bg-slate-100', icon: Building, level: 1 },
      'regional': { color: 'text-blue-600 bg-blue-100', icon: Target, level: 2 },
      'national': { color: 'text-emerald-600 bg-emerald-100', icon: Award, level: 3 },
      'continental': { color: 'text-purple-600 bg-purple-100', icon: Star, level: 4 },
      'worldwide': { color: 'text-amber-600 bg-amber-100', icon: Award, level: 5 }
    };
    return repMap[reputation.toLowerCase()] || repMap.local;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-emerald-600 bg-emerald-100';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getFacilityData = (rating: number) => {
    if (rating >= 80) return { text: 'Excellent', color: 'text-emerald-600 bg-emerald-100' };
    if (rating >= 60) return { text: 'Good', color: 'text-blue-600 bg-blue-100' };
    if (rating >= 40) return { text: 'Average', color: 'text-yellow-600 bg-yellow-100' };
    return { text: 'Poor', color: 'text-red-600 bg-red-100' };
  };

  const getBalanceData = (balance: string) => {
    const balanceMap: Record<string, { color: string; icon: any }> = {
      'rich': { color: 'text-emerald-600 bg-emerald-100', icon: TrendingUp },
      'average': { color: 'text-yellow-600 bg-yellow-100', icon: DollarSign },
      'poor': { color: 'text-red-600 bg-red-100', icon: TrendingDown }
    };
    return balanceMap[balance] || balanceMap.average;
  };

  const getPositionColor = (position: number, totalTeams: number) => {
    const topThird = Math.ceil(totalTeams / 3);
    const middleThird = Math.ceil((totalTeams * 2) / 3);
    
    if (position <= topThird) return 'text-emerald-600 bg-emerald-100';
    if (position <= middleThird) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="col-span-12 p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-slate-600 font-medium">Loading club information...</span>
        </div>
      </div>
    );
  }

  if (error || !clubData) {
    return (
      <div className="col-span-12 p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-center h-64 text-center">
          <div className="space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-slate-900">Unable to load club data</h3>
              <p className="text-slate-500 mt-1">{error || 'Please try refreshing the page'}</p>
              <button 
                onClick={loadClubData}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const reputationData = getReputationData(clubData.reputation);
  const balanceData = getBalanceData(clubData.balance);
  const facilitiesData = getFacilityData(clubData.facilities);
  const trainingData = getFacilityData(clubData.training);
  const youthData = getFacilityData(clubData.youth);

  return (
    <div className="col-span-12 space-y-6">
      {/* Club Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{clubData.name}</h2>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <Building className="w-4 h-4" />
                {division?.name || 'Unknown Division'}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {playerCount} Players
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                {clubData.status === 'pro' ? 'Professional' : 'Semi-Professional'}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${reputationData.color}`}>
              <reputationData.icon className="w-4 h-4" />
              {clubData.reputation}
            </div>
          </div>
        </div>
      </div>

      {/* League Position & Form */}
      {leaguePosition && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">League Performance</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold ${getPositionColor(leaguePosition.position, division?.clubs || 20)}`}>
                {leaguePosition.position}
              </div>
              <div className="text-sm text-slate-600 mt-1">Position</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">{leaguePosition.points}</div>
              <div className="text-sm text-slate-600">Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{leaguePosition.won}</div>
              <div className="text-sm text-slate-600">Won</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{leaguePosition.drawn}</div>
              <div className="text-sm text-slate-600">Drawn</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{leaguePosition.lost}</div>
              <div className="text-sm text-slate-600">Lost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-900">
                {leaguePosition.goalDifference > 0 ? '+' : ''}{leaguePosition.goalDifference}
              </div>
              <div className="text-sm text-slate-600">Goal Diff</div>
            </div>
          </div>
        </div>
      )}

      {/* Financial & Support */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Finances
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Financial Status</span>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${balanceData.color}`}>
                <balanceData.icon className="w-3 h-3" />
                {clubData.balance.charAt(0).toUpperCase() + clubData.balance.slice(1)}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Transfer Budget</span>
              <span className="font-semibold text-slate-900">{formatCurrency(clubData.transferBudget)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Wage Budget</span>
              <span className="font-semibold text-slate-900">{formatCurrency(clubData.wageBudget)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Weekly Wages</span>
              <span className="font-semibold text-slate-900">{formatCurrency(clubData.wageBudget / 52)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Support & Confidence
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Board Confidence</span>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getConfidenceColor(clubData.boardConfidence)}`}>
                {clubData.boardConfidence}%
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Fan Support</span>
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getConfidenceColor(clubData.fanSupport)}`}>
                {clubData.fanSupport}%
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Club Rank</span>
              <span className="font-semibold text-slate-900">#{clubData.rank}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Squad Size</span>
              <span className="font-semibold text-slate-900">{playerCount} players</span>
            </div>
          </div>
        </div>
      </div>

      {/* Facilities */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-blue-600" />
          Facilities & Infrastructure
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium ${facilitiesData.color}`}>
              <Building className="w-4 h-4" />
              {facilitiesData.text}
            </div>
            <div className="text-slate-600 mt-2">General Facilities</div>
            <div className="text-xs text-slate-500">{clubData.facilities}/100</div>
          </div>
          <div className="text-center">
            <div className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium ${trainingData.color}`}>
              <Target className="w-4 h-4" />
              {trainingData.text}
            </div>
            <div className="text-slate-600 mt-2">Training Facilities</div>
            <div className="text-xs text-slate-500">{clubData.training}/100</div>
          </div>
          <div className="text-center">
            <div className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium ${youthData.color}`}>
              <GraduationCap className="w-4 h-4" />
              {youthData.text}
            </div>
            <div className="text-slate-600 mt-2">Youth Facilities</div>
            <div className="text-xs text-slate-500">{clubData.youth}/100</div>
          </div>
        </div>
      </div>

      {/* Staff Overview */}
      {staff.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Coaching Staff ({staff.length})
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.slice(0, 6).map((staffMember) => (
              <div key={staffMember.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-slate-900">{staffMember.name}</div>
                  <div className="text-sm text-slate-600">{staffMember.role}</div>
                  <div className="text-xs text-slate-500">{staffMember.nationality} • Age {staffMember.age}</div>
                </div>
                <div className="text-right">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    staffMember.rating >= 80 ? 'bg-emerald-100 text-emerald-700' :
                    staffMember.rating >= 60 ? 'bg-blue-100 text-blue-700' :
                    staffMember.rating >= 40 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {staffMember.rating}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{formatCurrency(staffMember.wage)}/w</div>
                </div>
              </div>
            ))}
          </div>
          {staff.length > 6 && (
            <div className="mt-4 text-center">
              <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                View all {staff.length} staff members →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}