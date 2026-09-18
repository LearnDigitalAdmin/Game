// src/global/tactics/OpponentTacticsAI.ts
// AI system for opponent tactical decisions and adaptive strategies

import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { v4 as uuidv4 } from 'uuid';
import type { Tactics, OppositionAnalysis, PlayerRole } from './TacticalDatabaseSchema';
import { TacticalEngine } from './TacticalEngine';

export class OpponentTacticsAI {
  private db: SQLiteDBConnection | null = null;
  private tacticalEngine: TacticalEngine;

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
    this.tacticalEngine = new TacticalEngine(db);
  }

  /**
   * Auto-generate tactical setup for AI opponent
   * Considers player availability, team form, opposition analysis
   */
  async generateOpponentTactics(
    opponentClubId: string,
    userTeamFormation: string,
    userTeamMentality: string,
    availablePlayers: {
      id: string;
      shirtNumber: number;
      position: string;
      rating: number;
      form: number;
    }[]
  ): Promise<Tactics> {
    if (!this.db) throw new Error('Database not set');

    // Analyze opposition (user team)
    const opponentAnalysis = await this.analyzeOpposition(
      userTeamFormation,
      userTeamMentality
    );

    // Select best formation to counter user
    const counterFormation = this.selectCounterFormation(
      userTeamFormation,
      opponentAnalysis
    );

    // Select best mentality
    const bestMentality = this.selectMentality(
      opponentAnalysis,
      availablePlayers
    );

    // Filter available players (exclude injured, suspended)
    const eligiblePlayers = await this.filterEligiblePlayers(availablePlayers);

    // Assign players to formation
    const playerAssignments = await this.assignPlayersToFormation(
      counterFormation,
      eligiblePlayers,
      opponentClubId
    );

    // Create tactics record
    const tactics = await this.tacticalEngine.createTactics(
      opponentClubId,
      counterFormation,
      `Auto-generated vs ${userTeamFormation}`,
      playerAssignments.map((p) => ({
        id: p.id,
        shirtNumber: p.shirtNumber,
        role: p.role,
      })),
      bestMentality as any
    );

    console.log(`✅ Generated opponent tactics: ${counterFormation} - ${bestMentality}`);
    return tactics;
  }

  /**
   * Analyze opposition team characteristics
   */
  private async analyzeOpposition(
    formation: string,
    mentality: string
  ): Promise<{
    formationWeaknesses: string[];
    mentalityWeaknesses: string[];
    recommendedFormation: string;
    recommendedMentality: string;
  }> {
    // Formation weaknesses analysis
    const formationWeaknessesMap: Record<string, string[]> = {
      '433': ['Vulnerable on wings defensively', 'Midfield can be overrun', 'Full backs exposed'],
      '4231': ['Defensive midfielders can get bypassed', 'Less dynamic in attack'],
      '352': ['Exposed flanks', 'Requires wing-backs to track back'],
      '532': ['Vulnerable to quick counter-attacks', 'Lacks midfield dominance'],
      '442': ['Susceptible to modern passing', 'Central midfield under pressure'],
    };

    // Mentality weaknesses
    const mentalityWeaknessesMap: Record<string, string[]> = {
      ultra_defensive: ['Lacks attacking threat', 'Vulnerable to early goal', 'Low morale'],
      defensive: ['Limited attacking options', 'Susceptible to possession'],
      balanced: [],
      attacking: ['Vulnerable defensively', 'High fatigue risk'],
      ultra_attacking: ['Extremely exposed defensively', 'High fatigue', 'Morale swings'],
    };

    // Recommend counter formation
    const counterFormationMap: Record<string, string> = {
      '433': '4231', // Counter with stronger midfield
      '4231': '433', // Counter with width
      '352': '442', // Counter with defensive cover
      '532': '433', // Counter with direct attacking
      '442': '4231', // Counter with midfield control
    };

    // Recommend counter mentality
    const counterMentalityMap: Record<string, string> = {
      ultra_defensive: 'attacking', // Exploit defensive gaps
      defensive: 'balanced', // Control midfield
      balanced: 'attacking', // Press for advantage
      attacking: 'defensive', // Hit on counter
      ultra_attacking: 'balanced', // Control chaos
    };

    return {
      formationWeaknesses: formationWeaknessesMap[formation] || [],
      mentalityWeaknesses: mentalityWeaknessesMap[mentality] || [],
      recommendedFormation: counterFormationMap[formation] || formation,
      recommendedMentality: counterMentalityMap[mentality] || 'balanced',
    };
  }

  /**
   * Select best formation to counter opposition
   */
  private selectCounterFormation(
    _opponentFormation: string,
    analysis: any
  ): string {
    // Weighted selection based on analysis
    const options = [
      { formation: analysis.recommendedFormation, weight: 0.5 },
      { formation: '4231', weight: 0.2 },
      { formation: '433', weight: 0.2 },
      { formation: '352', weight: 0.1 },
    ];

    const selected = options.sort(() => Math.random() - 0.5)[0];
    return selected?.formation || '4231';
  }

  /**
   * Select best mentality based on analysis and player quality
   */
  private selectMentality(
    _analysis: any,
    players: any[]
  ): string {
    // Calculate average player rating
    const avgRating = players.reduce((sum, p) => sum + p.rating, 0) / players.length;

    // Calculate average form
    const avgForm = players.reduce((sum, p) => sum + p.form, 0) / players.length;

    // High rating + good form = more aggressive
    // Low rating + poor form = more defensive
    if (avgRating >= 78 && avgForm >= 70) return 'attacking';
    if (avgRating >= 75 && avgForm >= 60) return 'balanced';
    if (avgRating >= 72 && avgForm >= 55) return 'defensive';
    return 'ultra_defensive';
  }

  /**
   * Filter players: remove injured, suspended, unavailable
   */
  private async filterEligiblePlayers(
    players: any[]
  ): Promise<any[]> {
    if (!this.db) return players;

    const eligible: any[] = [];

    for (const player of players) {
      const result = await this.db.query(
        `SELECT status FROM players WHERE id = ? AND status NOT IN ('injured', 'suspended')`,
        [player.id]
      );

      if (result.values && result.values.length > 0) {
        eligible.push(player);
      }
    }

    return eligible.length > 0 ? eligible : players; // Fallback to all if too many out
  }

  /**
   * Assign players to formation positions
   */
  private async assignPlayersToFormation(
    formationCode: string,
    eligiblePlayers: any[],
    _clubId: string
  ): Promise<
    {
      id: string;
      shirtNumber: number;
      role: PlayerRole;
    }[]
  > {
    // Get formation
    const formation = await this.tacticalEngine.getFormationByCode(formationCode);
    if (!formation) throw new Error(`Formation ${formationCode} not found`);

    // Sort players by position compatibility
    const sortedPlayers = this.sortPlayersByPositionMatch(
      eligiblePlayers,
      formationCode
    );

    // Assign to positions
    const assignments: {
      id: string;
      shirtNumber: number;
      role: PlayerRole;
    }[] = [];

    for (let i = 0; i < Math.min(11, sortedPlayers.length); i++) {
      const player = sortedPlayers[i];
      const formationPos = formation.positions[i];

      if (formationPos) {
        assignments.push({
          id: player.id,
          shirtNumber: player.shirtNumber,
          role: formationPos.role as PlayerRole,
        });
      }
    }

    // Fill remaining slots if needed
    while (assignments.length < 11 && eligiblePlayers.length > assignments.length) {
      for (const player of eligiblePlayers) {
        if (!assignments.some((a) => a.id === player.id)) {
          const idx = assignments.length;
          if (idx < formation.positions.length) {
            assignments.push({
              id: player.id,
              shirtNumber: player.shirtNumber,
              role: formation.positions[idx].role as PlayerRole,
            });
            break;
          }
        }
      }
      if (assignments.length === 11) break;
    }

    return assignments.slice(0, 11);
  }

  /**
   * Sort players by how well they fit formation positions
   */
  private sortPlayersByPositionMatch(
    players: any[],
    formationCode: string
  ): any[] {
    const positionPreferences: Record<string, string[]> = {
      '433': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'RM', 'LW', 'ST', 'RW'],
      '4231': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'DM', 'LM', 'AM', 'RM', 'ST'],
      '352': ['GK', 'LCB', 'CB', 'RCB', 'LWB', 'LM', 'CM', 'RM', 'RWB', 'ST', 'ST'],
      '532': ['GK', 'LCB', 'CB', 'RCB', 'LWB', 'LM', 'CM', 'RM', 'RWB', 'ST', 'ST'],
      '442': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    };

    const preferences = positionPreferences[formationCode] || [];

    return players.sort((a, b) => {
      const aIdx = preferences.indexOf(a.position);
      const bIdx = preferences.indexOf(b.position);

      // Primary sort: position match (lower index = better match)
      if (aIdx !== bIdx) {
        return aIdx - bIdx;
      }

      // Secondary sort: rating (higher = better)
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }

      // Tertiary sort: form (higher = better)
      return b.form - a.form;
    });
  }

  /**
   * Adjust tactics during match based on game state
   */
  async adjustTacticsInMatch(
    _matchId: string,
    homeScore: number,
    awayScore: number,
    minute: number,
    isHomeTeam: boolean,
    currentTactics: Tactics
  ): Promise<{
    newMentality: string;
    shouldChangeTactics: boolean;
    reason: string;
  }> {
    const scoreDiff = isHomeTeam ? homeScore - awayScore : awayScore - homeScore;

    // Decision logic based on score and time
    if (minute < 20 && scoreDiff > 0) {
      // Early goal, stay with it
      return {
        newMentality: currentTactics.mentality,
        shouldChangeTactics: false,
        reason: 'Early lead secured',
      };
    }

    if (minute > 70 && scoreDiff > 0) {
      // Late game lead, defend
      return {
        newMentality: 'defensive',
        shouldChangeTactics: true,
        reason: 'Protecting late lead',
      };
    }

    if (minute > 70 && scoreDiff < 0) {
      // Late game behind, attack
      return {
        newMentality: 'ultra_attacking',
        shouldChangeTactics: true,
        reason: 'Chasing late deficit',
      };
    }

    if (minute > 80 && scoreDiff === 0) {
      // Draw late, attack for winner
      return {
        newMentality: 'attacking',
        shouldChangeTactics: true,
        reason: 'Seeking late winner',
      };
    }

    if (minute > 45 && scoreDiff < -1) {
      // Significantly behind, need to attack
      return {
        newMentality: 'attacking',
        shouldChangeTactics: true,
        reason: 'Trailing by multiple goals',
      };
    }

    // Default: continue with current tactics
    return {
      newMentality: currentTactics.mentality,
      shouldChangeTactics: false,
      reason: 'Tactics executing as planned',
    };
  }

  /**
   * Log opposition analysis in database
   */
  async saveOppositionAnalysis(
    analysis: OppositionAnalysis
  ): Promise<void> {
    if (!this.db) return;

    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO opposition_analysis
       (id, match_id, opponent_club_id, analyzed_for_club_id,
        avg_formation, typical_mentality, typical_pressing,
        defensive_weaknesses, attacking_weaknesses,
        set_piece_vulnerabilities, transition_weaknesses,
        recommended_opposition_tactic, recommended_formation,
        analysis_date, confidence_level, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        analysis.id || uuidv4(),
        analysis.match_id,
        analysis.opponent_club_id,
        analysis.analyzed_for_club_id,
        analysis.avg_formation,
        analysis.typical_mentality,
        analysis.typical_pressing,
        JSON.stringify(analysis.defensive_weaknesses),
        JSON.stringify(analysis.attacking_weaknesses),
        JSON.stringify(analysis.set_piece_vulnerabilities),
        JSON.stringify(analysis.transition_weaknesses),
        analysis.recommended_opposition_tactic,
        analysis.recommended_formation,
        analysis.analysis_date,
        analysis.confidence_level,
        now,
        now,
      ]
    );
  }

  /**
   * Set database connection
   */
  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
    this.tacticalEngine.setDatabase(db);
  }
}

export default OpponentTacticsAI;
