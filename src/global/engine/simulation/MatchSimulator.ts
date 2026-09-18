// src/global/engine/simulation/MatchSimulator.ts
// Core match simulation and physics engine

import type {
  MatchState,
  TeamMatchState,
  Ball,
  PlayerPosition,
  Vector2D,
  SimulationConfig,
  MatchResultPredictor,
} from '../types/MatchTypes';

export class MatchSimulator {
  private readonly config: SimulationConfig;
  private ball: Ball;
  private homeFormationAnchors: Map<string, Vector2D> = new Map();
  private ball_target: Vector2D = { x: 50, y: 50 };
  private playerPositions: Map<string, PlayerPosition> = new Map();

  constructor(config: SimulationConfig) {
    this.config = config;
    this.ball = {
      position: { x: 50, y: 50 }, // Center of field
      velocity: { x: 0, y: 0 },
      possession: null,
      lastTouched: null,
      inPlay: true,
    };
  }

  /**
   * Initialize player positions based on formation
   */
  initializePositions(matchState: MatchState): void {
    this.playerPositions.clear();
    this.homeFormationAnchors.clear();
    this.setupFormation(matchState.homeTeam, 'home');
    this.setupFormation(matchState.awayTeam, 'away');
    this.resetBall();
  }

  /**
   * Setup players according to formation
   */
  private setupFormation(team: TeamMatchState, side: 'home' | 'away'): void {
    const formation = team.formation;
    const [defenders, midfielders, forwards] = formation.shape;

    let positionIndex = 0;

    // Goalkeeper
    const gk = team.players[positionIndex++];
    if (gk) {
      this.setPlayerPosition(gk.id, { x: side === 'home' ? 5 : 95, y: 50 });
    }

    // Defenders (line at x=25 or 75)
    const defenderX = side === 'home' ? 25 : 75;
    for (let i = 0; i < defenders; i++) {
      const player = team.players[positionIndex++];
      if (player) {
        const spacing = 100 / (defenders + 1);
        const y = spacing * (i + 1);
        this.setPlayerPosition(player.id, { x: defenderX, y });
      }
    }

    // Midfielders (line at x=40 or 60)
    const midfielderX = side === 'home' ? 40 : 60;
    for (let i = 0; i < midfielders; i++) {
      const player = team.players[positionIndex++];
      if (player) {
        const spacing = 100 / (midfielders + 1);
        const y = spacing * (i + 1);
        this.setPlayerPosition(player.id, { x: midfielderX, y });
      }
    }

    // Forwards (line at x=60 or 40)
    const forwardX = side === 'home' ? 70 : 30;
    for (let i = 0; i < forwards; i++) {
      const player = team.players[positionIndex++];
      if (player) {
        const spacing = 100 / (forwards + 1);
        const y = spacing * (i + 1);
        this.setPlayerPosition(player.id, { x: forwardX, y });
      }
    }
  }

  /**
   * Set player position
   */
  private setPlayerPosition(playerId: string, position: Vector2D, velocity: Vector2D = { x: 0, y: 0 }): void {
    this.homeFormationAnchors.set(playerId, { ...position });
    this.playerPositions.set(playerId, {
      playerId,
      position: { ...position },
      rotation: 0,
      velocity: { ...velocity },
      speed: 0,
      direction: 0,
    });
  }

  /**
   * Get player position
   */
  getPlayerPosition(playerId: string): PlayerPosition | undefined {
    return this.playerPositions.get(playerId);
  }

  /**
   * Get all player positions
   */
  getAllPlayerPositions(): PlayerPosition[] {
    return Array.from(this.playerPositions.values());
  }

  /**
   * Drift every player between their formation anchor and the ball, so the
   * shape stays recognisable while the play visibly shifts up and down the
   * pitch.
   */
  updatePlayerPositions(matchState: MatchState): void {
    this.advanceBallTarget(matchState);

    this.driftTeam(matchState.homeTeam, 'home');
    this.driftTeam(matchState.awayTeam, 'away');

    this.ball.position.x += (this.ball_target.x - this.ball.position.x) * 0.25;
    this.ball.position.y += (this.ball_target.y - this.ball.position.y) * 0.25;
  }

  /**
   * Move the notional centre of play toward whichever side currently holds
   * the advantage in possession and momentum.
   */
  private advanceBallTarget(matchState: MatchState): void {
    const homePush = (matchState.ballPossession.home - 50) / 50 + matchState.momentum.home / 200;
    const targetX = 50 + homePush * 25;

    this.ball_target = {
      x: Math.max(8, Math.min(92, targetX + (Math.random() - 0.5) * 18)),
      y: Math.max(8, Math.min(92, 50 + (Math.random() - 0.5) * (this.config.randomness / 2))),
    };
  }

  private driftTeam(team: TeamMatchState, side: 'home' | 'away'): void {
    const blockShift = ((team.defensiveBlock - 50) / 50) * 8 * (side === 'home' ? 1 : -1);

    team.players.forEach((player) => {
      const pos = this.playerPositions.get(player.id);
      const anchor = this.homeFormationAnchors.get(player.id);
      if (!pos || !anchor) return;

      if (!player.onPitch) {
        pos.velocity = { x: 0, y: 0 };
        pos.speed = 0;
        return;
      }

      // Goalkeepers hold their line rather than chasing play.
      const pull = player.position === 'GK' ? 0.04 : 0.22;
      const targetX = anchor.x + blockShift + (this.ball_target.x - anchor.x) * pull;
      const targetY = anchor.y + (this.ball_target.y - anchor.y) * pull;

      const dx = targetX - pos.position.x;
      const dy = targetY - pos.position.y;

      pos.position.x = Math.max(0, Math.min(100, pos.position.x + dx * 0.3));
      pos.position.y = Math.max(0, Math.min(100, pos.position.y + dy * 0.3));
      pos.velocity = { x: dx, y: dy };
      pos.speed = Math.min(100, Math.hypot(dx, dy) * 10);
      pos.direction = (Math.atan2(dy, dx) * 180) / Math.PI;
      pos.rotation = pos.direction;
    });
  }

  /**
   * Simulate player movement
   */
  movePlayer(playerId: string, direction: Vector2D, speed: number): void {
    const pos = this.playerPositions.get(playerId);
    if (!pos) return;

    // Clamp speed
    speed = Math.min(100, Math.max(0, speed));

    // Update velocity
    pos.velocity = {
      x: (direction.x / 100) * speed,
      y: (direction.y / 100) * speed,
    };

    pos.speed = speed;
    pos.direction = Math.atan2(direction.y, direction.x) * (180 / Math.PI);

    // Apply movement
    pos.position.x = Math.max(0, Math.min(100, pos.position.x + pos.velocity.x * 0.1));
    pos.position.y = Math.max(0, Math.min(100, pos.position.y + pos.velocity.y * 0.1));
  }

  /**
   * Ball physics - simulate ball movement
   */
  updateBallPhysics(): void {
    if (!this.ball.inPlay) return;

    // Apply friction
    this.ball.velocity.x *= 0.98;
    this.ball.velocity.y *= 0.98;

    // Update position
    this.ball.position.x += this.ball.velocity.x * 0.1;
    this.ball.position.y += this.ball.velocity.y * 0.1;

    // Boundary detection
    if (this.ball.position.x < 0 || this.ball.position.x > 100) {
      this.ball.position.x = Math.max(0, Math.min(100, this.ball.position.x));
      this.ball.velocity.x *= -0.8;
    }

    if (this.ball.position.y < 0 || this.ball.position.y > 100) {
      this.ball.position.y = Math.max(0, Math.min(100, this.ball.position.y));
      this.ball.velocity.y *= -0.8;
    }

    // Stop if moving slowly
    if (Math.abs(this.ball.velocity.x) < 0.1 && Math.abs(this.ball.velocity.y) < 0.1) {
      this.ball.velocity = { x: 0, y: 0 };
    }
  }

  /**
   * Player controls ball
   */
  playerTouchBall(playerId: string): void {
    this.ball.possession = playerId;
    this.ball.lastTouched = playerId;
  }

  /**
   * Player passes ball
   */
  passBall(fromPlayerId: string, toPlayerId: string, power: number): Vector2D {
    const fromPos = this.playerPositions.get(fromPlayerId);
    const toPos = this.playerPositions.get(toPlayerId);

    if (!fromPos || !toPos) {
      return { x: 0, y: 0 };
    }

    // Calculate pass direction
    const dx = toPos.position.x - fromPos.position.x;
    const dy = toPos.position.y - fromPos.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return { x: 0, y: 0 };
    }

    // Normalize and apply power
    const normalizedX = (dx / distance) * (power / 100);
    const normalizedY = (dy / distance) * (power / 100);

    this.ball.velocity = {
      x: normalizedX * 5,
      y: normalizedY * 5,
    };

    this.ball.possession = toPlayerId;
    return this.ball.velocity;
  }

  /**
   * Player shoots
   */
  shootBall(fromPlayerId: string, targetX: number, targetY: number, power: number): Vector2D {
    const fromPos = this.playerPositions.get(fromPlayerId);
    if (!fromPos) {
      return { x: 0, y: 0 };
    }

    // Calculate shot direction toward target
    const dx = targetX - fromPos.position.x;
    const dy = targetY - fromPos.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return { x: 0, y: 0 };
    }

    // Normalize and apply power
    const normalizedX = (dx / distance) * (power / 100);
    const normalizedY = (dy / distance) * (power / 100);

    this.ball.velocity = {
      x: normalizedX * 10, // Shots are faster than passes
      y: normalizedY * 10,
    };

    this.ball.possession = null;
    return this.ball.velocity;
  }

  /**
   * Check if ball is near goal
   */
  isBallNearGoal(team: 'home' | 'away', threshold: number = 15): boolean {
    if (team === 'home') {
      return this.ball.position.x > 100 - threshold;
    } else {
      return this.ball.position.x < threshold;
    }
  }

  /**
   * Check if shot is goal
   */
  isGoal(team: 'home' | 'away'): boolean {
    const threshold = 5;
    const goalY = 50;
    const goalHeight = 25;

    if (team === 'home') {
      // Shooting at right goal
      return (
        this.ball.position.x >= 100 - threshold &&
        this.ball.position.y >= goalY - goalHeight / 2 &&
        this.ball.position.y <= goalY + goalHeight / 2
      );
    } else {
      // Shooting at left goal
      return (
        this.ball.position.x <= threshold &&
        this.ball.position.y >= goalY - goalHeight / 2 &&
        this.ball.position.y <= goalY + goalHeight / 2
      );
    }
  }

  /**
   * Predict match outcome based on current state
   */
  predictMatchOutcome(matchState: MatchState): MatchResultPredictor {
    const homeTeam = matchState.homeTeam;
    const awayTeam = matchState.awayTeam;

    // Calculate team strength
    const homeStrength = this.calculateTeamStrength(homeTeam);
    const awayStrength = this.calculateTeamStrength(awayTeam);

    // Expected goals calculation
    const homeExpectedGoals = (homeStrength / (homeStrength + awayStrength)) * 2.5;
    const awayExpectedGoals = (awayStrength / (homeStrength + awayStrength)) * 2.5;

    // Win probability based on Elo-like calculation
    const totalStrength = homeStrength + awayStrength;
    const homeProb = homeStrength / totalStrength;
    const awayProb = awayStrength / totalStrength;

    // Draw probability (reduced if teams are unbalanced)
    const drawProb = Math.min(0.3, 1 - Math.abs(homeProb - awayProb));

    // Normalize probabilities
    const total = homeProb + awayProb + drawProb;
    const normalizedHomeProb = (homeProb / total) * 0.5 + (1 - drawProb) * 0.5;
    const normalizedAwayProb = (awayProb / total) * 0.5 + (1 - drawProb) * 0.5;
    const normalizedDrawProb = 1 - normalizedHomeProb - normalizedAwayProb;

    // Key factors
    const keyFactors: string[] = [];
    if (homeStrength > awayStrength) {
      keyFactors.push('Home team superiority');
    } else if (awayStrength > homeStrength) {
      keyFactors.push('Away team strength');
    }

    if (matchState.ballPossession.home > 60) {
      keyFactors.push('Home dominance in possession');
    }

    if (matchState.momentum.home > 30) {
      keyFactors.push('Home team momentum');
    } else if (matchState.momentum.away > 30) {
      keyFactors.push('Away team momentum');
    }

    return {
      homeWinProbability: normalizedHomeProb,
      drawProbability: normalizedDrawProb,
      awayWinProbability: normalizedAwayProb,
      expectedGoals: {
        home: homeExpectedGoals,
        away: awayExpectedGoals,
      },
      keyFactors,
    };
  }

  /**
   * Calculate team strength based on player ratings
   */
  private calculateTeamStrength(team: TeamMatchState): number {
    let totalStrength = 0;
    let count = 0;

    team.players.forEach(player => {
      if (player.onPitch) {
        // Base rating influenced by form and other factors
        const adjustedRating = player.rating * (player.form / 100) * (1 - player.fatigue / 200);
        totalStrength += adjustedRating;
        count++;
      }
    });

    return count > 0 ? totalStrength / count : 50;
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Vector2D, pos2: Vector2D): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if two players are close
   */
  arePlayersClose(playerId1: string, playerId2: string, threshold: number = 10): boolean {
    const pos1 = this.playerPositions.get(playerId1);
    const pos2 = this.playerPositions.get(playerId2);

    if (!pos1 || !pos2) return false;

    return this.calculateDistance(pos1.position, pos2.position) < threshold;
  }

  /**
   * Get ball state
   */
  getBallState(): Ball {
    return { ...this.ball };
  }

  /**
   * Set ball state (useful for replays)
   */
  setBallState(ball: Ball): void {
    this.ball = { ...ball };
  }

  /**
   * Reset ball to center
   */
  resetBall(): void {
    this.ball = {
      position: { x: 50, y: 50 },
      velocity: { x: 0, y: 0 },
      possession: null,
      lastTouched: null,
      inPlay: true,
    };
  }
}

export default MatchSimulator;
