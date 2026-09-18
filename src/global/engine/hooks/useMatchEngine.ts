// src/global/engine/hooks/useMatchEngine.ts
// React hook for match engine integration

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  MatchState,
  MatchSetup,
  Formation,
  MatchEvent,
  MatchAnalytics,
} from '../types/MatchTypes';
import MatchEngine from '../MatchEngine';

interface UseMatchEngineProps {
  onMatchUpdate?: (state: MatchState) => void;
  onEvent?: (event: MatchEvent) => void;
  onFinished?: (result: { matchState: MatchState; analytics: MatchAnalytics }) => void;
}

export const useMatchEngine = (props: UseMatchEngineProps) => {
  const engineRef = useRef<MatchEngine | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [matchSpeed, setMatchSpeed] = useState(1);

  // Initialize engine on mount
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new MatchEngine();
      console.log('✅ Match engine initialized');
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
      }
    };
  }, []);

  // Register event listeners
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const handleMatchUpdate = (state: MatchState) => {
      setMatchState(state);
      props.onMatchUpdate?.(state);
    };

    const handleEvent = (event: MatchEvent) => {
      props.onEvent?.(event);
    };

    const handleFinished = (result: any) => {
      setIsRunning(false);
      setIsPaused(false);
      props.onFinished?.(result);
    };

    engine.on('match-update', handleMatchUpdate);
    engine.on('match-event', handleEvent);
    engine.on('match-finished', handleFinished);
    engine.on('match-started', () => setIsRunning(true));
    engine.on('match-paused', () => setIsPaused(true));
    engine.on('match-resumed', () => setIsPaused(false));

    return () => {
      engine.off('match-update', handleMatchUpdate);
      engine.off('match-event', handleEvent);
      engine.off('match-finished', handleFinished);
    };
  }, [props]);

  /**
   * Initialize match
   */
  const initializeMatch = useCallback(async (setup: MatchSetup) => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      await engine.initializeMatch(setup);
      setMatchState(engine.getMatchState());
      console.log('✅ Match initialized');
    } catch (error) {
      console.error('Failed to initialize match:', error);
    }
  }, []);

  /**
   * Start match
   */
  const startMatch = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.startMatch();
  }, []);

  /**
   * Pause match
   */
  const pauseMatch = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.pause();
  }, []);

  /**
   * Resume match
   */
  const resumeMatch = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    engine.resume();
  }, []);

  /**
   * Perform substitution
   */
  const performSubstitution = useCallback(async (playerOutId: string, playerInId: string) => {
    const engine = engineRef.current;
    if (!engine || !matchState) return;

    try {
      await engine.performSubstitution(playerOutId, playerInId);
    } catch (error) {
      console.error('Substitution failed:', error);
    }
  }, [matchState]);

  /**
   * Change formation/tactics
   */
  const changeTacticalFormation = useCallback((formation: Formation) => {
    // This would update match state and affect simulation
    // Implementation would be in MatchEngine
  }, []);

  /**
   * Get current match state
   */
  const getCurrentMatchState = useCallback(() => {
    const engine = engineRef.current;
    return engine?.getMatchState() || null;
  }, []);

  return {
    // State
    matchState,
    isRunning,
    isPaused,
    matchSpeed,

    // Methods
    initializeMatch,
    startMatch,
    pauseMatch,
    resumeMatch,
    setMatchSpeed,
    performSubstitution,
    changeTacticalFormation,
    getCurrentMatchState,

    // Engine access (careful with this)
    engine: engineRef.current,
  };
};

export default useMatchEngine;
