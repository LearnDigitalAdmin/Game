// src/global/engine/hooks/useMatchEngine.ts
// React hook for match engine integration

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  MatchState,
  MatchSetup,
  Formation,
  MatchEvent,
  PlayerPosition,
  Ball,
} from '../types/MatchTypes';
import MatchEngine, { type MatchResult } from '../MatchEngine';
import type { MatchSpeed } from '../MatchEngineConfig';

interface UseMatchEngineProps {
  onEvent?: (event: MatchEvent) => void;
  onFinished?: (result: MatchResult) => void;
  speed?: MatchSpeed;
}

export const useMatchEngine = ({ onEvent, onFinished, speed = 'default' }: UseMatchEngineProps) => {
  const engineRef = useRef<MatchEngine | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>([]);
  const [ball, setBall] = useState<Ball | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // Callbacks are held in refs so that changing them never tears down and
  // re-registers the engine's listeners mid-match.
  const onEventRef = useRef(onEvent);
  const onFinishedRef = useRef(onFinished);
  onEventRef.current = onEvent;
  onFinishedRef.current = onFinished;

  if (engineRef.current === null) {
    engineRef.current = new MatchEngine(undefined, speed);
  }

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const applySnapshot = (snapshot: {
      matchState: MatchState;
      playerPositions: PlayerPosition[];
      ball: Ball;
    } | null) => {
      if (!snapshot) return;
      setMatchState(snapshot.matchState);
      setPlayerPositions(snapshot.playerPositions);
      setBall(snapshot.ball);
    };

    const handleUpdate = (snapshot: any) => applySnapshot(snapshot);
    const handleEvent = (event: MatchEvent) => onEventRef.current?.(event);
    const handleStarted = () => {
      setIsRunning(true);
      setIsPaused(false);
    };
    const handlePaused = (snapshot: any) => {
      setIsPaused(true);
      applySnapshot(snapshot);
    };
    const handleResumed = () => setIsPaused(false);
    const handleFinished = (result: MatchResult) => {
      setIsRunning(false);
      setIsPaused(false);
      setIsFinished(true);
      applySnapshot(engine.getSnapshot());
      onFinishedRef.current?.(result);
    };

    engine.on('match-initialized', () => applySnapshot(engine.getSnapshot()));
    engine.on('match-update', handleUpdate);
    engine.on('match-event', handleEvent);
    engine.on('match-started', handleStarted);
    engine.on('match-paused', handlePaused);
    engine.on('match-resumed', handleResumed);
    engine.on('match-finished', handleFinished);

    return () => {
      engine.destroy();
    };
  }, []);

  const initializeMatch = useCallback(async (setup: MatchSetup) => {
    const engine = engineRef.current;
    if (!engine) return;

    try {
      await engine.initializeMatch(setup);
      setIsFinished(false);
    } catch (error) {
      console.error('Failed to initialize match:', error);
    }
  }, []);

  const startMatch = useCallback(() => {
    engineRef.current?.startMatch();
  }, []);

  const pauseMatch = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const resumeMatch = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const togglePlay = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const { isRunning: running, isPaused: paused } = engine.getRunningState();
    if (!running) engine.startMatch();
    else if (paused) engine.resume();
    else engine.pause();
  }, []);

  const performSubstitution = useCallback((playerOutId: string, playerInId: string): boolean => {
    return engineRef.current?.performSubstitution(playerOutId, playerInId) ?? false;
  }, []);

  const changeFormation = useCallback((formation: Formation): boolean => {
    return engineRef.current?.changeFormation(formation) ?? false;
  }, []);

  const setMatchSpeed = useCallback((next: MatchSpeed) => {
    engineRef.current?.setMatchSpeed(next);
  }, []);

  return {
    matchState,
    playerPositions,
    ball,
    isRunning,
    isPaused,
    isFinished,

    initializeMatch,
    startMatch,
    pauseMatch,
    resumeMatch,
    togglePlay,
    performSubstitution,
    changeFormation,
    setMatchSpeed,
  };
};

export default useMatchEngine;
