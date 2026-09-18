// src/global/engine/MatchEngine.ts
// Main match engine orchestrator - coordinates all simulation systems

import { v4 as uuidv4 } from 'uuid';
import {
  MatchState,
  MatchSetup,
  TeamMatchState,
  MatchPlayer,
  MatchEvent,
  EventType,
  Formation,
  MatchFixture,
  SimulationConfig,
  MatchResultPredictor,
  SubstitutionAction,
  PlayerDevelopment,
  LivePerformance,
  TacticalChange,
  Ball,
  PlayerPosition,
  HighlightClip,
  MatchAnalytics,
} from './types/MatchTypes';
import { MatchSimulator } from './simulation/MatchSimulator';
import { EventGenerator } from './simulation/EventGenerator';
import { PlayerRater } from './performance/PlayerRater';
import { FormCalculator } from './performance/FormCalculator';
import { DevelopmentTracker } from './performance/DevelopmentTracker';
import { HighlightManager } from './visualizer/HighlightManager';
import { MatchAnalytics as AnalyticsCalculator } from './analytics/MatchAnalytics';
import { EventRecorder } from './analytics/EventRecorder';
import { getMatchSpeedConfig, validateMatchSpeed, type MatchSpeed } from '../fixtures/MatchEngineConfig';

export class MatchEngine {
  private matchState: MatchState | null = null;
  private simulationConfig: SimulationConfig;
  private matchSpeed: MatchSpeed;
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  // Component systems
  private simulator: MatchSimulator;
  private eventGenerator: EventGenerator;
  private playerRater: PlayerRater;
  private formCalculator: FormCalculator;
  private developmentTracker: DevelopmentTracker;
  private highlightManager: HighlightManager;
  private analyticsCalculator: AnalyticsCalculator;
  private eventRecorder: EventRecorder;

  // Event listeners
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  // Simulation loop
  private simulationInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = 0;
  private gameStartTime: number = 0;

  constructor(config: SimulationConfig = getDefaultConfig(), matchSpeed: MatchSpeed = 'default') {
    this.matchSpeed = validateMatchSpeed(matchSpeed);
    this.simulationConfig = this.buildConfigFromMatchSpeed(config);

    // Initialize all subsystems
    this.simulator = new MatchSimulator(this.simulationConfig);
    this.eventGenerator = new EventGenerator(this.simulationConfig);
    this.playerRater = new PlayerRater();
    this.formCalculator = new FormCalculator();
    this.developmentTracker = new DevelopmentTracker();
    this.highlightManager = new HighlightManager();
    this.analyticsCalculator = new AnalyticsCalculator();
    this.eventRecorder = new EventRecorder();
  }

  /**
   * Build simulation config from match speed specification
   */
  private buildConfigFromMatchSpeed(baseConfig: SimulationConfig): SimulationConfig {
    const speedConfig = getMatchSpeedConfig(this.matchSpeed);

    return {
      ...baseConfig,
      timeStep: 1000 / speedConfig.updateFrequencyHz, // Convert Hz to milliseconds
      eventsPerMinute: baseConfig.eventsPerMinute * speedConfig.eventDensity,
    };
  }

  /**
   * Get current match speed
   */
  getMatchSpeed(): MatchSpeed {
    return this.matchSpeed;
  }

  /**
   * Set match speed (can only be changed before match starts)
   */
  setMatchSpeed(speed: MatchSpeed): void {
    if (this.isRunning) {
      console.warn('Cannot change match speed while match is running');
      return;
    }

    this.matchSpeed = validateMatchSpeed(speed);
    this.simulationConfig = this.buildConfigFromMatchSpeed(this.simulationConfig);
    console.log(`✅ Match speed set to: ${this.matchSpeed}`);
  }

  /**
   * Initialize match with fixture and lineups
   */
  async initializeMatch(setup: MatchSetup): Promise<void> {
    console.log('🎮 Initializing match:', setup.fixture.homeTeamName, 'vs', setup.fixture.awayTeamName);

    this.matchState = {
      id: uuidv4(),
      fixture: setup.fixture,
      homeTeam: this.createTeamState(setup.fixture.homeClubId, setup.fixture.homeTeamName, setup.homeLineup, setup.homeFormation),
      awayTeam: this.createTeamState(setup.fixture.awayClubId, setup.fixture.awayTeamName, setup.awayLineup, setup.awayFormation),
      currentMinute: 0,
      currentPeriod: 'first-half',
      matchTime: 0,
      ballPossession: { home: 50, away: 50 },
      score: { home: 0, away: 0 },
      momentum: { home: 0, away: 0 },
      events: [],
      highlights: [],
      weather: {
        type: 'sunny',
        temperature: 22,
        windSpeed: 5,
        impact: {
          ballControl: 0,
          ballSpeed: 0,
          visibility: 100,
          pitchCondition: 'dry',
        },
      },
      crowd: {
        excitement: 75,
        confidence: 60,
        homeSupport: 70,
        awaySupport: 30,
        noise: 75,
        momentumShift: 0,
      },
      isUserMatch: true,
      userTeamId: setup.userTeamId,
    };

    // Generate opening event
    this.addEvent({
      id: uuidv4(),
      type: 'kickoff',
      minute: 0,
      team: 'home',
      description: `${setup.fixture.homeTeamName} kick off. Match begins!`,
      timestamp: Date.now(),
      isHighlight: true,
    });

    console.log('✅ Match initialized successfully');
    this.emit('match-initialized', this.matchState);
  }

  /**
   * Start match simulation
   */
  startMatch(): void {
    if (!this.matchState) {
      throw new Error('Match not initialized');
    }

    if (this.isRunning) {
      console.warn('Match already running');
      return;
    }

    console.log(`⚽ Match started (Speed: ${this.matchSpeed})`);
    this.isRunning = true;
    this.isPaused = false;
    this.lastUpdateTime = Date.now();
    this.gameStartTime = Date.now();

    const speedConfig = getMatchSpeedConfig(this.matchSpeed);
    console.log(`📊 Match Configuration: ${speedConfig.description}`);
    console.log(`⏱️  Update frequency: ${speedConfig.updateFrequencyHz} Hz (every ${this.simulationConfig.timeStep}ms)`);

    // Run simulation loop
    this.simulationInterval = setInterval(() => {
      this.update();
    }, this.simulationConfig.timeStep);

    this.emit('match-started', this.matchState);
  }

  /**
   * Main simulation update loop
   */
  private async update(): Promise<void> {
    if (!this.matchState || !this.isRunning || this.isPaused) return;

    const now = Date.now();
    const speedConfig = getMatchSpeedConfig(this.matchSpeed);

    // Calculate game minutes based on real elapsed time and match speed
    const elapsedRealMs = now - this.gameStartTime;
    // 90 real game minutes divided by the configured realTimeMs to get the multiplier
    const gameMinutesPerRealMs = 90 / speedConfig.realTimeMs;
    this.matchState.currentMinute = elapsedRealMs * gameMinutesPerRealMs;

    this.lastUpdateTime = now;

    // Update current period
    this.updateMatchPeriod();

    // Core simulation steps
    if (this.matchState.currentMinute < 90 || this.matchState.currentPeriod !== 'finished') {
      // Generate probabilistic events
      const newEvents = await this.eventGenerator.generateEvents(
        this.matchState,
        this.simulationConfig.eventsPerMinute
      );

      // Process each event
      for (const event of newEvents) {
        this.processEvent(event);
      }

      // Update player performance ratings
      this.updatePlayerPerformance();

      // Update momentum and crowd
      this.updateMomentum();
      this.updateCrowd();

      // Check for injury events
      await this.checkInjuryEvents();

      // Broadcast state update
      this.emit('match-update', {
        matchState: this.matchState,
        events: newEvents,
      });
    }

    // Check if match should end
    if (this.shouldEndMatch()) {
      this.finishMatch();
    }
  }

  /**
   * Process individual match event
   */
  private processEvent(event: MatchEvent): void {
    if (!this.matchState) return;

    console.log(`⚽ Event (${event.minute}m): ${event.description}`);

    // Update match state based on event type
    switch (event.type) {
      case 'goal':
        this.handleGoal(event);
        break;
      case 'shot-on-target':
        this.handleShotOnTarget(event);
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
      case 'substitution':
        this.handleSubstitution(event);
        break;
      case 'tackle':
        this.handleTackle(event);
        break;
      case 'pass':
        this.handlePass(event);
        break;
      case 'possession-change':
        this.handlePossessionChange(event);
        break;
    }

    // Record event
    this.matchState.events.push(event);
    this.eventRecorder.recordEvent(event);

    // Check if this is a highlight
    if (event.isHighlight) {
      this.highlightManager.createHighlight(event, this.matchState);
    }

    // Emit event
    this.emit('match-event', event);
  }

  /**
   * Handle goal event
   */
  private handleGoal(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = event.team === 'home' ? this.matchState.homeTeam : this.matchState.awayTeam;

    // Update score
    if (event.team === 'home') {
      this.matchState.score.home += 1;
    } else {
      this.matchState.score.away += 1;
    }

    // Update player stats
    const scorer = team.players.find(p => p.id === event.player!.id);
    if (scorer) {
      scorer.goals += 1;
      scorer.liveRating = Math.min(10, scorer.liveRating + 0.5);
    }

    // Update assist player if applicable
    if (event.assistPlayer) {
      const assister = team.players.find(p => p.id === event.assistPlayer!.id);
      if (assister) {
        assister.assists += 1;
      }
    }

    // Momentum shift
    this.matchState.momentum[event.team] += 20;
    this.matchState.momentum[event.team === 'home' ? 'away' : 'home'] -= 10;

    // Crowd reaction
    if (event.team === 'home') {
      this.matchState.crowd.homeSupport += 10;
      this.matchState.crowd.excitement += 20;
    } else {
      this.matchState.crowd.awaySupport += 10;
      this.matchState.crowd.excitement += 20;
    }

    event.resultingScore = { ...this.matchState.score };
    event.isHighlight = true;

    this.emit('goal', event);
  }

  /**
   * Handle shot on target event
   */
  private handleShotOnTarget(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = event.team === 'home' ? this.matchState.homeTeam : this.matchState.awayTeam;
    team.shotsOnTarget += 1;

    const shooter = team.players.find(p => p.id === event.player!.id);
    if (shooter) {
      shooter.shotsOnTarget += 1;
    }
  }

  /**
   * Handle corner event
   */
  private handleCorner(event: MatchEvent): void {
    if (!this.matchState) return;

    const team = event.team === 'home' ? this.matchState.homeTeam : this.matchState.awayTeam;
    team.corners += 1;

    event.isHighlight = false; // Only highlight if it results in something
  }

  /**
   * Handle free kick event
   */
  private handleFreeKick(event: MatchEvent): void {
    if (!this.matchState) return;

    const team = event.team === 'home' ? this.matchState.homeTeam : this.matchState.awayTeam;
    team.freeKicks += 1;
  }

  /**
   * Handle yellow card event
   */
  private handleYellowCard(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = event.team === 'home' ? this.matchState.homeTeam : this.matchState.awayTeam;
    const player = team.players.find(p => p.id === event.player!.id);

    if (player) {
      player.yellowCards += 1;
      player.morale -= 10;

      // Second yellow = red
      if (player.yellowCards >= 2) {
        this.handleRedCard({
          ...event,
          type: 'red-card',
          description: `${event.player.firstName} ${event.player.lastName} is sent off (second yellow)`,
        });
      }
    }

    team.yellowCards += 1;
  }

  /**
   * Handle red card event
   */
  private handleRedCard(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = event.team === 'home' ? this.matchState.homeTeam : this.matchState.awayTeam;
    const player = team.players.find(p => p.id === event.player!.id);

    if (player) {
      player.redCards += 1;
      player.onPitch = false;
      player.status = 'suspended';
      player.morale -= 30;
    }

    team.redCards += 1;

    // Momentum shift heavily towards other team
    this.matchState.momentum[event.team] -= 30;
    this.matchState.momentum[event.team === 'home' ? 'away' : 'home'] += 20;

    event.isHighlight = true;
    this.emit('red-card', event);
  }

  /**
   * Handle foul event
   */
  private handleFoul(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = event.team === 'home' ? this.matchState.homeTeam : this.matchState.awayTeam;
    const player = team.players.find(p => p.id === event.player!.id);

    if (player) {
      player.fouls += 1;
    }

    team.fouls += 1;
  }

  /**
   * Handle injury event
   */
  private handleInjury(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = event.team === 'home' ? this.matchState.homeTeam : this.matchState.awayTeam;
    const player = team.players.find(p => p.id === event.player!.id);

    if (player) {
      player.isInjured = true;
      player.status = 'injured';
      team.injuryTime += 2; // Add injury time
    }

    event.isHighlight = true;
    this.emit('injury', event);
  }

  /**
   * Handle substitution
   */
  async performSubstitution(playerOutId: string, playerInId: string, reason: string = 'tactical'): Promise<void> {
    if (!this.matchState) return;

    const userTeamId = this.matchState.userTeamId;
    let team: TeamMatchState | null = null;

    if (this.matchState.homeTeam.clubId === userTeamId) {
      team = this.matchState.homeTeam;
    } else if (this.matchState.awayTeam.clubId === userTeamId) {
      team = this.matchState.awayTeam;
    }

    if (!team) {
      console.error('Cannot find user team for substitution');
      return;
    }

    // Find players
    const playerOut = team.players.find(p => p.id === playerOutId);
    const playerIn = team.substitutes.find(p => p.id === playerInId);

    if (!playerOut || !playerIn) {
      console.error('Invalid substitution players');
      return;
    }

    // Execute substitution
    const outIndex = team.players.indexOf(playerOut);
    team.players[outIndex] = playerIn;
    team.substitutes[team.substitutes.indexOf(playerIn)] = playerOut;

    playerOut.status = 'substituted';
    playerOut.onPitch = false;
    playerIn.status = 'playing';
    playerIn.onPitch = true;

    team.usedSubstitutes += 1;

    // Create event
    const event: MatchEvent = {
      id: uuidv4(),
      type: 'substitution',
      minute: this.matchState.currentMinute,
      team: this.matchState.homeTeam.clubId === team.clubId ? 'home' : 'away',
      player: playerIn,
      description: `${playerOut.firstName} ${playerOut.lastName} comes off. ${playerIn.firstName} ${playerIn.lastName} comes on.`,
      timestamp: Date.now(),
      isHighlight: false,
    };

    this.processEvent(event);
    this.emit('substitution', event);
  }

  /**
   * Handle substitution event in simulation
   */
  private handleSubstitution(event: MatchEvent): void {
    // Already handled in processEvent flow
  }

  /**
   * Handle tackle event
   */
  private handleTackle(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = event.team === 'home' ? this.matchState.homeTeam : this.matchState.awayTeam;
    const player = team.players.find(p => p.id === event.player!.id);

    if (player) {
      player.tackles += 1;
    }

    team.tackles += 1;
  }

  /**
   * Handle pass event
   */
  private handlePass(event: MatchEvent): void {
    if (!this.matchState || !event.player) return;

    const team = event.team === 'home' ? this.matchState.homeTeam : this.matchState.awayTeam;
    const player = team.players.find(p => p.id === event.player!.id);

    if (player) {
      player.passes += 1;
      player.touches += 1;
    }

    team.passes += 1;
  }

  /**
   * Handle possession change
   */
  private handlePossessionChange(event: MatchEvent): void {
    if (!this.matchState) return;

    // Update possession stats
    if (event.team === 'home') {
      this.matchState.ballPossession.home += 1;
    } else {
      this.matchState.ballPossession.away += 1;
    }

    // Normalize to ensure totals to 100
    const total = this.matchState.ballPossession.home + this.matchState.ballPossession.away;
    this.matchState.ballPossession.home = (this.matchState.ballPossession.home / total) * 100;
    this.matchState.ballPossession.away = (this.matchState.ballPossession.away / total) * 100;
  }

  /**
   * Update player live performance ratings
   */
  private updatePlayerPerformance(): void {
    if (!this.matchState) return;

    const updateTeam = (team: TeamMatchState) => {
      team.players.forEach(player => {
        if (player.onPitch && player.status === 'playing') {
          const performance = this.playerRater.calculateLiveRating(player);
          player.liveRating = performance.liveRating;
          player.fatigue = Math.min(100, player.fatigue + 0.5); // Increase fatigue gradually
        }
      });
    };

    updateTeam(this.matchState.homeTeam);
    updateTeam(this.matchState.awayTeam);
  }

  /**
   * Update match momentum
   */
  private updateMomentum(): void {
    if (!this.matchState) return;

    // Momentum gradually returns to 0
    this.matchState.momentum.home = this.matchState.momentum.home * 0.98;
    this.matchState.momentum.away = this.matchState.momentum.away * 0.98;

    // Clamp between -100 and 100
    this.matchState.momentum.home = Math.max(-100, Math.min(100, this.matchState.momentum.home));
    this.matchState.momentum.away = Math.max(-100, Math.min(100, this.matchState.momentum.away));
  }

  /**
   * Update crowd mood
   */
  private updateCrowd(): void {
    if (!this.matchState) return;

    // Crowd excitement decreases over time
    this.matchState.crowd.excitement = Math.max(30, this.matchState.crowd.excitement - 0.2);

    // Crowd affects momentum
    if (this.matchState.crowd.homeSupport > this.matchState.crowd.awaySupport) {
      this.matchState.momentum.home += this.matchState.crowd.excitement * 0.001;
    } else {
      this.matchState.momentum.away += this.matchState.crowd.excitement * 0.001;
    }
  }

  /**
   * Check for injury events
   */
  private async checkInjuryEvents(): Promise<void> {
    if (!this.matchState) return;

    // 5% chance per update of an injury in one of the teams
    if (Math.random() < 0.05) {
      const team = Math.random() < 0.5 ? this.matchState.homeTeam : this.matchState.awayTeam;
      const randomPlayer = team.players[Math.floor(Math.random() * team.players.length)];

      if (randomPlayer && randomPlayer.onPitch && !randomPlayer.isInjured) {
        const event: MatchEvent = {
          id: uuidv4(),
          type: 'injury',
          minute: this.matchState.currentMinute,
          team: team === this.matchState.homeTeam ? 'home' : 'away',
          player: randomPlayer,
          description: `${randomPlayer.firstName} ${randomPlayer.lastName} is injured and requires treatment.`,
          timestamp: Date.now(),
          isHighlight: true,
        };

        this.processEvent(event);
      }
    }
  }

  /**
   * Update current match period
   */
  private updateMatchPeriod(): void {
    if (!this.matchState) return;

    if (this.matchState.currentMinute < 45) {
      this.matchState.currentPeriod = 'first-half';
    } else if (this.matchState.currentMinute < 90) {
      this.matchState.currentPeriod = 'second-half';
    } else if (this.matchState.currentMinute < 120) {
      this.matchState.currentPeriod = 'extra-time';
    } else {
      this.matchState.currentPeriod = 'penalty-shootout';
    }

    this.matchState.matchTime = Math.floor(this.matchState.currentMinute);
  }

  /**
   * Check if match should end
   */
  private shouldEndMatch(): boolean {
    if (!this.matchState) return false;

    // Simple end condition: 90 minutes + injury time
    return this.matchState.currentMinute >= 90;
  }

  /**
   * Finish match and calculate final statistics
   */
  private finishMatch(): void {
    if (!this.matchState) return;

    console.log('🏁 Match Finished');

    this.isRunning = false;
    this.isPaused = false;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    this.matchState.currentPeriod = 'finished';

    // Calculate final statistics
    const analytics = this.analyticsCalculator.generateMatchAnalytics(this.matchState);

    // Update player statistics in database
    this.updatePlayerStatisticsInDatabase();

    // Update player form and development
    this.updatePlayerFormAndDevelopment();

    this.emit('match-finished', {
      matchState: this.matchState,
      analytics,
      finalScore: this.matchState.score,
    });
  }

  /**
   * Update player statistics in database
   */
  private updatePlayerStatisticsInDatabase(): void {
    if (!this.matchState) return;

    // This would integrate with the game database
    // TODO: Implement database update
  }

  /**
   * Update player form and development after match
   */
  private updatePlayerFormAndDevelopment(): void {
    if (!this.matchState) return;

    const updateTeam = (team: TeamMatchState) => {
      team.players.forEach(player => {
        // Update form based on rating
        const formChange = (player.liveRating - 5) * 2; // -10 to +10
        player.form = Math.max(0, Math.min(100, player.form + formChange));

        // Update experience based on minutes played
        const experienceGain = player.minutesPlayed * 0.5;

        // Development progression
        const development = this.developmentTracker.calculateDevelopment(player, experienceGain);
        if (development.ratingChange > 0) {
          // Rating can improve based on performance
          console.log(`${player.firstName} ${player.lastName} gained ${development.ratingChange} rating points`);
        }
      });
    };

    updateTeam(this.matchState.homeTeam);
    updateTeam(this.matchState.awayTeam);
  }

  /**
   * Pause the match
   */
  pause(): void {
    this.isPaused = true;
    this.emit('match-paused', this.matchState);
  }

  /**
   * Resume the match
   */
  resume(): void {
    this.isPaused = false;
    this.emit('match-resumed', this.matchState);
  }

  /**
   * Add event to match
   */
  private addEvent(event: Omit<MatchEvent, 'id'> & { id?: string }): void {
    if (!this.matchState) return;

    const fullEvent: MatchEvent = {
      ...event,
      id: event.id || uuidv4(),
    } as MatchEvent;

    this.matchState.events.push(fullEvent);
  }

  /**
   * Get current match state
   */
  getMatchState(): MatchState | null {
    return this.matchState;
  }

  /**
   * Get match speed configuration info
   */
  getMatchSpeedInfo(): ReturnType<typeof getMatchSpeedConfig> {
    return getMatchSpeedConfig(this.matchSpeed);
  }

  /**
   * Get match progress as percentage
   */
  getMatchProgress(): number {
    if (!this.matchState) return 0;
    return Math.min(100, (this.matchState.currentMinute / 90) * 100);
  }

  /**
   * Register event listener
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unregister event listener
   */
  off(event: string, callback: (data: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup and destroy engine
   */
  destroy(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    this.listeners.clear();
    this.matchState = null;
  }
}

// Default simulation configuration
function getDefaultConfig(): SimulationConfig {
  return {
    timeStep: 16, // ~60 FPS
    eventsPerMinute: 5,
    realism: 'realistic',
    injuryRate: 0.15,
    yellowCardRate: 0.25,
    randomness: 50,
  };
}

export default MatchEngine;
