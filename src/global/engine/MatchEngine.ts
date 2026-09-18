// src/global/engine/MatchEngine.ts
// Main match engine orchestrator - coordinates all simulation systems

import { v4 as uuidv4 } from 'uuid';
import type {
  MatchState,
  MatchSetup,
  TeamMatchState,
  MatchPlayer,
  MatchEvent,
  Formation,
  PlayerLineup,
  PlayerPosition,
  Ball,
  SimulationConfig,
  MatchAnalytics as MatchAnalyticsData,
} from './types/MatchTypes';
import { MatchSimulator } from './simulation/MatchSimulator';
import { EventGenerator } from './simulation/EventGenerator';
import { PlayerRater } from './performance/PlayerRater';
import { FormCalculator } from './performance/FormCalculator';
import { DevelopmentTracker } from './performance/DevelopmentTracker';
import { HighlightManager } from './visualizer/HighlightManager';
import { MatchAnalytics as AnalyticsCalculator } from './analytics/MatchAnalytics';
import { EventRecorder } from './analytics/EventRecorder';
import { getMatchSpeedConfig, validateMatchSpeed, type MatchSpeed } from './MatchEngineConfig';

const REGULATION_MINUTES = 90;
const HALF_TIME_MINUTE = 45;

export interface MatchResult {
  matchState: MatchState;
  analytics: MatchAnalyticsData;
  finalScore: { home: number; away: number };
}

export class MatchEngine {
  private matchState: MatchState | null = null;
  private simulationConfig: SimulationConfig;
  private matchSpeed: MatchSpeed;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  private simulator: MatchSimulator;
  private eventGenerator: EventGenerator;
  private playerRater: PlayerRater;
  private formCalculator: FormCalculator;
  private developmentTracker: DevelopmentTracker;
  private highlightManager: HighlightManager;
  private analyticsCalculator: AnalyticsCalculator;
  private eventRecorder: EventRecorder;

  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private gameStartTime: number = 0;
  private elapsedBeforePause: number = 0;
  private lastProcessedMinute: number = 0;
  private firstHalfStoppage: number = 0;
  private secondHalfStoppage: number = 0;

  constructor(config: SimulationConfig = getDefaultConfig(), matchSpeed: MatchSpeed = 'default') {
    this.matchSpeed = validateMatchSpeed(matchSpeed);
    this.simulationConfig = this.buildConfigFromMatchSpeed(config);

    this.simulator = new MatchSimulator(this.simulationConfig);
    this.eventGenerator = new EventGenerator(this.simulationConfig);
    this.playerRater = new PlayerRater();
    this.formCalculator = new FormCalculator();
    this.developmentTracker = new DevelopmentTracker();
    this.highlightManager = new HighlightManager();
    this.analyticsCalculator = new AnalyticsCalculator();
    this.eventRecorder = new EventRecorder();
  }

  private buildConfigFromMatchSpeed(baseConfig: SimulationConfig): SimulationConfig {
    const speedConfig = getMatchSpeedConfig(this.matchSpeed);

    return {
      ...baseConfig,
      timeStep: speedConfig.visualUpdateMs,
      eventsPerMinute: baseConfig.eventsPerMinute * speedConfig.eventDensity,
    };
  }

  getMatchSpeed(): MatchSpeed {
    return this.matchSpeed;
  }

  setMatchSpeed(speed: MatchSpeed): void {
    if (this.isRunning) return;
    this.matchSpeed = validateMatchSpeed(speed);
    this.simulationConfig = this.buildConfigFromMatchSpeed(this.simulationConfig);
  }

  async initializeMatch(setup: MatchSetup): Promise<void> {
    this.firstHalfStoppage = 1 + Math.floor(Math.random() * 3);
    this.secondHalfStoppage = 2 + Math.floor(Math.random() * 4);
    this.lastProcessedMinute = 0;
    this.elapsedBeforePause = 0;

    this.matchState = {
      id: uuidv4(),
      fixture: setup.fixture,
      homeTeam: this.createTeamState(
        setup.fixture.homeClubId,
        setup.fixture.homeTeamName,
        setup.homeLineup,
        setup.homeFormation
      ),
      awayTeam: this.createTeamState(
        setup.fixture.awayClubId,
        setup.fixture.awayTeamName,
        setup.awayLineup,
        setup.awayFormation
      ),
      currentMinute: 0,
      currentPeriod: 'first-half',
      matchTime: 0,
      ballPossession: { home: 50, away: 50 },
      score: { home: 0, away: 0 },
      momentum: { home: 0, away: 0 },
      events: [],
      highlights: [],
      weather: this.generateWeather(),
      crowd: {
        excitement: 70,
        confidence: 60,
        homeSupport: 70,
        awaySupport: 30,
        noise: 70,
        momentumShift: 0,
      },
      isUserMatch: Boolean(setup.userTeamId),
      userTeamId: setup.userTeamId,
    };

    this.simulator.initializePositions(this.matchState);

    this.processEvent({
      id: uuidv4(),
      type: 'kickoff',
      minute: 0,
      team: 'home',
      description: `${setup.fixture.homeTeamName} kick off against ${setup.fixture.awayTeamName}.`,
      timestamp: Date.now(),
      isHighlight: false,
    });

    this.emit('match-initialized', this.matchState);
  }

  /**
   * Build a team's in-match state from its lineup, capping the XI at eleven
   * players and moving any overflow to the bench.
   */
  private createTeamState(
    clubId: string,
    clubName: string,
    lineup: PlayerLineup,
    formation: Formation
  ): TeamMatchState {
    const starters = lineup.players.slice(0, 11).map((p) => this.createMatchPlayer(p, true));
    const overflow = lineup.players.slice(11);
    const bench = [...overflow, ...lineup.substitutes].map((p) => this.createMatchPlayer(p, false));

    return {
      clubId,
      clubName,
      formation,
      players: starters,
      substitutes: bench,
      usedSubstitutes: 0,
      maxSubstitutes: 5,
      possession: 50,
      shots: 0,
      shotsOnTarget: 0,
      passes: 0,
      passAccuracy: 0,
      tackles: 0,
      fouls: 0,
      corners: 0,
      freeKicks: 0,
      redCards: 0,
      yellowCards: 0,
      injuryTime: 0,
      pressing: this.pressingFromFormation(formation),
      mentality: formation.style,
      defensiveBlock: formation.pressing === 'high' ? 70 : formation.pressing === 'low' ? 30 : 50,
    };
  }

  /**
   * Normalise an incoming player into a clean per-match record so that
   * statistics never leak between fixtures.
   */
  private createMatchPlayer(player: MatchPlayer, starting: boolean): MatchPlayer {
    return {
      ...player,
      liveRating: 6,
      fatigue: 0,
      fitness: Math.max(0, Math.min(100, player.fitness ?? 100)),
      morale: Math.max(0, Math.min(100, player.morale ?? 70)),
      form: Math.max(0, Math.min(100, player.form ?? 50)),
      status: starting ? 'playing' : 'substituting',
      minutesPlayed: 0,
      touches: 0,
      passes: 0,
      passAccuracy: 0,
      tackles: 0,
      interceptions: 0,
      fouls: 0,
      yellowCards: 0,
      redCards: 0,
      shotsOnTarget: 0,
      shots: 0,
      goals: 0,
      assists: 0,
      keyPasses: 0,
      dribbles: 0,
      dribbleAttempts: 0,
      clearances: 0,
      onPitch: starting,
      isSubstitute: !starting,
      isOnBench: !starting,
      isInjured: false,
      isSuspended: false,
    };
  }

  private pressingFromFormation(formation: Formation): TeamMatchState['pressing'] {
    if (formation.pressing === 'high') return 'aggressive';
    if (formation.pressing === 'low') return 'conservative';
    return 'normal';
  }

  private generateWeather(): MatchState['weather'] {
    const types: MatchState['weather']['type'][] = ['sunny', 'cloudy', 'cloudy', 'rainy', 'heavy-rain', 'foggy'];
    const type = types[Math.floor(Math.random() * types.length)];
    const wet = type === 'rainy' || type === 'heavy-rain';

    return {
      type,
      temperature: 8 + Math.floor(Math.random() * 20),
      windSpeed: Math.floor(Math.random() * 25),
      impact: {
        ballControl: wet ? -15 : 0,
        ballSpeed: wet ? 10 : 0,
        visibility: type === 'foggy' ? 60 : 100,
        pitchCondition: wet ? 'wet' : 'dry',
      },
    };
  }

  startMatch(): void {
    if (!this.matchState) throw new Error('Match not initialized');
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.gameStartTime = Date.now();

    this.simulationInterval = setInterval(() => {
      this.update();
    }, this.simulationConfig.timeStep);

    this.emit('match-started', this.matchState);
  }

  /**
   * Advance the clock from real elapsed time, then settle every whole game
   * minute that has passed since the previous tick.
   */
  private update(): void {
    if (!this.matchState || !this.isRunning || this.isPaused) return;

    const speedConfig = getMatchSpeedConfig(this.matchSpeed);
    const elapsedRealMs = this.elapsedBeforePause + (Date.now() - this.gameStartTime);
    const totalMinutes = this.totalMatchMinutes();
    const minute = Math.min(totalMinutes, (elapsedRealMs / speedConfig.realTimeMs) * REGULATION_MINUTES);

    this.matchState.currentMinute = minute;
    this.matchState.matchTime = Math.floor(minute);

    while (this.lastProcessedMinute < Math.floor(minute)) {
      this.lastProcessedMinute += 1;
      this.simulateMinute(this.lastProcessedMinute);
    }

    this.updateMatchPeriod();
    this.simulator.updatePlayerPositions(this.matchState);

    this.emit('match-update', this.getSnapshot());

    if (minute >= totalMinutes) {
      this.finishMatch();
    }
  }

  private totalMatchMinutes(): number {
    return REGULATION_MINUTES + this.firstHalfStoppage + this.secondHalfStoppage;
  }

  /**
   * Resolve a single game minute: events, playing time, fatigue and fitness.
   */
  private simulateMinute(minute: number): void {
    if (!this.matchState) return;

    const events = this.eventGenerator.generateMinuteEvents(this.matchState, minute);
    for (const event of events) {
      this.processEvent(event);
    }

    this.accruePlayingTime();
    this.updatePlayerPerformance();
    this.updateMomentum();
    this.updateCrowd();
    this.autoSubstituteAI();

    if (minute === HALF_TIME_MINUTE) {
      this.processEvent({
        id: uuidv4(),
        type: 'half-time',
        minute,
        team: 'home',
        description: `Half time: ${this.matchState.homeTeam.clubName} ${this.matchState.score.home} - ${this.matchState.score.away} ${this.matchState.awayTeam.clubName}`,
        timestamp: Date.now(),
        isHighlight: false,
      });
      this.recoverAtHalfTime();
    }
  }

  /**
   * Credit a minute of action to everyone on the pitch and wear them down
   * at a rate driven by their own fatigue resistance and the team's pressing.
   */
  private accruePlayingTime(): void {
    if (!this.matchState) return;

    const applyTo = (team: TeamMatchState) => {
      const pressingLoad = team.pressing === 'aggressive' ? 1.25 : team.pressing === 'conservative' ? 0.8 : 1;

      team.players.forEach((player) => {
        if (!player.onPitch || player.status !== 'playing') return;

        player.minutesPlayed += 1;
        const rate = (player.fatigueRate > 0 ? player.fatigueRate : 1) * pressingLoad;
        player.fatigue = Math.min(100, player.fatigue + 0.85 * rate);
        player.fitness = Math.max(0, 100 - player.fatigue);
      });
    };

    applyTo(this.matchState.homeTeam);
    applyTo(this.matchState.awayTeam);
  }

  private recoverAtHalfTime(): void {
    if (!this.matchState) return;

    const recover = (team: TeamMatchState) => {
      team.players.forEach((player) => {
        if (player.onPitch) {
          player.fatigue = Math.max(0, player.fatigue - 8);
          player.fitness = Math.max(0, 100 - player.fatigue);
        }
      });
    };

    recover(this.matchState.homeTeam);
    recover(this.matchState.awayTeam);
  }

  /**
   * Bring on fresh legs for exhausted or injured players on any side the
   * user is not controlling.
   */
  private autoSubstituteAI(): void {
    if (!this.matchState) return;

    const minute = this.matchState.currentMinute;

    const consider = (team: TeamMatchState, side: 'home' | 'away') => {
      if (team.clubId === this.matchState!.userTeamId) return;
      if (team.usedSubstitutes >= team.maxSubstitutes) return;

      const replacement = team.substitutes.find((p) => !p.isInjured && p.status === 'substituting');
      if (!replacement) return;

      // Injuries force a change immediately.
      const injured = team.players.find((p) => p.onPitch && p.status === 'injured');
      if (injured) {
        this.applySubstitution(team, side, injured, replacement);
        return;
      }

      // Otherwise managers make changes in the closing half-hour, taking off
      // whoever is most spent.
      const windows = [62, 72, 80];
      if (!windows.includes(Math.floor(minute))) return;

      const tired = team.players
        .filter((p) => p.onPitch && p.status === 'playing' && p.position !== 'GK')
        .sort((a, b) => b.fatigue - a.fatigue)[0];

      if (!tired || tired.fatigue < 45) return;

      this.applySubstitution(team, side, tired, replacement);
    };

    consider(this.matchState.homeTeam, 'home');
    consider(this.matchState.awayTeam, 'away');
  }

  private processEvent(event: MatchEvent): void {
    if (!this.matchState) return;

    switch (event.type) {
      case 'goal':
        this.handleGoal(event);
        break;
      case 'shot-on-target':
        this.handleShot(event, true);
        break;
      case 'shot-off-target':
      case 'shot-blocked':
        this.handleShot(event, false);
        break;
      case 'corner':
        this.handleCorner(event);
        break;
      case 'free-kick':
        this.handleFreeKick(event);
        break;
      case 'yellow-card':
        this.handleYellowCard(event);
        break;
      case 'red-card':
        this.handleRedCard(event);
        break;
      case 'foul':
        this.handleFoul(event);
        break;
      case 'injury':
        this.handleInjury(event);
        break;
      case 'tackle':
      case 'intercept':
        this.handleDefensiveAction(event);
        break;
      case 'pass':
      case 'miss-pass':
        this.handlePass(event);
        break;
      case 'possession-change':
        this.handlePossessionChange(event);
        break;
      default:
        break;
    }

    this.matchState.events.push(event);
    this.eventRecorder.recordEvent(event);

    if (event.isHighlight) {
      const clip = this.highlightManager.createHighlight(event, this.matchState);
      if (clip) this.matchState.highlights.push(clip);
    }

    this.emit('match-event', event);
  }

  private teamFor(event: MatchEvent): TeamMatchState {
    return event.team === 'home' ? this.matchState!.homeTeam : this.matchState!.awayTeam;
  }

  private handleGoal(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = this.teamFor(event);
    this.matchState.score[event.team] += 1;
    team.shots += 1;
    team.shotsOnTarget += 1;

    const scorer = team.players.find((p) => p.id === event.player!.id);
    if (scorer) {
      scorer.goals += 1;
      scorer.shots += 1;
      scorer.shotsOnTarget += 1;
      scorer.liveRating = Math.min(10, scorer.liveRating + 1.2);
      scorer.morale = Math.min(100, scorer.morale + 8);
    }

    if (event.assistPlayer) {
      const assister = team.players.find((p) => p.id === event.assistPlayer!.id);
      if (assister) {
        assister.assists += 1;
        assister.keyPasses += 1;
        assister.liveRating = Math.min(10, assister.liveRating + 0.6);
      }
    }

    const opponent = event.team === 'home' ? 'away' : 'home';
    this.matchState.momentum[event.team] = Math.min(100, this.matchState.momentum[event.team] + 25);
    this.matchState.momentum[opponent] = Math.max(-100, this.matchState.momentum[opponent] - 15);
    this.matchState.crowd.excitement = Math.min(100, this.matchState.crowd.excitement + 15);

    event.resultingScore = { ...this.matchState.score };
    this.emit('goal', event);
  }

  private handleShot(event: MatchEvent, onTarget: boolean): void {
    if (!this.matchState || !event.player) return;

    const team = this.teamFor(event);
    team.shots += 1;
    if (onTarget) team.shotsOnTarget += 1;

    const shooter = team.players.find((p) => p.id === event.player!.id);
    if (shooter) {
      shooter.shots += 1;
      if (onTarget) shooter.shotsOnTarget += 1;
    }
  }

  private handleCorner(event: MatchEvent): void {
    this.teamFor(event).corners += 1;
  }

  private handleFreeKick(event: MatchEvent): void {
    this.teamFor(event).freeKicks += 1;
  }

  private handleYellowCard(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = this.teamFor(event);
    const player = team.players.find((p) => p.id === event.player!.id);
    team.yellowCards += 1;

    if (!player) return;

    player.yellowCards += 1;
    player.morale = Math.max(0, player.morale - 8);
    player.liveRating = Math.max(0, player.liveRating - 0.3);

    if (player.yellowCards >= 2 && player.onPitch) {
      this.handleRedCard({
        ...event,
        id: uuidv4(),
        type: 'red-card',
        description: `${player.firstName} ${player.lastName} is sent off for a second bookable offence.`,
        isHighlight: true,
      });
    }
  }

  private handleRedCard(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = this.teamFor(event);
    const player = team.players.find((p) => p.id === event.player!.id);
    team.redCards += 1;

    if (player) {
      player.redCards += 1;
      player.onPitch = false;
      player.status = 'suspended';
      player.isSuspended = true;
      player.morale = Math.max(0, player.morale - 25);
      player.liveRating = Math.max(0, player.liveRating - 1.5);
    }

    const opponent = event.team === 'home' ? 'away' : 'home';
    this.matchState.momentum[event.team] = Math.max(-100, this.matchState.momentum[event.team] - 25);
    this.matchState.momentum[opponent] = Math.min(100, this.matchState.momentum[opponent] + 20);

    this.emit('red-card', event);
  }

  private handleFoul(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = this.teamFor(event);
    team.fouls += 1;

    const player = team.players.find((p) => p.id === event.player!.id);
    if (player) player.fouls += 1;
  }

  private handleInjury(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = this.teamFor(event);
    const player = team.players.find((p) => p.id === event.player!.id);

    if (player) {
      player.isInjured = true;
      player.status = 'injured';
      team.injuryTime += 1;
    }

    this.emit('injury', event);
  }

  private handleDefensiveAction(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = this.teamFor(event);
    const player = team.players.find((p) => p.id === event.player!.id);

    if (event.type === 'tackle') {
      team.tackles += 1;
      if (player) player.tackles += 1;
    } else if (player) {
      player.interceptions += 1;
    }

    if (player) player.touches += 1;
  }

  private handlePass(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = this.teamFor(event);
    const player = team.players.find((p) => p.id === event.player!.id);
    const completed = event.type === 'pass';

    team.passes += 1;

    if (player) {
      player.passes += 1;
      player.touches += 1;
      if (completed) {
        player.passAccuracy = ((player.passAccuracy * (player.passes - 1)) + 100) / player.passes;
      } else {
        player.passAccuracy = (player.passAccuracy * (player.passes - 1)) / player.passes;
      }
    }

    const completedTotal = team.players.reduce((sum, p) => sum + (p.passes * p.passAccuracy) / 100, 0);
    team.passAccuracy = team.passes > 0 ? (completedTotal / team.passes) * 100 : 0;
  }

  /**
   * Possession is tracked as a running share of contested minutes rather
   * than a raw counter, so the two figures always total 100.
   */
  private handlePossessionChange(event: MatchEvent): void {
    if (!this.matchState) return;

    const shift = 1.5;
    const gaining = event.team;
    const losing = gaining === 'home' ? 'away' : 'home';

    this.matchState.ballPossession[gaining] = Math.min(85, this.matchState.ballPossession[gaining] + shift);
    this.matchState.ballPossession[losing] = 100 - this.matchState.ballPossession[gaining];

    this.matchState.homeTeam.possession = this.matchState.ballPossession.home;
    this.matchState.awayTeam.possession = this.matchState.ballPossession.away;
  }

  private updatePlayerPerformance(): void {
    if (!this.matchState) return;

    const updateTeam = (team: TeamMatchState) => {
      team.players.forEach((player) => {
        if (player.onPitch && player.status === 'playing') {
          const performance = this.playerRater.calculateLiveRating(player);
          player.liveRating = performance.liveRating;
        }
      });
    };

    updateTeam(this.matchState.homeTeam);
    updateTeam(this.matchState.awayTeam);
  }

  private updateMomentum(): void {
    if (!this.matchState) return;

    (['home', 'away'] as const).forEach((side) => {
      const decayed = this.matchState!.momentum[side] * 0.96;
      this.matchState!.momentum[side] = Math.max(-100, Math.min(100, decayed));
    });
  }

  private updateCrowd(): void {
    if (!this.matchState) return;

    const crowd = this.matchState.crowd;
    crowd.excitement = Math.max(30, crowd.excitement - 0.4);
    crowd.noise = Math.max(30, Math.min(100, crowd.excitement));
    crowd.momentumShift = this.matchState.momentum.home - this.matchState.momentum.away;

    this.matchState.momentum.home = Math.min(100, this.matchState.momentum.home + crowd.homeSupport * 0.002);
  }

  private updateMatchPeriod(): void {
    if (!this.matchState) return;

    if (this.matchState.currentPeriod === 'finished') return;

    this.matchState.currentPeriod =
      this.matchState.currentMinute < HALF_TIME_MINUTE + this.firstHalfStoppage ? 'first-half' : 'second-half';
  }

  /**
   * Replace a player on the pitch with one from the bench and log the change.
   */
  private applySubstitution(
    team: TeamMatchState,
    side: 'home' | 'away',
    playerOut: MatchPlayer,
    playerIn: MatchPlayer
  ): void {
    if (!this.matchState) return;

    const outIndex = team.players.indexOf(playerOut);
    const inIndex = team.substitutes.indexOf(playerIn);
    if (outIndex === -1 || inIndex === -1) return;

    team.players[outIndex] = playerIn;
    team.substitutes[inIndex] = playerOut;

    playerOut.status = playerOut.status === 'injured' ? 'injured' : 'substituted';
    playerOut.onPitch = false;
    playerOut.isOnBench = true;

    playerIn.status = 'playing';
    playerIn.onPitch = true;
    playerIn.isOnBench = false;
    playerIn.isSubstitute = false;

    team.usedSubstitutes += 1;

    this.processEvent({
      id: uuidv4(),
      type: 'substitution',
      minute: Math.floor(this.matchState.currentMinute),
      team: side,
      player: playerIn,
      description: `${team.clubName}: ${playerIn.firstName} ${playerIn.lastName} replaces ${playerOut.firstName} ${playerOut.lastName}.`,
      timestamp: Date.now(),
      isHighlight: false,
    });

    this.emit('substitution', { playerOut, playerIn, team: side });
  }

  /**
   * User-driven substitution. Returns false when the change is not legal so
   * the interface can explain why nothing happened.
   */
  performSubstitution(playerOutId: string, playerInId: string): boolean {
    if (!this.matchState) return false;

    const userTeamId = this.matchState.userTeamId;
    const team =
      this.matchState.homeTeam.clubId === userTeamId
        ? this.matchState.homeTeam
        : this.matchState.awayTeam.clubId === userTeamId
        ? this.matchState.awayTeam
        : null;

    if (!team) return false;
    if (team.usedSubstitutes >= team.maxSubstitutes) return false;

    const playerOut = team.players.find((p) => p.id === playerOutId && p.onPitch);
    const playerIn = team.substitutes.find((p) => p.id === playerInId && !p.isInjured && p.status === 'substituting');
    if (!playerOut || !playerIn) return false;

    const side = team.clubId === this.matchState.homeTeam.clubId ? 'home' : 'away';
    this.applySubstitution(team, side, playerOut, playerIn);
    return true;
  }

  /**
   * Change the user team's shape mid-match; the new formation feeds straight
   * back into pressing, block height and event generation.
   */
  changeFormation(formation: Formation): boolean {
    if (!this.matchState) return false;

    const userTeamId = this.matchState.userTeamId;
    const team =
      this.matchState.homeTeam.clubId === userTeamId
        ? this.matchState.homeTeam
        : this.matchState.awayTeam.clubId === userTeamId
        ? this.matchState.awayTeam
        : null;

    if (!team) return false;

    team.formation = formation;
    team.mentality = formation.style;
    team.pressing = this.pressingFromFormation(formation);
    team.defensiveBlock = formation.pressing === 'high' ? 70 : formation.pressing === 'low' ? 30 : 50;

    this.processEvent({
      id: uuidv4(),
      type: 'tactical-change',
      minute: Math.floor(this.matchState.currentMinute),
      team: team.clubId === this.matchState.homeTeam.clubId ? 'home' : 'away',
      description: `${team.clubName} switch to ${formation.name} (${formation.style}).`,
      timestamp: Date.now(),
      isHighlight: false,
    });

    return true;
  }

  private finishMatch(): void {
    if (!this.matchState || this.matchState.currentPeriod === 'finished') return;

    this.isRunning = false;
    this.isPaused = false;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    const totalMinutes = this.totalMatchMinutes();
    this.matchState.currentMinute = totalMinutes;
    this.matchState.matchTime = Math.floor(totalMinutes);

    this.processEvent({
      id: uuidv4(),
      type: 'full-time',
      minute: Math.floor(totalMinutes),
      team: 'home',
      description: `Full time: ${this.matchState.homeTeam.clubName} ${this.matchState.score.home} - ${this.matchState.score.away} ${this.matchState.awayTeam.clubName}`,
      timestamp: Date.now(),
      isHighlight: true,
    });

    this.matchState.currentPeriod = 'finished';
    this.matchState.fixture.status = 'finished';
    this.matchState.fixture.attendance = this.estimateAttendance();

    this.applyPostMatchDevelopment();

    const analytics = this.analyticsCalculator.generateMatchAnalytics(this.matchState);
    const result: MatchResult = {
      matchState: this.matchState,
      analytics,
      finalScore: { ...this.matchState.score },
    };

    this.emit('match-finished', result);
  }

  private estimateAttendance(): number {
    if (!this.matchState) return 0;
    const base = 8000 + Math.floor(this.matchState.crowd.homeSupport * 180);
    return base + Math.floor(Math.random() * 4000);
  }

  /**
   * Convert the match into lasting change: form, morale and rating movement
   * for everyone who featured.
   */
  private applyPostMatchDevelopment(): void {
    if (!this.matchState) return;

    const won = (side: 'home' | 'away') =>
      side === 'home'
        ? this.matchState!.score.home > this.matchState!.score.away
        : this.matchState!.score.away > this.matchState!.score.home;

    const updateTeam = (team: TeamMatchState, side: 'home' | 'away') => {
      const allPlayers = [...team.players, ...team.substitutes];

      allPlayers.forEach((player) => {
        if (player.minutesPlayed <= 0) return;

        const impact = this.formCalculator.calculateMatchImpact(player, player.liveRating);
        player.form = Math.max(0, Math.min(100, player.form + impact.formChange));

        const moraleSwing = won(side) ? 5 : this.matchState!.score.home === this.matchState!.score.away ? 1 : -4;
        player.morale = Math.max(0, Math.min(100, player.morale + moraleSwing));

        const development = this.developmentTracker.calculateDevelopment(
          player,
          player.liveRating,
          player.minutesPlayed
        );

        player.rating = Math.max(1, Math.min(player.potential, player.rating + development.ratingChange));
      });
    };

    updateTeam(this.matchState.homeTeam, 'home');
    updateTeam(this.matchState.awayTeam, 'away');
  }

  /**
   * Run a whole match immediately with no timers. Used for every fixture the
   * user is not watching so the rest of the league keeps pace.
   */
  simulateToCompletion(): MatchResult | null {
    if (!this.matchState) return null;

    const totalMinutes = this.totalMatchMinutes();

    for (let minute = this.lastProcessedMinute + 1; minute <= totalMinutes; minute++) {
      this.lastProcessedMinute = minute;
      this.matchState.currentMinute = minute;
      this.simulateMinute(minute);
      this.updateMatchPeriod();
    }

    let result: MatchResult | null = null;
    const capture = (r: MatchResult) => {
      result = r;
    };

    this.on('match-finished', capture);
    this.finishMatch();
    this.off('match-finished', capture);

    return result;
  }

  pause(): void {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.elapsedBeforePause += Date.now() - this.gameStartTime;
    this.emit('match-paused', this.getSnapshot());
  }

  resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.gameStartTime = Date.now();
    this.emit('match-resumed', this.getSnapshot());
  }

  /**
   * A shallow copy of live state. The engine mutates its own objects in
   * place, so consumers need a fresh reference to detect changes.
   */
  getSnapshot(): { matchState: MatchState; playerPositions: PlayerPosition[]; ball: Ball } | null {
    if (!this.matchState) return null;

    return {
      matchState: { ...this.matchState },
      playerPositions: this.simulator.getAllPlayerPositions(),
      ball: this.simulator.getBallState(),
    };
  }

  getMatchState(): MatchState | null {
    return this.matchState;
  }

  getMatchProgress(): number {
    if (!this.matchState) return 0;
    return Math.min(100, (this.matchState.currentMinute / this.totalMatchMinutes()) * 100);
  }

  getRunningState(): { isRunning: boolean; isPaused: boolean } {
    return { isRunning: this.isRunning, isPaused: this.isPaused };
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Match engine listener failed for "${event}":`, error);
      }
    });
  }

  destroy(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isRunning = false;
    this.listeners.clear();
    this.matchState = null;
  }
}

function getDefaultConfig(): SimulationConfig {
  return {
    timeStep: 1000,
    eventsPerMinute: 10,
    realism: 'realistic',
    injuryRate: 0.00012,
    yellowCardRate: 0.02,
    randomness: 50,
  };
}

export default MatchEngine;
