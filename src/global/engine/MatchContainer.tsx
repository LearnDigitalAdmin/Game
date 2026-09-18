// src/global/engine/MatchContainer.tsx
// Main match UI container - orchestrates all match systems

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, ZoomIn, ZoomOut } from 'lucide-react';
import { motion } from 'framer-motion';
import type { MatchSetup, MatchEvent, MatchPlayer, TeamMatchState } from './types/MatchTypes';
import type { MatchResult } from './MatchEngine';
import { useMatchEngine } from './hooks/useMatchEngine';
import { PitchRenderer } from './visualizer/PitchRenderer';
import type { MatchSpeed } from './MatchEngineConfig';

interface MatchContainerProps {
  setup: MatchSetup;
  onMatchComplete?: (result: MatchResult) => void;
  onClose?: () => void;
}

const SPEED_LABELS: Record<MatchSpeed, string> = {
  fast: 'Fast',
  default: 'Normal',
  'hyper-realistic': 'Slow',
};

export const MatchContainer: React.FC<MatchContainerProps> = ({
  setup,
  onMatchComplete,
  onClose,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();
  const [showStats, setShowStats] = useState(false);
  const [cameraMode, setCameraMode] = useState<'wide' | 'zoomed' | 'player-focus'>('wide');
  const [notifications, setNotifications] = useState<MatchEvent[]>([]);
  const [playerOutId, setPlayerOutId] = useState<string>();
  const [speed, setSpeed] = useState<MatchSpeed>('default');
  const [result, setResult] = useState<MatchResult | null>(null);

  const handleEvent = useCallback((event: MatchEvent) => {
    if (['goal', 'red-card', 'injury', 'yellow-card', 'substitution', 'full-time'].includes(event.type)) {
      setNotifications((prev) => [...prev, event].slice(-5));
    }
  }, []);

  const handleFinished = useCallback((matchResult: MatchResult) => {
    setResult(matchResult);
  }, []);

  const {
    matchState,
    playerPositions,
    ball,
    isRunning,
    isPaused,
    isFinished,
    initializeMatch,
    togglePlay,
    performSubstitution,
    setMatchSpeed,
  } = useMatchEngine({ onEvent: handleEvent, onFinished: handleFinished, speed });

  // The setup object is stable for the life of a fixture; guard against a new
  // object identity restarting a match that is already under way.
  const initializedRef = useRef<string | null>(null);
  useEffect(() => {
    if (initializedRef.current === setup.fixture.id) return;
    initializedRef.current = setup.fixture.id;
    initializeMatch(setup);
  }, [setup, initializeMatch]);

  const handleSpeedChange = (next: MatchSpeed) => {
    setSpeed(next);
    setMatchSpeed(next);
  };

  /**
   * Two-step substitution: pick the player coming off, then the replacement.
   */
  const handleSquadClick = (player: MatchPlayer, fromBench: boolean) => {
    if (fromBench) {
      if (playerOutId) {
        performSubstitution(playerOutId, player.id);
        setPlayerOutId(undefined);
      }
      return;
    }

    if (playerOutId === player.id) {
      setPlayerOutId(undefined);
    } else {
      setPlayerOutId(player.id);
      setSelectedPlayerId(player.id);
    }
  };

  if (!matchState) {
    return (
      <div className="w-full h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">Preparing the teams...</p>
        </div>
      </div>
    );
  }

  const userTeam =
    matchState.homeTeam.clubId === matchState.userTeamId ? matchState.homeTeam : matchState.awayTeam;

  return (
    <div className="w-full h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {matchState.fixture.homeTeamName} vs {matchState.fixture.awayTeamName}
            </h1>
            <p className="text-slate-400 text-sm">
              {matchState.fixture.competition} · Matchday {matchState.fixture.matchday} ·{' '}
              {matchState.weather.type}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {matchState.score.home} - {matchState.score.away}
            </div>
            <p className="text-slate-400">
              {Math.floor(matchState.currentMinute)}&apos;{' '}
              {isFinished ? '· Full time' : `· ${matchState.currentPeriod.replace('-', ' ')}`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <PitchRenderer
            matchState={matchState}
            playerPositions={playerPositions}
            ballPosition={ball?.position ?? { x: 50, y: 50 }}
            selectedPlayerId={selectedPlayerId}
            onPlayerSelect={setSelectedPlayerId}
            cameraMode={cameraMode}
          />

          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 flex items-center gap-4 flex-wrap">
            <button
              onClick={togglePlay}
              disabled={isFinished}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed p-2 rounded-lg transition"
            >
              {isRunning && !isPaused ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <div className="flex gap-2">
              {(['wide', 'zoomed', 'player-focus'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setCameraMode(mode)}
                  className={`px-3 py-1 rounded text-sm transition ${
                    cameraMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {mode === 'wide' && <ZoomOut size={16} className="inline mr-1" />}
                  {mode === 'zoomed' && <ZoomIn size={16} className="inline mr-1" />}
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {(Object.keys(SPEED_LABELS) as MatchSpeed[]).map((option) => (
                <button
                  key={option}
                  onClick={() => handleSpeedChange(option)}
                  disabled={isRunning}
                  className={`px-3 py-1 rounded text-sm transition disabled:opacity-40 ${
                    speed === option
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {SPEED_LABELS[option]}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {isFinished && result && (
              <button
                onClick={() => onMatchComplete?.(result)}
                className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg transition font-semibold"
              >
                Continue
              </button>
            )}

            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>

        <div className="w-80 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col flex-shrink-0">
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setShowStats(false)}
              className={`flex-1 py-2 text-center transition ${
                !showStats ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Squad
            </button>
            <button
              onClick={() => setShowStats(true)}
              className={`flex-1 py-2 text-center transition ${
                showStats ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Stats
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!showStats ? (
              <SquadPanel
                team={userTeam}
                selectedPlayerId={selectedPlayerId}
                playerOutId={playerOutId}
                onPlayerClick={handleSquadClick}
              />
            ) : (
              <StatsPanel homeTeam={matchState.homeTeam} awayTeam={matchState.awayTeam} />
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 space-y-2 pointer-events-none">
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900 border border-slate-700 rounded-lg p-3 max-w-sm text-sm"
          >
            <span className="text-slate-400 mr-2">{Math.floor(notif.minute)}&apos;</span>
            {notif.description}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface SquadPanelProps {
  team: TeamMatchState;
  selectedPlayerId?: string;
  playerOutId?: string;
  onPlayerClick: (player: MatchPlayer, fromBench: boolean) => void;
}

const SquadPanel: React.FC<SquadPanelProps> = ({
  team,
  selectedPlayerId,
  playerOutId,
  onPlayerClick,
}) => {
  const subsRemaining = team.maxSubstitutes - team.usedSubstitutes;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="font-bold text-blue-400">{team.clubName}</h3>
          <span className="text-xs text-slate-400">{subsRemaining} subs left</span>
        </div>

        {playerOutId && (
          <p className="text-xs text-amber-300 mb-2">Now pick a substitute to bring on.</p>
        )}

        <div className="space-y-1">
          {team.players.map((player) => (
            <button
              key={player.id}
              onClick={() => onPlayerClick(player, false)}
              className={`w-full text-left px-2 py-1 rounded text-sm transition ${
                playerOutId === player.id
                  ? 'bg-amber-600 text-white'
                  : selectedPlayerId === player.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold w-6">{player.number}</span>
                <span className="w-10 text-xs text-slate-400">{player.position}</span>
                <span className="flex-1 truncate">
                  {player.firstName} {player.lastName}
                </span>
                {player.status === 'injured' && <span title="Injured">🚑</span>}
                {player.yellowCards > 0 && player.redCards === 0 && <span title="Booked">🟨</span>}
                {player.redCards > 0 && <span title="Sent off">🟥</span>}
                <span className="text-xs w-8 text-right">{player.liveRating.toFixed(1)}</span>
              </div>
              <div className="mt-1 h-1 bg-slate-700 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${Math.max(0, 100 - player.fatigue)}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {team.substitutes.length > 0 && (
        <div>
          <h3 className="font-bold text-amber-400 text-sm mb-2">Bench</h3>
          <div className="space-y-1">
            {team.substitutes.map((player) => {
              const available = !player.isInjured && player.status === 'substituting';
              return (
                <button
                  key={player.id}
                  disabled={!available || !playerOutId || subsRemaining <= 0}
                  onClick={() => onPlayerClick(player, true)}
                  className="w-full text-left px-2 py-1 rounded text-sm bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <span className="text-xs w-6 inline-block">{player.number}</span>
                  <span className="text-xs text-slate-400 mr-2">{player.position}</span>
                  {player.firstName} {player.lastName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface StatsPanelProps {
  homeTeam: TeamMatchState;
  awayTeam: TeamMatchState;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ homeTeam, awayTeam }) => {
  const rows: Array<{ label: string; home: string; away: string }> = [
    {
      label: 'Possession',
      home: `${Math.round(homeTeam.possession)}%`,
      away: `${Math.round(awayTeam.possession)}%`,
    },
    { label: 'Shots', home: `${homeTeam.shots}`, away: `${awayTeam.shots}` },
    { label: 'On target', home: `${homeTeam.shotsOnTarget}`, away: `${awayTeam.shotsOnTarget}` },
    { label: 'Passes', home: `${homeTeam.passes}`, away: `${awayTeam.passes}` },
    {
      label: 'Pass accuracy',
      home: `${Math.round(homeTeam.passAccuracy)}%`,
      away: `${Math.round(awayTeam.passAccuracy)}%`,
    },
    { label: 'Tackles', home: `${homeTeam.tackles}`, away: `${awayTeam.tackles}` },
    { label: 'Corners', home: `${homeTeam.corners}`, away: `${awayTeam.corners}` },
    { label: 'Fouls', home: `${homeTeam.fouls}`, away: `${awayTeam.fouls}` },
    { label: 'Yellow cards', home: `${homeTeam.yellowCards}`, away: `${awayTeam.yellowCards}` },
    { label: 'Red cards', home: `${homeTeam.redCards}`, away: `${awayTeam.redCards}` },
  ];

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between font-bold text-xs text-slate-400 pb-2 border-b border-slate-700">
        <span className="text-blue-400 truncate">{homeTeam.clubName}</span>
        <span className="text-red-400 truncate">{awayTeam.clubName}</span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between text-slate-300">
          <span className="w-10 text-right font-semibold">{row.home}</span>
          <span className="flex-1 text-center text-xs text-slate-500">{row.label}</span>
          <span className="w-10 text-left font-semibold">{row.away}</span>
        </div>
      ))}
    </div>
  );
};

export default MatchContainer;
