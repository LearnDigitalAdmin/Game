import { useState, useEffect, useMemo } from "react";
import { Sparkles, Calendar, MapPin, Clock, Users } from "lucide-react";
import { Stat } from "../../global/components/Stat";
import { Modal, LoadingSpinner } from "../../global/components/Modal";
import type { FootballManagerDB, Fixture as SaveFixture } from "../../global/database/Save";
import { MatchService, DEFAULT_FORMATION, FORMATIONS } from "../../global/engine/MatchService";
import { MatchContainer } from "../../global/engine/MatchContainer";
import type { MatchSetup } from "../../global/engine/types/MatchTypes";
import type { MatchResult } from "../../global/engine/MatchEngine";

interface Fixture {
  id: string;
  divisionId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  matchday: number;
  date: string;
  time: string;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  homeScore: number | null;
  awayScore: number | null;
  attendance: number | null;
  venue: string;
  competition: string;
}

export function FixturesPanel({ 
  managerData, 
  database 
}: { 
  managerData: any;
  database: FootballManagerDB;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pressConference, setPressConference] = useState("");
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [upcomingFixtures, setUpcomingFixtures] = useState<Fixture[]>([]);
  const [recentResults, setRecentResults] = useState<Fixture[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeSetup, setActiveSetup] = useState<MatchSetup | null>(null);
  const [activeFixture, setActiveFixture] = useState<SaveFixture | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const matchService = useMemo(() => new MatchService(database), [database]);

  useEffect(() => {
    loadFixtures();
  }, [database, managerData]);

  const loadFixtures = async () => {
    try {
      setDataLoading(true);
      if (managerData.selectedClub?.id) {
        // Get all fixtures for the club
        const allFixtures = await database.getFixtures();
        const clubFixtures = allFixtures.filter(fixture => 
          fixture.homeTeamId === managerData.selectedClub.id || 
          fixture.awayTeamId === managerData.selectedClub.id
        );

        setFixtures(clubFixtures);

        // Get upcoming fixtures (next 5)
        const upcoming = clubFixtures
          .filter(fixture => fixture.status === 'scheduled')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);
        setUpcomingFixtures(upcoming);

        // Get recent results (last 5)
        const recent = clubFixtures
          .filter(fixture => fixture.status === 'finished')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);
        setRecentResults(recent);
      }
    } catch (error) {
      console.error('Error loading fixtures:', error);
    } finally {
      setDataLoading(false);
    }
  };

  /**
   * Open the live match for a fixture. Anything still outstanding from an
   * earlier date is settled first so the table is current at kick-off.
   */
  const handlePlayMatch = async (fixture: SaveFixture) => {
    setPreparing(true);
    setMatchError(null);

    try {
      await matchService.simulateDueFixtures(fixture.date, fixture.id);

      const club = managerData.selectedClub?.id ? await database.getClub(managerData.selectedClub.id) : null;
      const userFormation = FORMATIONS.find((f) => f.name === club?.formation) ?? DEFAULT_FORMATION;

      const setup = await matchService.prepareMatch(
        fixture,
        managerData.selectedClub?.id,
        userFormation
      );

      if (!setup) {
        setMatchError('This fixture cannot be played because a squad is missing.');
        return;
      }

      setActiveFixture(fixture);
      setActiveSetup(setup);
    } catch (error) {
      console.error('Failed to start match:', error);
      setMatchError('Something went wrong starting the match.');
    } finally {
      setPreparing(false);
    }
  };

  /**
   * Store the result, play out the rest of the matchday, and refresh.
   */
  const handleMatchComplete = async (result: MatchResult) => {
    if (!activeFixture) return;

    try {
      await matchService.applyResult(activeFixture, result);
      await matchService.simulateDueFixtures(activeFixture.date);
    } catch (error) {
      console.error('Failed to record match result:', error);
    } finally {
      setActiveSetup(null);
      setActiveFixture(null);
      await loadFixtures();
    }
  };

  const handleGeneratePressConference = async () => {
    setModalOpen(true);
    setLoading(true);
    setPressConference("");
    
    const nextOpponent = upcomingFixtures[0];
    const opponentName = nextOpponent 
      ? (nextOpponent.homeTeamId === managerData.selectedClub?.id 
          ? nextOpponent.awayTeamName 
          : nextOpponent.homeTeamName)
      : "FC Dynamo";
    
    const userClub = managerData.selectedClub?.name || "Your Club";
    const generatedText = `You are a football manager named "${managerData.name}" from ${managerData.nationality}, managing ${userClub}. It's the pre-match press conference before a big match against a strong rival, ${opponentName}. Write a short, two-question Q&A session. One question should be about the opponent's threat, and the other about the team's preparations. Answer in the professional, confident tone of a football manager.`;
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPressConference(generatedText);
    setLoading(false);
  };

  const getResultColor = (fixture: Fixture, isHome: boolean) => {
    if (fixture.homeScore === null || fixture.awayScore === null) return 'bg-slate-100';
    
    const userScore = isHome ? fixture.homeScore : fixture.awayScore;
    const opponentScore = isHome ? fixture.awayScore : fixture.homeScore;
    
    if (userScore > opponentScore) return 'bg-green-100 border-green-200';
    if (userScore < opponentScore) return 'bg-red-100 border-red-200';
    return 'bg-yellow-100 border-yellow-200';
  };

  const getResultIcon = (fixture: Fixture, isHome: boolean) => {
    if (fixture.homeScore === null || fixture.awayScore === null) return '-';
    
    const userScore = isHome ? fixture.homeScore : fixture.awayScore;
    const opponentScore = isHome ? fixture.awayScore : fixture.homeScore;
    
    if (userScore > opponentScore) return 'W';
    if (userScore < opponentScore) return 'L';
    return 'D';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFixtureStats = () => {
    const totalPlayed = fixtures.filter(f => f.status === 'finished').length;
    const wins = fixtures.filter(f => {
      if (f.status !== 'finished' || f.homeScore === null || f.awayScore === null) return false;
      const isHome = f.homeTeamId === managerData.selectedClub?.id;
      const userScore = isHome ? f.homeScore : f.awayScore;
      const opponentScore = isHome ? f.awayScore : f.homeScore;
      return userScore > opponentScore;
    }).length;
    
    const draws = fixtures.filter(f => {
      if (f.status !== 'finished' || f.homeScore === null || f.awayScore === null) return false;
      return f.homeScore === f.awayScore;
    }).length;

    return { totalPlayed, wins, draws, losses: totalPlayed - wins - draws };
  };

  const stats = getFixtureStats();

  if (activeSetup) {
    return (
      <div className="col-span-12 fixed inset-0 z-50">
        <MatchContainer
          setup={activeSetup}
          onMatchComplete={handleMatchComplete}
          onClose={() => {
            setActiveSetup(null);
            setActiveFixture(null);
          }}
        />
      </div>
    );
  }

  if (dataLoading) {
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
      {/* Match Statistics */}
      <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat 
          label="Matches Played" 
          value={stats.totalPlayed}
          size="sm" 
          icon={<Calendar className="w-5 h-5" />}
        />
        <Stat 
          label="Wins" 
          value={stats.wins}
          size="sm" 
          color="green"
        />
        <Stat 
          label="Draws" 
          value={stats.draws}
          size="sm" 
          color="yellow"
        />
        <Stat 
          label="Losses" 
          value={stats.losses}
          size="sm" 
          color="red"
        />
      </div>

      {matchError && (
        <div className="col-span-12 mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {matchError}
        </div>
      )}

      {/* Next Fixture Highlight */}
      {upcomingFixtures.length > 0 && (
        <div className="col-span-12 mb-6">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-2">Next Match</h4>
                <div className="flex items-center gap-4 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(upcomingFixtures[0].date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{upcomingFixtures[0].time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{upcomingFixtures[0].venue}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-800 mb-1">
                  {upcomingFixtures[0].homeTeamId === managerData.selectedClub?.id 
                    ? `${upcomingFixtures[0].homeTeamName} vs ${upcomingFixtures[0].awayTeamName}`
                    : `${upcomingFixtures[0].awayTeamName} @ ${upcomingFixtures[0].homeTeamName}`
                  }
                </div>
                <div className="text-sm text-slate-500 mb-3">
                  Matchday {upcomingFixtures[0].matchday} • {upcomingFixtures[0].competition}
                </div>
                <button
                  onClick={() => handlePlayMatch(upcomingFixtures[0])}
                  disabled={preparing}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {preparing ? 'Preparing...' : 'Play Match'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Fixtures */}
      <div className="col-span-12 md:col-span-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Upcoming Fixtures</h4>
          {upcomingFixtures.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-500">No upcoming fixtures</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingFixtures.map((fixture) => {
                const isHome = fixture.homeTeamId === managerData.selectedClub?.id;
                const opponent = isHome ? fixture.awayTeamName : fixture.homeTeamName;
                return (
                  <div key={fixture.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <div className="font-medium text-slate-800">
                        {isHome ? 'vs' : '@'} {opponent}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(fixture.date)} • {fixture.time}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-600">
                        MD {fixture.matchday}
                      </div>
                      <div className="text-xs text-slate-500">{fixture.venue}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Results */}
      <div className="col-span-12 md:col-span-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h4 className="text-lg font-semibold text-slate-800 mb-4">Recent Results</h4>
          {recentResults.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-500">No recent results</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentResults.map((fixture) => {
                const isHome = fixture.homeTeamId === managerData.selectedClub?.id;
                const opponent = isHome ? fixture.awayTeamName : fixture.homeTeamName;
                const userScore = isHome ? fixture.homeScore : fixture.awayScore;
                const opponentScore = isHome ? fixture.awayScore : fixture.homeScore;
                const result = getResultIcon(fixture, isHome);
                
                return (
                  <div 
                    key={fixture.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border ${getResultColor(fixture, isHome)}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        result === 'W' ? 'bg-green-500 text-white' :
                        result === 'L' ? 'bg-red-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {result}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">
                          {isHome ? 'vs' : '@'} {opponent}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatDate(fixture.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-800">
                        {userScore} - {opponentScore}
                      </div>
                      <div className="text-xs text-slate-500">
                        MD {fixture.matchday}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="col-span-12">
        <div className="flex gap-4">
          <button
            onClick={handleGeneratePressConference}
            className="px-6 py-3 rounded-xl bg-slate-800 text-white hover:bg-slate-700 font-semibold flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> 
            Generate Press Conference
          </button>
          <button className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-colors">
            View All Fixtures
          </button>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Pre-Match Press Conference">
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner />
            <p className="mt-4 text-slate-600">Generating press conference...</p>
          </div>
        ) : (
          <div>
            <div className="bg-slate-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                <Calendar className="w-4 h-4" />
                <span>Pre-match press conference</span>
              </div>
              <div className="font-medium text-slate-800">
                {upcomingFixtures[0] && (
                  `${managerData.selectedClub?.name} vs ${
                    upcomingFixtures[0].homeTeamId === managerData.selectedClub?.id 
                      ? upcomingFixtures[0].awayTeamName 
                      : upcomingFixtures[0].homeTeamName
                  }`
                )}
              </div>
            </div>
            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
              {pressConference}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}