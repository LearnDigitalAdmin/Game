// src/global/engine/MatchContainer.tsx
// Main match UI container - orchestrates all match systems

import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCw, ZoomIn, ZoomOut, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  MatchSetup,
  MatchState,
  MatchEvent,
  PlayerLineup,
  Formation,
  MatchPlayer,
} from './types/MatchTypes';
import { useMatchEngine } from './hooks/useMatchEngine';
import { PitchRenderer } from './visualizer/PitchRenderer';
import MatchAnalytics from './analytics/MatchAnalytics';

interface MatchContainerProps {
  setup: MatchSetup;
  onMatchComplete?: (result: any) => void;
  onClose?: () => void;
}

export const MatchContainer: React.FC<MatchContainerProps> = ({
  setup,
  onMatchComplete,
  onClose,
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();
  const [showStats, setShowStats] = useState(false);
  const [showTactical, setShowTactical] = useState(false);
  const [cameraMode, setCameraMode] = useState<'wide' | 'zoomed' | 'player-focus'>('wide');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifications, setNotifications] = useState<MatchEvent[]>([]);

  const {
    matchState,
    isRunning,
    isPaused,
    initializeMatch,
    startMatch,
    pauseMatch,
    resumeMatch,
    performSubstitution,
    getCurrentMatchState,
  } = useMatchEngine({
    onMatchUpdate: (state) => {
      // Real-time updates
    },
    onEvent: (event) => {
      handleMatchEvent(event);
    },
    onFinished: (result) => {
      handleMatchFinished(result);
    },
  });

  // Initialize match on mount
  useEffect(() => {
    initializeMatch(setup);
  }, [setup, initializeMatch]);

  /**
   * Handle match events
   */
  const handleMatchEvent = useCallback((event: MatchEvent) => {
    // Add to notifications
    if (['goal', 'red-card', 'injury', 'yellow-card'].includes(event.type)) {
      setNotifications(prev => [...prev, event].slice(-5)); // Keep last 5
    }

    // Play sound
    if (soundEnabled) {
      playEventSound(event.type);
    }
  }, [soundEnabled]);

  /**
   * Handle match finished
   */
  const handleMatchFinished = useCallback((result: any) => {
    console.log('🏁 Match completed');
    setTimeout(() => {
      onMatchComplete?.(result);
    }, 2000);
  }, [onMatchComplete]);

  /**
   * Play event sound
   */
  const playEventSound = (eventType: string) => {
    // Would integrate with audio system
    // For now, just console log
    console.log(`🔊 Playing sound for: ${eventType}`);
  };

  /**
   * Handle substitution
   */
  const handleSubstitution = useCallback(
    async (playerOutId: string, playerInId: string) => {
      await performSubstitution(playerOutId, playerInId);
    },
    [performSubstitution]
  );

  if (!matchState) {
    return (
      <div className="w-full h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg">Initializing match...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between max-w-full">
          <div>
            <h1 className="text-2xl font-bold">
              {matchState.fixture.homeTeamName} vs {matchState.fixture.awayTeamName}
            </h1>
            <p className="text-slate-400 text-sm">
              {matchState.fixture.competition} - Matchday {matchState.fixture.matchday}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {matchState.score.home} - {matchState.score.away}
            </div>
            <p className="text-slate-400">{Math.floor(matchState.currentMinute)}'</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Pitch */}
        <div className="flex-1 flex flex-col gap-4">
          <PitchRenderer
            matchState={matchState}
            playerPositions={[]} // Would get from engine
            ballPosition={matchState.homeTeam.players[0]?.position || { x: 50, y: 50 }}
            selectedPlayerId={selectedPlayerId}
            onPlayerSelect={setSelectedPlayerId}
            cameraMode={cameraMode}
          />

          {/* Controls */}
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 flex items-center justify-center gap-4">
            <button
              onClick={() => (isRunning ? pauseMatch() : startMatch())}
              className="bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition"
            >
              {isRunning && !isPaused ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <div className="flex gap-2">
              {['wide', 'zoomed', 'player-focus'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setCameraMode(mode as any)}
                  className={`px-3 py-1 rounded text-sm transition ${
                    cameraMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {mode === 'wide' && <ZoomOut size={16} className="inline mr-1" />}
                  {mode === 'zoomed' && <ZoomIn size={16} className="inline mr-1" />}
                  {mode === 'player-focus' && '👁️'}
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="bg-slate-800 hover:bg-slate-700 p-2 rounded-lg transition"
            >
              {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
            </button>

            <button
              onClick={() => setShowStats(!showStats)}
              className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg transition"
            >
              Stats
            </button>

            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>

        {/* Side panel - Player/Stats */}
        <div className="w-80 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setShowStats(false)}
              className={`flex-1 py-2 text-center transition ${
                !showStats
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Squad
            </button>
            <button
              onClick={() => setShowStats(true)}
              className={`flex-1 py-2 text-center transition ${
                showStats
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              Stats
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!showStats ? (
              <SquadPanel
                homeTeam={matchState.homeTeam}
                awayTeam={matchState.awayTeam}
                selectedPlayerId={selectedPlayerId}
                onPlayerSelect={setSelectedPlayerId}
                onSubstitution={handleSubstitution}
                userTeamId={matchState.userTeamId}
              />
            ) : (
              <StatsPanel matchState={matchState} />
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 pointer-events-none">
        {notifications.map((notif, i) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="bg-slate-900 border border-slate-700 rounded-lg p-3 max-w-sm text-sm"
          >
            {notif.description}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/**
 * Squad panel component
 */
interface SquadPanelProps {
  homeTeam: any;
  awayTeam: any;
  selectedPlayerId?: string;
  onPlayerSelect: (id: string) => void;
  onSubstitution: (out: string, inPlayer: string) => Promise<void>;
  userTeamId?: string;
}

const SquadPanel: React.FC<SquadPanelProps> = ({
  homeTeam,
  awayTeam,
  selectedPlayerId,
  onPlayerSelect,
  onSubstitution,
  userTeamId,
}) => {
  const [substitutionMode, setSubstitutionMode] = useState(false);
  const [playerOutId, setPlayerOutId] = useState<string>();

  const isUserTeam = (teamId: string) => teamId === userTeamId;
  const userTeam = isUserTeam(homeTeam.clubId) ? homeTeam : awayTeam;
  const opponentTeam = isUserTeam(homeTeam.clubId) ? awayTeam : homeTeam;

  return (
    <div className="space-y-4">
      {/* User Team */}
      <div>
        <h3 className="font-bold text-blue-400 mb-2">{userTeam.clubName}</h3>
        <div className="space-y-1">
          {userTeam.players.map((player: MatchPlayer) => (
            <button
              key={player.id}
              onClick={() => {
                if (substitutionMode && playerOutId) {
                  onSubstitution(playerOutId, player.id);
                  setSubstitutionMode(false);
                  setPlayerOutId(undefined);
                } else {
                  onPlayerSelect(player.id);
                }
              }}
              className={`w-full text-left px-2 py-1 rounded text-sm transition ${
                selectedPlayerId === player.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold w-6">{player.number}</span>
                <span className="flex-1">{player.firstName} {player.lastName}</span>
                <span className="text-xs">{player.liveRating.toFixed(1)}/10</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Substitutes */}
      {userTeam.substitutes.length > 0 && (
        <div>
          <h3 className="font-bold text-amber-400 text-sm mb-2">Substitutes</h3>
          <div className="space-y-1">
            {userTeam.substitutes.map((player: MatchPlayer) => (
              <button
                key={player.id}
                className="w-full text-left px-2 py-1 rounded text-sm bg-slate-800 text-slate-400 hover:bg-slate-700 transition"
              >
                <span className="text-xs">{player.number}</span> {player.firstName} {player.lastName}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Stats panel component
 */
interface StatsPanelProps {
  matchState: MatchState;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ matchState }) => {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h3 className="font-bold text-blue-400 mb-2">{matchState.homeTeam.clubName}</h3>
        <div className="space-y-1 text-slate-300">
          <div className="flex justify-between">
            <span>Possession:</span>
            <span>{Math.round(matchState.ballPossession.home)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Shots:</span>
            <span>{matchState.homeTeam.shotsOnTarget}</span>
          </div>
          <div className="flex justify-between">
            <span>Passes:</span>
            <span>{matchState.homeTeam.passes}</span>
          </div>
          <div className="flex justify-between">
            <span>Tackles:</span>
            <span>{matchState.homeTeam.tackles}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <h3 className="font-bold text-red-400 mb-2">{matchState.awayTeam.clubName}</h3>
        <div className="space-y-1 text-slate-300">
          <div className="flex justify-between">
            <span>Possession:</span>
            <span>{Math.round(matchState.ballPossession.away)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Shots:</span>
            <span>{matchState.awayTeam.shotsOnTarget}</span>
          </div>
          <div className="flex justify-between">
            <span>Passes:</span>
            <span>{matchState.awayTeam.passes}</span>
          </div>
          <div className="flex justify-between">
            <span>Tackles:</span>
            <span>{matchState.awayTeam.tackles}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchContainer;
