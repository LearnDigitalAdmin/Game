import { useState, useEffect } from "react";
import { Stat } from "../../global/components/Stat";
import { ChevronLeft, ChevronRight, Trophy, Users, TrendingUp } from "lucide-react";
import type { FootballManagerDB } from "../../global/database/Save";

interface LeagueTable {
  id: string;
  divisionId: string;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string;
  position: number;
}

interface Division {
  id: string;
  name: string;
  countryId: string;
  tier: number;
  clubs: number;
}

export function ManagerDashboard({ 
  database, 
  managerData 
}: { 
  palette: any;
  database: FootballManagerDB;
  managerData: any;
}) {
  const [activeView, setActiveView] = useState<'table' | 'stats' | 'players'>('table');
  const [currentDivision, setCurrentDivision] = useState<string>('');
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [leagueTable, setLeagueTable] = useState<LeagueTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [userClubPosition, setUserClubPosition] = useState<number>(0);
  const [topScorers, setTopScorers] = useState<
    Array<{ playerId: string; firstName: string; lastName: string; clubName: string; goals: number; assists: number }>
  >([]);

  useEffect(() => {
    loadData();
  }, [database, managerData]);

  useEffect(() => {
    if (currentDivision) {
      loadLeagueTable(currentDivision);
      loadTopScorers(currentDivision);
    }
  }, [currentDivision, database]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get all divisions
      const divisionsData = await database.getDivisions();
      setDivisions(divisionsData);
      
      // Set current division to user's club division
      if (managerData.selectedClub && divisionsData.length > 0) {
        const userDivision = managerData.selectedClub.divisionId;
        setCurrentDivision(userDivision);
      } else if (divisionsData.length > 0) {
        setCurrentDivision(divisionsData[0].id);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLeagueTable = async (divisionId: string) => {
    try {
      const tableData = await database.getLeagueTable(divisionId);
      setLeagueTable(tableData);
      
      // Find user club position
      if (managerData.selectedClub) {
        const userTeam = tableData.find(team => team.teamId === managerData.selectedClub.id);
        setUserClubPosition(userTeam?.position || 0);
      }
    } catch (error) {
      console.error('Error loading league table:', error);
    }
  };

  const loadTopScorers = async (divisionId: string) => {
    try {
      const gameState = await database.getGameState();
      const season = gameState?.currentSeason ?? '2024-25';
      const scorers = await database.getTopScorers(divisionId, season, 5);
      setTopScorers(scorers);
    } catch (error) {
      console.error('Error loading top scorers:', error);
    }
  };

  const handleDivisionChange = (direction: 'prev' | 'next') => {
    const currentIndex = divisions.findIndex(d => d.id === currentDivision);
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentDivision(divisions[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < divisions.length - 1) {
      setCurrentDivision(divisions[currentIndex + 1].id);
    }
  };

  const getFormColor = (form: string, index: number) => {
    const char = form[index];
    if (char === 'W') return 'bg-green-500';
    if (char === 'D') return 'bg-yellow-500';
    if (char === 'L') return 'bg-red-500';
    return 'bg-gray-300';
  };

  const getPositionColor = (position: number, isUserClub: boolean) => {
    if (isUserClub) return 'bg-blue-50 border-blue-200';
    if (position <= 3) return 'bg-green-50 border-green-200';
    if (position >= leagueTable.length - 3) return 'bg-red-50 border-red-200';
    return 'bg-white border-slate-200';
  };

  const currentDivisionData = divisions.find(d => d.id === currentDivision);

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
      <div className="col-span-12 md:col-span-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
        {/* Header with view controls */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="text-lg font-semibold text-slate-800">League Dashboard</h4>
            <p className="text-sm text-slate-500">Competition overview and standings</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('table')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'table' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-1" />
              Table
            </button>
            <button
              onClick={() => setActiveView('stats')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'stats' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Stats
            </button>
            <button
              onClick={() => setActiveView('players')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeView === 'players' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 inline mr-1" />
              Players
            </button>
          </div>
        </div>

        {/* Division selector */}
        {divisions.length > 1 && (
          <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg">
            <button
              onClick={() => handleDivisionChange('prev')}
              disabled={divisions.findIndex(d => d.id === currentDivision) === 0}
              className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h5 className="font-semibold text-slate-800">
                {currentDivisionData?.name || 'League'}
              </h5>
              <p className="text-xs text-slate-500">
                Tier {currentDivisionData?.tier} • {currentDivisionData?.clubs} clubs
              </p>
            </div>
            <button
              onClick={() => handleDivisionChange('next')}
              disabled={divisions.findIndex(d => d.id === currentDivision) === divisions.length - 1}
              className="p-1 rounded text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content based on active view */}
        {activeView === 'table' && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {leagueTable.map((team) => {
              const isUserClub = team.teamId === managerData.selectedClub?.id;
              return (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${getPositionColor(team.position, isUserClub)}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                      {team.position}
                    </div>
                    <div>
                      <h6 className={`font-medium ${isUserClub ? 'text-blue-700' : 'text-slate-800'}`}>
                        {team.teamName}
                      </h6>
                      <div className="flex items-center gap-1 mt-1">
                        {team.form.split('').map((result, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${getFormColor(team.form, i)}`}
                            title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : result === 'L' ? 'Loss' : 'No data'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-slate-600">{team.played}</div>
                      <div className="text-xs text-slate-400">P</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-600">{team.won}-{team.drawn}-{team.lost}</div>
                      <div className="text-xs text-slate-400">W-D-L</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-600">{team.goalsFor}:{team.goalsAgainst}</div>
                      <div className="text-xs text-slate-400">GF:GA</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-bold ${team.goalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                      </div>
                      <div className="text-xs text-slate-400">GD</div>
                    </div>
                    <div className="text-center min-w-[40px]">
                      <div className="font-bold text-slate-800">{team.points}</div>
                      <div className="text-xs text-slate-400">Pts</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeView === 'stats' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h6 className="font-medium text-slate-800 mb-2">Top Scorers</h6>
              {topScorers.length === 0 ? (
                <p className="text-sm text-slate-500">No goals scored yet this season.</p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {topScorers.map((scorer, i) => (
                    <li key={scorer.playerId} className="flex justify-between text-slate-700">
                      <span>
                        {i + 1}. {scorer.firstName} {scorer.lastName}
                        <span className="text-slate-400"> · {scorer.clubName}</span>
                      </span>
                      <span className="font-semibold">{scorer.goals}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h6 className="font-medium text-slate-800 mb-2">Best Defense</h6>
              {leagueTable.length === 0 ? (
                <p className="text-sm text-slate-500">No matches played yet.</p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {[...leagueTable]
                    .filter((t) => t.played > 0)
                    .sort((a, b) => a.goalsAgainst - b.goalsAgainst)
                    .slice(0, 5)
                    .map((team, i) => (
                      <li key={team.teamId} className="flex justify-between text-slate-700">
                        <span>{i + 1}. {team.teamName}</span>
                        <span className="font-semibold">{team.goalsAgainst}</span>
                      </li>
                    ))}
                </ol>
              )}
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h6 className="font-medium text-slate-800 mb-2">Best Attack</h6>
              {leagueTable.length === 0 ? (
                <p className="text-sm text-slate-500">No matches played yet.</p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {[...leagueTable]
                    .filter((t) => t.played > 0)
                    .sort((a, b) => b.goalsFor - a.goalsFor)
                    .slice(0, 5)
                    .map((team, i) => (
                      <li key={team.teamId} className="flex justify-between text-slate-700">
                        <span>{i + 1}. {team.teamName}</span>
                        <span className="font-semibold">{team.goalsFor}</span>
                      </li>
                    ))}
                </ol>
              )}
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <h6 className="font-medium text-slate-800 mb-2">In-Form Teams</h6>
              {leagueTable.length === 0 ? (
                <p className="text-sm text-slate-500">No matches played yet.</p>
              ) : (
                <ol className="space-y-1 text-sm">
                  {[...leagueTable]
                    .filter((t) => t.played > 0)
                    .sort((a, b) => {
                      const score = (form: string) =>
                        form.split('').reduce((sum, c) => sum + (c === 'W' ? 3 : c === 'D' ? 1 : 0), 0);
                      return score(b.form) - score(a.form);
                    })
                    .slice(0, 5)
                    .map((team, i) => (
                      <li key={team.teamId} className="flex items-center justify-between text-slate-700">
                        <span>{i + 1}. {team.teamName}</span>
                        <span className="flex gap-0.5">
                          {team.form.split('').map((_, idx) => (
                            <span key={idx} className={`w-2 h-2 rounded-full ${getFormColor(team.form, idx)}`} />
                          ))}
                        </span>
                      </li>
                    ))}
                </ol>
              )}
            </div>
          </div>
        )}

        {activeView === 'players' && (
          <div>
            <h6 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Top Scorers This Season
            </h6>
            {topScorers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-sm text-slate-500">No player statistics yet. Play some matches to see the leaders.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {topScorers.map((scorer) => (
                  <div
                    key={scorer.playerId}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-slate-800">
                        {scorer.firstName} {scorer.lastName}
                      </div>
                      <div className="text-sm text-slate-500">{scorer.clubName}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold text-slate-800">{scorer.goals} goals</div>
                      <div className="text-slate-500">{scorer.assists} assists</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="col-span-12 md:col-span-4 grid grid-cols-2 gap-5">
        <Stat 
          label="League Position" 
          value={userClubPosition > 0 ? `${userClubPosition}${getOrdinalSuffix(userClubPosition)}` : 'N/A'} 
        />
        <Stat label="Next Match" value="vs. Rival" />
        <Stat label="Fan Support" value="95%" />
        <Stat label="Board Confidence" value="Very High" />
      </div>

      <div className="col-span-12 grid md:grid-cols-2 gap-5">
        <Stat label="Player Morale" value="Excellent" />
        <Stat label="Tactical Mastery" value="High" />
        <Stat label="Transfer Budget" value="€5.2M" />
        <Stat label="Club Reputation" value="Regional" />
      </div>
    </>
  );
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return num + "st";
  }
  if (j === 2 && k !== 12) {
    return num + "nd";
  }
  if (j === 3 && k !== 13) {
    return num + "rd";
  }
  return num + "th";
}