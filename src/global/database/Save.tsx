// src/global/database/Save.tsx - Football Manager Game Database Handler
import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { generateAllPlayers, type Player } from '../utils/PlayerGeneration';
import SQLiteConnectionManager from './Initializer';
import { FixtureGenerator } from '../fixtures/FixtureGenerator';

// ===== INTERFACES =====

export interface SaveFile {
  id: string;
  name: string;
  clubName: string;
  managerName: string;
  season: string;
  gameDate: string;
  lastPlayed: string;
  createdAt: string;
}

export interface ClubData {
  id: string;
  name: string;
  divisionId: string;
  countryId: string;
  rank: number;
  status: 'pro' | 'semi-pro';
  balance: 'rich' | 'average' | 'poor';
  reputation: string;
  boardConfidence: number;
  fanSupport: number;
  transferBudget: number;
  wageBudget: number;
  facilities: number;
  training: number;
  youth: number;
  formation: string;
}

export interface ManagerData {
  id: string;
  name: string;
  age: number;
  nationality: string;
  coachingStyle: string;
  countryId: string;
  countryFederation: string;
  countryRank: number;
  clubId: string;
  contractLength: number;
  salary: number;
  reputation: number;
  experience: number;
}

export interface Division {
  id: string;
  name: string;
  countryId: string;
  tier: number;
  clubs: number;
  season: string;
  matchday: number;
  status: 'active' | 'finished' | 'paused';
}

export interface LeagueTable {
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
  homeWon: number;
  homeDrawn: number;
  homeLost: number;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  awayWon: number;
  awayDrawn: number;
  awayLost: number;
  awayGoalsFor: number;
  awayGoalsAgainst: number;
}

export interface Fixture {
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

export interface Transfer {
  id: string;
  playerId: string;
  fromClubId: string | null;
  toClubId: string | null;
  fee: number;
  date: string;
  type: 'permanent' | 'loan' | 'free' | 'release';
  status: 'completed' | 'pending' | 'rejected';
  contractLength: number;
  wage: number;
}

export interface GameState {
  currentDate: string;
  currentSeason: string;
  currentMatchday: number;
  gameSpeed: "paused" | "slow" | "fast" | "faster" | "holiday" | "normal";//'paused' | 'slow' | 'normal' | 'fast';
  autoSave: boolean;
  notifications: any[];
}

export interface SaveFile {
  id: string;
  name: string;
  mode: 'player' | 'manager' | 'owner';
  clubName: string;
  managerName: string;
  season: string;
  gameDate: string;
  lastPlayed: string;
  createdAt: string;
  currentPage?: string; // For remembering the last active page
  gameTime: string; // Calendar time for display
  matchday: number;
  achievements: string[]; // Save milestones/achievements
  playtime: number; // Total playtime in minutes
  difficulty: string; // Game difficulty setting
  reputation: number; // Manager/club reputation
}



// ===== DATABASE MANAGER CLASS =====

export class FootballManagerDB {
  private connectionManager: SQLiteConnectionManager;
  private db: SQLiteDBConnection | null = null;
  private isReady: boolean = false;

  constructor() {
    this.connectionManager = SQLiteConnectionManager.getInstance();
  }

    async initialize(): Promise<void> {
    try {
      console.log('Initializing Football Manager Database...');
      
      this.db = await this.connectionManager.getConnection("footballmanager");
      await this.createTables();
      await this.migratePlayerAvailabilityColumns();
      this.isReady = true;
      
      console.log('Football Manager Database initialized successfully');
    } catch (error) {
      console.error('Error initializing Football Manager database:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.connectionManager.closeConnection("footballmanager");
      this.db = null;
      this.isReady = false;
      console.log('Football Manager Database connection closed');
    }
  }

  /**
   * Expose the raw SQLite connection so other self-contained subsystems
   * (global/tactics, global/financial) that own their own tables can share
   * this save's database instead of opening a second connection.
   */
  getConnection(): SQLiteDBConnection | null {
    return this.db;
  }

  /**
   * Additive schema migration: the tactics module's LineupConstraints reads
   * availability directly off `players` (status / injury / suspension
   * columns) that predate it, and the financial module's loan system needs
   * a way to track a loaned player's real owner. Add the columns both need
   * if missing, so injuries/suspensions/loans actually gate and move
   * players instead of the queries silently failing against columns that
   * don't exist.
   */
  private async migratePlayerAvailabilityColumns(): Promise<void> {
    if (!this.db) return;

    const existing = await this.db.query(`PRAGMA table_info(players)`);
    const columnNames = new Set(
      (existing.values || []).map((row: any) => row.name as string)
    );

    const requiredColumns: { name: string; ddl: string }[] = [
      { name: 'status', ddl: `status TEXT NOT NULL DEFAULT 'active'` },
      { name: 'injury_type', ddl: `injury_type TEXT` },
      { name: 'injury_duration_weeks', ddl: `injury_duration_weeks INTEGER NOT NULL DEFAULT 0` },
      { name: 'yellow_cards', ddl: `yellow_cards INTEGER NOT NULL DEFAULT 0` },
      { name: 'last_match_date', ddl: `last_match_date TEXT` },
      { name: 'suspension_end_date', ddl: `suspension_end_date TEXT` },
      // Loans: the player's row still lives at the borrowing club (club_id),
      // this remembers who actually owns them so the loan can be reversed
      // when it ends or gets recalled.
      { name: 'on_loan_from_club_id', ddl: `on_loan_from_club_id TEXT` },
      { name: 'loan_return_date', ddl: `loan_return_date TEXT` },
    ];

    for (const column of requiredColumns) {
      if (columnNames.has(column.name)) continue;
      try {
        await this.db.execute(`ALTER TABLE players ADD COLUMN ${column.ddl}`);
        console.log(`🛠️ Added players.${column.name} column`);
      } catch (error) {
        // Guard against a race with another migration path adding the same
        // column between the PRAGMA check and this ALTER.
        console.warn(`Could not add players.${column.name} (may already exist):`, error);
      }
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // Save files metadata
      `CREATE TABLE IF NOT EXISTS save_files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'manager',
      club_name TEXT NOT NULL,
      manager_name TEXT NOT NULL,
      season TEXT NOT NULL,
      game_date TEXT NOT NULL,
      last_played TEXT NOT NULL,
      created_at TEXT NOT NULL,
      current_page TEXT DEFAULT 'home',
      game_time TEXT NOT NULL,
      matchday INTEGER NOT NULL DEFAULT 1,
      achievements TEXT DEFAULT '[]',
      playtime INTEGER NOT NULL DEFAULT 0,
      difficulty TEXT DEFAULT 'Normal',
      reputation INTEGER NOT NULL DEFAULT 50
    )`,

    // Enhanced game_state table
    `CREATE TABLE IF NOT EXISTS game_state (
      id TEXT PRIMARY KEY DEFAULT 'main',
      current_date TEXT NOT NULL,
      current_season TEXT NOT NULL,
      current_matchday INTEGER NOT NULL DEFAULT 1,
      game_speed TEXT NOT NULL DEFAULT 'paused',
      auto_save BOOLEAN NOT NULL DEFAULT 1,
      notifications TEXT DEFAULT '[]',
      save_id TEXT,
      mode TEXT DEFAULT 'manager'
    )`,

    // Enhanced managers table
    `CREATE TABLE IF NOT EXISTS managers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      nationality TEXT NOT NULL,
      coaching_style TEXT NOT NULL,
      country_id TEXT NOT NULL,
      country_federation TEXT NOT NULL,
      country_rank INTEGER NOT NULL,
      club_id TEXT NOT NULL,
      contract_length INTEGER NOT NULL DEFAULT 2,
      salary INTEGER NOT NULL DEFAULT 50000,
      reputation INTEGER NOT NULL DEFAULT 50,
      experience INTEGER NOT NULL DEFAULT 0,
      save_id TEXT
    )`,

      // Clubs data
      `CREATE TABLE IF NOT EXISTS clubs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        division_id TEXT NOT NULL,
        country_id TEXT NOT NULL,
        rank INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pro', 'semi-pro')),
        balance TEXT NOT NULL CHECK (balance IN ('rich', 'average', 'poor')),
        reputation TEXT NOT NULL DEFAULT 'Local',
        board_confidence INTEGER NOT NULL DEFAULT 75,
        fan_support INTEGER NOT NULL DEFAULT 75,
        transfer_budget INTEGER NOT NULL DEFAULT 1000000,
        wage_budget INTEGER NOT NULL DEFAULT 500000,
        facilities INTEGER NOT NULL DEFAULT 50,
        training INTEGER NOT NULL DEFAULT 50,
        youth INTEGER NOT NULL DEFAULT 50
      )`,

      // Divisions data
      `CREATE TABLE IF NOT EXISTS divisions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        country_id TEXT NOT NULL,
        tier INTEGER NOT NULL,
        clubs INTEGER NOT NULL,
        season TEXT NOT NULL,
        matchday INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'paused'))
      )`,

      // League tables
      `CREATE TABLE IF NOT EXISTS league_tables (
        id TEXT PRIMARY KEY,
        division_id TEXT NOT NULL,
        team_id TEXT NOT NULL,
        team_name TEXT NOT NULL,
        played INTEGER NOT NULL DEFAULT 0,
        won INTEGER NOT NULL DEFAULT 0,
        drawn INTEGER NOT NULL DEFAULT 0,
        lost INTEGER NOT NULL DEFAULT 0,
        goals_for INTEGER NOT NULL DEFAULT 0,
        goals_against INTEGER NOT NULL DEFAULT 0,
        goal_difference INTEGER NOT NULL DEFAULT 0,
        points INTEGER NOT NULL DEFAULT 0,
        form TEXT NOT NULL DEFAULT '_____',
        position INTEGER NOT NULL,
        home_won INTEGER NOT NULL DEFAULT 0,
        home_drawn INTEGER NOT NULL DEFAULT 0,
        home_lost INTEGER NOT NULL DEFAULT 0,
        home_goals_for INTEGER NOT NULL DEFAULT 0,
        home_goals_against INTEGER NOT NULL DEFAULT 0,
        away_won INTEGER NOT NULL DEFAULT 0,
        away_drawn INTEGER NOT NULL DEFAULT 0,
        away_lost INTEGER NOT NULL DEFAULT 0,
        away_goals_for INTEGER NOT NULL DEFAULT 0,
        away_goals_against INTEGER NOT NULL DEFAULT 0,
        UNIQUE(division_id, team_id)
      )`,

      // Players
      `CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        age INTEGER NOT NULL,
        country_id TEXT NOT NULL,
        club_id TEXT,
        position TEXT NOT NULL,
        secondary_position TEXT,
        rating INTEGER NOT NULL,
        potential INTEGER NOT NULL,
        value INTEGER NOT NULL,
        wage INTEGER NOT NULL,
        height INTEGER NOT NULL,
        weight INTEGER NOT NULL,
        foot TEXT NOT NULL CHECK (foot IN ('Left', 'Right', 'Both')),
        personality TEXT NOT NULL,
        form INTEGER NOT NULL DEFAULT 70,
        contract_end TEXT,
        contract_type TEXT DEFAULT 'permanent',
        morale INTEGER NOT NULL DEFAULT 75,
        fitness INTEGER NOT NULL DEFAULT 100,
        match_sharpness INTEGER NOT NULL DEFAULT 70
      )`,

      // Player injuries
      `CREATE TABLE IF NOT EXISTS player_injuries (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        type TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('Minor', 'Moderate', 'Major')),
        duration INTEGER NOT NULL,
        recurring BOOLEAN NOT NULL DEFAULT 0,
        date_occurred TEXT NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
      )`,

      // Player history/stats
      `CREATE TABLE IF NOT EXISTS player_history (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        season TEXT NOT NULL,
        club_id TEXT NOT NULL,
        appearances INTEGER NOT NULL DEFAULT 0,
        goals INTEGER NOT NULL DEFAULT 0,
        assists INTEGER NOT NULL DEFAULT 0,
        yellow_cards INTEGER NOT NULL DEFAULT 0,
        red_cards INTEGER NOT NULL DEFAULT 0,
        minutes_played INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
        UNIQUE(player_id, season)
      )`,

      // Fixtures
      `CREATE TABLE IF NOT EXISTS fixtures (
        id TEXT PRIMARY KEY,
        division_id TEXT NOT NULL,
        home_team_id TEXT NOT NULL,
        away_team_id TEXT NOT NULL,
        home_team_name TEXT NOT NULL,
        away_team_name TEXT NOT NULL,
        matchday INTEGER NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'postponed')),
        home_score INTEGER,
        away_score INTEGER,
        attendance INTEGER,
        venue TEXT NOT NULL,
        competition TEXT NOT NULL DEFAULT 'league'
      )`,

      // Transfers
      `CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        from_club_id TEXT,
        to_club_id TEXT,
        fee INTEGER NOT NULL DEFAULT 0,
        date TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('permanent', 'loan', 'free', 'release')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('completed', 'pending', 'rejected')),
        contract_length INTEGER NOT NULL DEFAULT 2,
        wage INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
      )`,

      // Staff
      `CREATE TABLE IF NOT EXISTS staff (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        age INTEGER NOT NULL,
        nationality TEXT NOT NULL,
        rating INTEGER NOT NULL,
        wage INTEGER NOT NULL,
        contract_end TEXT NOT NULL
      )`
    ];

    for (const table of tables) {
      await this.db.execute(table);
    }

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_players_club ON players(club_id)',
      'CREATE INDEX IF NOT EXISTS idx_players_position ON players(position)',
      'CREATE INDEX IF NOT EXISTS idx_players_rating ON players(rating)',
      'CREATE INDEX IF NOT EXISTS idx_league_tables_division ON league_tables(division_id)',
      'CREATE INDEX IF NOT EXISTS idx_league_tables_points ON league_tables(division_id, points DESC)',
      'CREATE INDEX IF NOT EXISTS idx_fixtures_division ON fixtures(division_id)',
      'CREATE INDEX IF NOT EXISTS idx_fixtures_date ON fixtures(date)',
      'CREATE INDEX IF NOT EXISTS idx_transfers_player ON transfers(player_id)',
      'CREATE INDEX IF NOT EXISTS idx_transfers_date ON transfers(date)'
    ];

    for (const index of indexes) {
      await this.db.execute(index);
    }
  }
  
  // Add to FootballManagerDB class:

async createSave(saveData: {
  name: string;
  mode: 'player' | 'manager' | 'owner';
  managerData: any;
  clubData: any;
  selectedCountries: string[];
  currentPage?: string;
}): Promise<string> {
  if (!this.db) throw new Error('Database not initialized');

  const saveId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const currentDate = new Date().toISOString();
  const gameStartDate = '2024-08-01';

  try {
    console.log('Creating enhanced save file record...');
    
    // Create comprehensive save file record
    await this.db.run(
      `INSERT INTO save_files (id, name, mode, club_name, manager_name, season, game_date, 
                              last_played, created_at, current_page, game_time, matchday, 
                              achievements, playtime, difficulty, reputation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        saveId, 
        saveData.name, 
        saveData.mode,
        saveData.clubData.name, 
        saveData.managerData.name, 
        '2024-25', 
        gameStartDate,
        currentDate, 
        currentDate, 
        saveData.currentPage || 'home',
        gameStartDate, // Initial game time
        1, // Initial matchday
        JSON.stringify([]), // Empty achievements initially
        0, // Initial playtime
        'Normal', // Default difficulty
        saveData.managerData.reputation || 50
      ]
    );

    // Initialize comprehensive game state
    await this.db.run(
      `INSERT OR REPLACE INTO game_state (id, current_date, current_season, current_matchday, 
                                         game_speed, auto_save, notifications, save_id, mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['main', gameStartDate, '2024-25', 1, 'paused', 1, '[]', saveId, saveData.mode]
    );

    // Create manager record with full data
    await this.db.run(
      `INSERT OR REPLACE INTO managers (id, name, age, nationality, coaching_style, country_id, 
                                       country_federation, country_rank, club_id, save_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'manager_1', saveData.managerData.name, saveData.managerData.age, 
        saveData.managerData.nationality, saveData.managerData.coachingStyle, 
        saveData.managerData.countryId, saveData.managerData.countryFederation, 
        saveData.managerData.countryRank, saveData.clubData.id, saveId
      ]
    );

    console.log('Loading game data for save...');
    await this.loadGameDataFast(saveData.selectedCountries, saveData.clubData);
    
    console.log(`Enhanced save file created successfully: ${saveId}`);
    return saveId;
    
  } catch (error) {
    console.error('Error creating enhanced save:', error);
    
    // Cleanup on failure
    try {
      await this.db.run('DELETE FROM save_files WHERE id = ?', [saveId]);
      await this.db.run('DELETE FROM game_state WHERE save_id = ?', [saveId]);
      await this.db.run('DELETE FROM managers WHERE save_id = ?', [saveId]);
      console.log('Cleaned up failed save file');
    } catch (cleanupError) {
      console.error('Failed to cleanup failed save:', cleanupError);
    }
    throw error;
  }
}

async updateSaveProgress(saveId: string, updates: {
  gameDate?: string;
  gameTime?: string;
  season?: string;
  matchday?: number;
  currentPage?: string;
  playtime?: number;
  achievements?: string[];
  reputation?: number;
}): Promise<void> {
  if (!this.db) throw new Error('Database not initialized');

  const setParts: string[] = [];
  const values: any[] = [];

  // Always update last_played
  setParts.push('last_played = ?');
  values.push(new Date().toISOString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      setParts.push(`${dbKey} = ?`);
      values.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }
  });

  if (setParts.length === 0) return;

  values.push(saveId);
  
  await this.db.run(
    `UPDATE save_files SET ${setParts.join(', ')} WHERE id = ?`,
    values
  );
}

async getSaveFiles(): Promise<SaveFile[]> {
  if (!this.db) throw new Error('Database not initialized');

  const result = await this.db.query(`
    SELECT sf.*, 
           COALESCE(sf.game_time, sf.game_date) as display_date,
           COALESCE(sf.playtime, 0) as total_playtime,
           COALESCE(sf.achievements, '[]') as save_achievements
    FROM save_files sf 
    ORDER BY sf.last_played DESC
  `);
  
  return (result.values || []).map(row => ({
    ...this.convertDbRowToCamelCase(row),
    achievements: typeof row.achievements === 'string' 
      ? JSON.parse(row.achievements || '[]') 
      : (row.achievements || [])
  }));
}

async loadSaveData(saveId: string): Promise<{
  saveFile: SaveFile;
  managerData: any;
  gameState: any;
}> {
  if (!this.db) throw new Error('Database not initialized');

  // Get save file info
  const saveResult = await this.db.query('SELECT * FROM save_files WHERE id = ?', [saveId]);
  if (!saveResult.values || saveResult.values.length === 0) {
    throw new Error('Save file not found');
  }

  const saveFile = this.convertDbRowToCamelCase(saveResult.values[0]);

  // Get manager data
  const managerResult = await this.db.query('SELECT * FROM managers WHERE save_id = ?', [saveId]);
  const managerData = managerResult.values && managerResult.values.length > 0 
    ? this.convertDbRowToCamelCase(managerResult.values[0]) 
    : null;

  // Get game state
  const stateResult = await this.db.query('SELECT * FROM game_state WHERE save_id = ?', [saveId]);
  const gameState = stateResult.values && stateResult.values.length > 0 
    ? this.convertDbRowToCamelCase(stateResult.values[0]) 
    : null;

  // Get selected club data
  if (managerData?.clubId) {
    const clubData = await this.getClub(managerData.clubId);
    managerData.selectedClub = clubData;
  }

  return {
    saveFile,
    managerData,
    gameState
  };
}

async deleteSave(saveId: string): Promise<void> {
  if (!this.db) throw new Error('Database not initialized');

  try {
    // Delete all related data
    const deleteQueries = [
      'DELETE FROM save_files WHERE id = ?',
      'DELETE FROM game_state WHERE save_id = ?',
      'DELETE FROM managers WHERE save_id = ?',
      'DELETE FROM players WHERE save_id = ?',
      'DELETE FROM clubs WHERE save_id = ?',
      'DELETE FROM league_tables WHERE save_id = ?',
      // Add other related tables as needed
    ];

    for (const query of deleteQueries) {
      try {
        await this.db.run(query, [saveId]);
      } catch (err) {
        // Some tables might not have save_id column, continue
        console.warn(`Failed to delete from table: ${err}`);
      }
    }

    console.log(`Save deleted successfully: ${saveId}`);
  } catch (error) {
    console.error('Error deleting save:', error);
    throw error;
  }
}

// ===== HIGH-SPEED LOAD GAME DATA METHOD =====

// Fix for the loadGameDataFast method in Save.tsx

private async loadGameDataFast(selectedCountries: string[], _userClub: any): Promise<void> {
  if (!this.db) throw new Error('Database not initialized');

  try {
    console.log('Loading static data files...');
    
    // Load all static data in parallel
    const [countriesData, divisionsData, clubsData, tablesData, playersData] = await Promise.all([
      import('../../assets/countries.json'),
      import('../../assets/divisions.json'),
      import('../../assets/clubs.json'),
      import('../../assets/tables.json'),
      import('../../assets/players.json')  // This contains the name data
    ]);

    // Extract the actual data (handle .default if needed)
    const playerNamesData = playersData.default || playersData;
    console.log('Loaded player names for countries:', Object.keys(playerNamesData));

    const countries = countriesData.default.filter((c: any) => selectedCountries.includes(c.id));
    const divisions = divisionsData.default.filter((d: any) => selectedCountries.includes(d.countryId));
    const clubs = clubsData.default.filter((c: any) => selectedCountries.includes(c.countryId));

    console.log(`Processing ${divisions.length} divisions, ${clubs.length} clubs...`);

    // === BULK INSERT DIVISIONS ===
    console.log('Bulk inserting divisions...');
    const divisionStatements = divisions.map(division => ({
      statement: `INSERT OR REPLACE INTO divisions (id, name, country_id, tier, clubs, season, matchday, status)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      values: [division.id, division.name, division.countryId, division.tier, division.clubs, '2024-25', 1, 'active']
    }));

    if (divisionStatements.length > 0) {
      await this.db.executeSet(divisionStatements);
    }

    // === BULK INSERT CLUBS ===
    console.log('Bulk inserting clubs...');
    const clubStatements = clubs.map(club => {
      const transferBudget = club.balance === 'rich' ? 5000000 : club.balance === 'average' ? 2000000 : 500000;
      const wageBudget = Math.round(transferBudget * 0.6);

      return {
        statement: `INSERT OR REPLACE INTO clubs (id, name, division_id, country_id, rank, status, balance, 
                    reputation, board_confidence, fan_support, transfer_budget, wage_budget, facilities, training, youth, formation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [club.id, club.name, club.divisionId, club.countryId, club.rank, club.status, club.balance,
                'Local', 75, 75, transferBudget, wageBudget, 50, 50, 50, '4-4-2']
      };
    });

    if (clubStatements.length > 0) {
      await this.db.executeSet(clubStatements);
    }

    // === BULK INSERT LEAGUE TABLES ===
    console.log('Bulk inserting league tables...');
    const tableStatements: any[] = [];
    
    for (const [divisionId, tableData] of Object.entries(tablesData.default)) {
      if (divisions.find(d => d.id === divisionId)) {
        const table = (tableData as any).table;
        for (let index = 0; index < table.length; index++) {
          const team = table[index];
          
          // The team name is already in the JSON - use it directly!
          const teamName = team.name || `Team ${team.teamId}`;
          
          tableStatements.push({
            statement: `INSERT OR REPLACE INTO league_tables (id, division_id, team_id, team_name, played, won, drawn, lost, 
                        goals_for, goals_against, goal_difference, points, form, position)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            values: [`${divisionId}_${team.teamId}`, divisionId, team.teamId, teamName, team.played, team.won, team.drawn, 
                    team.lost, team.gf, team.ga, team.gd, team.points, team.form, index + 1]
          });
        }
      }
    }

    if (tableStatements.length > 0) {
      await this.db.executeSet(tableStatements);
    }

    // === GENERATE AND BULK INSERT FIXTURES ===
    console.log('Generating season fixtures...');
    await this.generateSeasonFixtures(divisions, clubs, '2024-25', '2024-08-01');

    // === GENERATE AND BULK INSERT PLAYERS ===
    console.log('Generating players with proper name data...');
    
    // THIS IS THE KEY FIX: Pass the loaded player names data
    const players = generateAllPlayers(clubs, countries, playerNamesData, {
      playersPerClub: 25,
      freeAgentCount: 100,
      currentSeason: '2024-25',
      injuryProbability: 0.15
    });

    console.log(`Generated ${players.length} players. Bulk inserting...`);

    // Insert players in optimized batches
    await this.bulkInsertPlayers(players);

    console.log('All game data loaded at high speed!');
    
    // Debug: Check what got inserted
    try {
      const samplePlayers = await this.db.query('SELECT first_name, last_name, country_id, position FROM players LIMIT 5');
      console.log('Sample inserted players:', samplePlayers.values);
      
      const sampleTeams = await this.db.query('SELECT team_name, division_id FROM league_tables LIMIT 5');
      console.log('Sample inserted teams:', sampleTeams.values);
    } catch (debugError) {
      console.error('Debug query error:', debugError);
    }
    
  } catch (error) {
    console.error('Error loading game data:', error);
    throw error;
  }
}

/**
 * Build a full double round-robin for every division and persist it, so the
 * season has a complete schedule from the moment the save is created.
 */
private async generateSeasonFixtures(
  divisions: any[],
  clubs: any[],
  season: string,
  startDate: string
): Promise<void> {
  if (!this.db) throw new Error('Database not initialized');

  const statements: any[] = [];

  for (const division of divisions) {
    const divisionClubs = clubs
      .filter((club: any) => club.divisionId === division.id)
      .map((club: any) => ({ id: club.id, name: club.name }));

    if (divisionClubs.length < 2) {
      console.warn(`Skipping fixtures for ${division.id}: needs at least two clubs`);
      continue;
    }

    const { fixtures } = FixtureGenerator.generateLeagueFixtures({
      season,
      divisionId: division.id,
      clubs: divisionClubs,
      startDate,
      scheduleType: 'round_robin',
    });

    for (const fixture of fixtures) {
      statements.push({
        statement: `INSERT OR REPLACE INTO fixtures (id, division_id, home_team_id, away_team_id,
                    home_team_name, away_team_name, matchday, date, time, status,
                    home_score, away_score, attendance, venue, competition)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [
          fixture.id,
          fixture.divisionId,
          fixture.homeTeamId,
          fixture.awayTeamId,
          fixture.homeTeamName,
          fixture.awayTeamName,
          fixture.matchday ?? 1,
          fixture.scheduledDate,
          fixture.scheduledTime,
          'scheduled',
          null,
          null,
          null,
          fixture.venue,
          'league',
        ],
      });
    }
  }

  // Batched so a large multi-division save does not exhaust the driver.
  const batchSize = 200;
  for (let i = 0; i < statements.length; i += batchSize) {
    await this.db.executeSet(statements.slice(i, i + batchSize));
  }

  console.log(`Inserted ${statements.length} fixtures`);
}

// ===== OPTIMIZED BULK PLAYER INSERTION =====

private async bulkInsertPlayers(players: Player[]): Promise<void> {
  if (!this.db) throw new Error('Database not initialized');

  const batchSize = 200; // Larger batches for speed
  const totalBatches = Math.ceil(players.length / batchSize);

  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    
    console.log(`Bulk inserting player batch ${batchNumber}/${totalBatches} (${batch.length} players)...`);

    try {
      // Prepare all player statements for this batch
      const playerStatements = batch.map(player => ({
        statement: `INSERT INTO players (id, first_name, last_name, age, country_id, club_id, position, secondary_position,
                   rating, potential, value, wage, height, weight, foot, personality, form, contract_end, morale, fitness, match_sharpness)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [player.id, player.firstName, player.lastName, player.age, player.countryId, player.clubId, 
                player.position, player.secondaryPosition, player.rating, player.potential, player.value, 
                player.wage, player.height, player.weight, player.foot, player.personality, player.form, 
                '2026-06-30', 75, 100, 70]
      }));

      // Bulk insert all players in this batch
      await this.db.executeSet(playerStatements);

      // Prepare all injury statements for this batch
      const injuryStatements: any[] = [];
      for (const player of batch) {
        for (const injury of player.injuries) {
          const injuryId = `inj_${player.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          injuryStatements.push({
            statement: `INSERT INTO player_injuries (id, player_id, type, severity, duration, recurring, date_occurred)
                       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            values: [injuryId, player.id, injury.type, injury.severity, injury.duration, injury.recurring ? 1 : 0, '2024-08-01']
          });
        }
      }

      // Bulk insert all injuries for this batch
      if (injuryStatements.length > 0) {
        await this.db.executeSet(injuryStatements);
      }

    } catch (error) {
      console.error(`Error in bulk insert batch ${batchNumber}:`, error);
      
      // Fallback to individual inserts for this batch only
      console.log(`Falling back to individual inserts for batch ${batchNumber}...`);
      await this.insertPlayersIndividually(batch);
    }
  }
}

// ===== FALLBACK INDIVIDUAL INSERTION =====

private async insertPlayersIndividually(players: Player[]): Promise<void> {
  if (!this.db) throw new Error('Database not initialized');

  for (const player of players) {
    try {
      await this.db.run(
        `INSERT INTO players (id, first_name, last_name, age, country_id, club_id, position, secondary_position,
         rating, potential, value, wage, height, weight, foot, personality, form, contract_end, morale, fitness, match_sharpness)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [player.id, player.firstName, player.lastName, player.age, player.countryId, player.clubId, 
         player.position, player.secondaryPosition, player.rating, player.potential, player.value, 
         player.wage, player.height, player.weight, player.foot, player.personality, player.form, 
         '2026-06-30', 75, 100, 70]
      );

      // Insert injuries individually
      for (const injury of player.injuries) {
        const injuryId = `inj_${player.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        await this.db.run(
          `INSERT INTO player_injuries (id, player_id, type, severity, duration, recurring, date_occurred)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [injuryId, player.id, injury.type, injury.severity, injury.duration, injury.recurring ? 1 : 0, '2024-08-01']
        );
      }
    } catch (playerError) {
      console.error(`Failed to insert player ${player.firstName} ${player.lastName}:`, playerError);
      // Continue with next player
    }
  }
}




// Method for ultra-fast save creation (if you want to skip some data initially)
async createSaveFast(saveData: {
  name: string;
  managerData: any;
  clubData: any;
  selectedCountries: string[];
}): Promise<string> {
  if (!this.db) throw new Error('Database not initialized');

  const saveId = `save_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const currentDate = new Date().toISOString();

  try {
    console.log('Creating save with essential data only (fast mode)...');
    
    // Essential data only
    await this.db.executeSet([
      {
        statement: `INSERT INTO save_files (id, name, club_name, manager_name, season, game_date, last_played, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        values: [saveId, saveData.name, saveData.clubData.name, saveData.managerData.name, '2024-25', '2024-08-01', currentDate, currentDate]
      },
      {
        statement: `INSERT OR REPLACE INTO game_state (current_date, current_season, current_matchday, game_speed, auto_save, notifications)
                   VALUES (?, ?, ?, ?, ?, ?)`,
        values: ['2024-08-01', '2024-25', 1, 'paused', 1, '[]']
      },
      {
        statement: `INSERT OR REPLACE INTO managers (id, name, age, nationality, coaching_style, country_id, country_federation, country_rank, club_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        values: ['manager_1', saveData.managerData.name, saveData.managerData.age, saveData.managerData.nationality, 
               saveData.managerData.coachingStyle, saveData.managerData.countryId, saveData.managerData.countryFederation, 
               saveData.managerData.countryRank, saveData.clubData.id]
      }
    ]);

    // Load game data in background (you could make this optional)
    setTimeout(() => this.loadGameDataFast(saveData.selectedCountries, saveData.clubData), 100);
    
    console.log(`Fast save created: ${saveId}`);
    return saveId;
    
  } catch (error) {
    console.error('Error creating fast save:', error);
    throw error;
  }
}


  async loadSave(saveId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Update last played timestamp
    await this.db.run(
      'UPDATE save_files SET last_played = ? WHERE id = ?',
      [new Date().toISOString(), saveId]
    );

    console.log(`Save loaded: ${saveId}`);
  }

  // ===== LEAGUE TABLE OPERATIONS =====

  // Add this helper function to Save.tsx - converts snake_case to camelCase

private convertDbRowToCamelCase(row: any): any {
  if (!row) return row;
  
  const converted: any = {};
  
  for (const [key, value] of Object.entries(row)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
    converted[camelKey] = value;
  }
  
  return converted;
}

private convertDbResultsToCamelCase(results: any[]): any[] {
  if (!Array.isArray(results)) return results;
  return results.map(row => this.convertDbRowToCamelCase(row));
}

// Update all your database query methods to use the converter:

// === UPDATED LEAGUE TABLE METHOD ===
async getLeagueTable(divisionId: string): Promise<LeagueTable[]> {
  if (!this.db) throw new Error('Database not initialized');

  console.log(`🎯 Getting league table for division: ${divisionId}`);
  
  const result = await this.db.query(
    'SELECT * FROM league_tables WHERE division_id = ? ORDER BY points DESC, goal_difference DESC, goals_for DESC',
    [divisionId]
  );
  
  console.log(`🎯 Raw league table data:`, result.values?.slice(0, 2)); // Log first 2 rows
  
  const convertedResults = this.convertDbResultsToCamelCase(result.values || []);
  
  console.log(`🎯 Converted league table data:`, convertedResults.slice(0, 2)); // Log converted data
  
  return convertedResults;
}

// === UPDATED CLUB PLAYERS METHOD ===
async getClubPlayers(clubId: string): Promise<Player[]> {
  if (!this.db) throw new Error('Database not initialized');

  console.log(`🎯 Getting players for club: ${clubId}`);
  
  const result = await this.db.query(
    'SELECT * FROM players WHERE club_id = ? ORDER BY rating DESC, position ASC',
    [clubId]
  );
  
  console.log(`🎯 Raw player data sample:`, result.values?.slice(0, 2)); // Log first 2 players
  
  const convertedResults = this.convertDbResultsToCamelCase(result.values || []);
  
  console.log(`🎯 Converted player data sample:`, convertedResults.slice(0, 2)); // Log converted data
  
  return convertedResults;
}

// === UPDATED GET FREE AGENTS METHOD ===
async getFreeAgents(): Promise<Player[]> {
  if (!this.db) throw new Error('Database not initialized');

  const result = await this.db.query(
    "SELECT * FROM players WHERE club_id IS NULL AND status != 'retired' ORDER BY rating DESC",
    []
  );
  
  console.log(`🎯 Raw free agent data sample:`, result.values?.slice(0, 2));
  
  const convertedResults = this.convertDbResultsToCamelCase(result.values || []);
  
  console.log(`🎯 Converted free agent data sample:`, convertedResults.slice(0, 2));
  
  return convertedResults;
}

// === UPDATED GET CLUB METHOD ===
async getClub(clubId: string): Promise<ClubData | null> {
  if (!this.db) throw new Error('Database not initialized');

  const result = await this.db.query(
    'SELECT * FROM clubs WHERE id = ?',
    [clubId]
  );
  
  const rawData = result.values?.[0];
  console.log(`🎯 Raw club data:`, rawData);
  
  const convertedData = rawData ? this.convertDbRowToCamelCase(rawData) : null;
  console.log(`🎯 Converted club data:`, convertedData);
  
  return convertedData;
}

// === UPDATED GET PLAYER METHOD ===
async getPlayer(playerId: string): Promise<Player | null> {
  if (!this.db) throw new Error('Database not initialized');

  const result = await this.db.query(
    'SELECT * FROM players WHERE id = ?',
    [playerId]
  );
  
  const rawData = result.values?.[0];
  const convertedData = rawData ? this.convertDbRowToCamelCase(rawData) : null;
  
  return convertedData;
}

// === UPDATED SEARCH PLAYERS METHOD ===
async searchPlayers(query: string, clubId?: string, position?: string, minRating?: number, maxValue?: number): Promise<Player[]> {
  if (!this.db) throw new Error('Database not initialized');

  let sql = `SELECT * FROM players WHERE (first_name LIKE ? OR last_name LIKE ?) AND status != 'retired'`;
  let params: any[] = [`%${query}%`, `%${query}%`];

  if (clubId) {
    sql += ` AND club_id = ?`;
    params.push(clubId);
  }

  if (position) {
    sql += ` AND (position = ? OR secondary_position = ?)`;
    params.push(position, position);
  }

  if (minRating) {
    sql += ` AND rating >= ?`;
    params.push(minRating);
  }

  if (maxValue) {
    sql += ` AND value <= ?`;
    params.push(maxValue);
  }

  sql += ` ORDER BY rating DESC LIMIT 50`;

  const result = await this.db.query(sql, params);
  return this.convertDbResultsToCamelCase(result.values || []);
}

// === UPDATED GET DIVISIONS METHOD ===
async getDivisions(countryId?: string): Promise<Division[]> {
  if (!this.db) throw new Error('Database not initialized');

  let query = 'SELECT * FROM divisions';
  let params: any[] = [];

  if (countryId) {
    query += ' WHERE country_id = ?';
    params.push(countryId);
  }

  query += ' ORDER BY tier ASC';

  const result = await this.db.query(query, params);
  return this.convertDbResultsToCamelCase(result.values || []);
}

// === UPDATED GET CLUB STAFF METHOD ===
async getClubStaff(clubId: string): Promise<any[]> {
  if (!this.db) throw new Error('Database not initialized');

  const result = await this.db.query(
    'SELECT * FROM staff WHERE club_id = ? ORDER BY role ASC',
    [clubId]
  );
  return this.convertDbResultsToCamelCase(result.values || []);
}

// === UPDATED GET TRANSFERS METHOD ===
async getTransfers(clubId?: string, status?: string): Promise<Transfer[]> {
  if (!this.db) throw new Error('Database not initialized');

  let query = 'SELECT * FROM transfers';
  let params: any[] = [];
  const conditions: string[] = [];

  if (clubId) {
    conditions.push('(from_club_id = ? OR to_club_id = ?)');
    params.push(clubId, clubId);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY date DESC';

  const result = await this.db.query(query, params);
  return this.convertDbResultsToCamelCase(result.values || []);
}

// === UPDATED GET MANAGER METHOD ===
async getManager(): Promise<ManagerData | null> {
  if (!this.db) throw new Error('Database not initialized');

  const result = await this.db.query(
    'SELECT * FROM managers LIMIT 1',
    []
  );
  
  const rawData = result.values?.[0];
  return rawData ? this.convertDbRowToCamelCase(rawData) : null;
}

// === UPDATED GET GAME STATE METHOD ===
async getGameState(): Promise<GameState | null> {
  if (!this.db) throw new Error('Database not initialized');

  const result = await this.db.query(
    'SELECT * FROM game_state WHERE id = "main"',
    []
  );
  
  const rawData = result.values?.[0];
  const convertedData = rawData ? this.convertDbRowToCamelCase(rawData) : null;
  
  // Handle JSON parsing for notifications
  if (convertedData && convertedData.notifications && typeof convertedData.notifications === 'string') {
    try {
      convertedData.notifications = JSON.parse(convertedData.notifications);
    } catch (e) {
      convertedData.notifications = [];
    }
  }
  
  return convertedData;
}










  

  async updateLeagueTable(divisionId: string, teamId: string, updates: Partial<LeagueTable>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setParts: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setParts.push(`${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`);
        values.push(value);
      }
    });

    if (setParts.length === 0) return;

    values.push(divisionId, teamId);
    
    await this.db.run(
      `UPDATE league_tables SET ${setParts.join(', ')} WHERE division_id = ? AND team_id = ?`,
      values
    );

    // Recalculate positions after update
    await this.recalculateTablePositions(divisionId);
  }

  async addMatchResult(divisionId: string, homeTeamId: string, awayTeamId: string, homeScore: number, awayScore: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.execute('BEGIN TRANSACTION');

      // Update home team stats
      const homePoints = homeScore > awayScore ? 3 : homeScore === awayScore ? 1 : 0;
      const homeResult = homeScore > awayScore ? 'W' : homeScore === awayScore ? 'D' : 'L';

      await this.db.run(
        `UPDATE league_tables SET 
         played = played + 1,
         won = won + ?,
         drawn = drawn + ?,
         lost = lost + ?,
         goals_for = goals_for + ?,
         goals_against = goals_against + ?,
         goal_difference = goals_for - goals_against,
         points = points + ?,
         home_won = home_won + ?,
         home_drawn = home_drawn + ?,
         home_lost = home_lost + ?,
         home_goals_for = home_goals_for + ?,
         home_goals_against = home_goals_against + ?,
         form = SUBSTR(form || ?, -5)
         WHERE division_id = ? AND team_id = ?`,
        [
          homeScore > awayScore ? 1 : 0, // won
          homeScore === awayScore ? 1 : 0, // drawn  
          homeScore < awayScore ? 1 : 0, // lost
          homeScore, awayScore, homePoints,
          homeScore > awayScore ? 1 : 0, // home_won
          homeScore === awayScore ? 1 : 0, // home_drawn
          homeScore < awayScore ? 1 : 0, // home_lost
          homeScore, awayScore, homeResult,
          divisionId, homeTeamId
        ]
      );

      // Update away team stats
      const awayPoints = awayScore > homeScore ? 3 : awayScore === homeScore ? 1 : 0;
      const awayResult = awayScore > homeScore ? 'W' : awayScore === homeScore ? 'D' : 'L';

      await this.db.run(
        `UPDATE league_tables SET 
         played = played + 1,
         won = won + ?,
         drawn = drawn + ?,
         lost = lost + ?,
         goals_for = goals_for + ?,
         goals_against = goals_against + ?,
         goal_difference = goals_for - goals_against,
         points = points + ?,
         away_won = away_won + ?,
         away_drawn = away_drawn + ?,
         away_lost = away_lost + ?,
         away_goals_for = away_goals_for + ?,
         away_goals_against = away_goals_against + ?,
         form = SUBSTR(form || ?, -5)
         WHERE division_id = ? AND team_id = ?`,
        [
          awayScore > homeScore ? 1 : 0, // won
          awayScore === homeScore ? 1 : 0, // drawn
          awayScore < homeScore ? 1 : 0, // lost
          awayScore, homeScore, awayPoints,
          awayScore > homeScore ? 1 : 0, // away_won
          awayScore === homeScore ? 1 : 0, // away_drawn
          awayScore < homeScore ? 1 : 0, // away_lost
          awayScore, homeScore, awayResult,
          divisionId, awayTeamId
        ]
      );

      await this.recalculateTablePositions(divisionId);
      await this.db.execute('COMMIT');
    } catch (error) {
      await this.db.execute('ROLLBACK');
      throw error;
    }
  }

  private async recalculateTablePositions(divisionId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const teams = await this.db.query(
      'SELECT team_id FROM league_tables WHERE division_id = ? ORDER BY points DESC, goal_difference DESC, goals_for DESC',
      [divisionId]
    );

    if (teams.values) {
      for (let i = 0; i < teams.values.length; i++) {
        await this.db.run(
          'UPDATE league_tables SET position = ? WHERE division_id = ? AND team_id = ?',
          [i + 1, divisionId, teams.values[i].team_id]
        );
      }
    }
  }

  // ===== PLAYER OPERATIONS =====

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setParts: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setParts.push(`${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`);
        values.push(value);
      }
    });

    if (setParts.length === 0) return;

    values.push(playerId);
    
    await this.db.run(
      `UPDATE players SET ${setParts.join(', ')} WHERE id = ?`,
      values
    );
  }

  async transferPlayer(playerId: string, fromClubId: string | null, toClubId: string | null, fee: number, wage: number, contractLength: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.execute('BEGIN TRANSACTION');

      // Update player's club
      await this.db.run(
        'UPDATE players SET club_id = ?, wage = ?, contract_end = ? WHERE id = ?',
        [toClubId, wage, this.calculateContractEnd(contractLength), playerId]
      );

      // Create transfer record
      const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.db.run(
        `INSERT INTO transfers (id, player_id, from_club_id, to_club_id, fee, date, type, status, contract_length, wage)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [transferId, playerId, fromClubId, toClubId, fee, new Date().toISOString().split('T')[0], 'permanent', 'completed', contractLength, wage]
      );

      // Update club budgets if applicable
      if (toClubId) {
        await this.db.run(
          'UPDATE clubs SET transfer_budget = transfer_budget - ?, wage_budget = wage_budget - ? WHERE id = ?',
          [fee, wage * 52, toClubId]
        );
      }

      if (fromClubId) {
        await this.db.run(
          'UPDATE clubs SET transfer_budget = transfer_budget + ?, wage_budget = wage_budget + ? WHERE id = ?',
          [fee, wage * 52, fromClubId]
        );
      }

      await this.db.execute('COMMIT');
    } catch (error) {
      await this.db.execute('ROLLBACK');
      throw error;
    }
  }

  private calculateContractEnd(years: number): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + years);
    date.setMonth(5); // June (0-indexed)
    date.setDate(30);
    return date.toISOString().split('T')[0];
  }

  // ===== FIXTURE OPERATIONS =====

  async getFixtures(divisionId?: string, limit?: number): Promise<Fixture[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM fixtures';
    let params: any[] = [];

    if (divisionId) {
      query += ' WHERE division_id = ?';
      params.push(divisionId);
    }

    query += ' ORDER BY date ASC, time ASC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const result = await this.db.query(query, params);
    return result.values || [];
  }

  async getUpcomingFixtures(clubId: string, limit: number = 5): Promise<Fixture[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query(
      `SELECT * FROM fixtures 
       WHERE (home_team_id = ? OR away_team_id = ?) AND status = 'scheduled'
       ORDER BY date ASC, time ASC LIMIT ?`,
      [clubId, clubId, limit]
    );
    return result.values || [];
  }

  async updateFixture(fixtureId: string, updates: Partial<Fixture>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setParts: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setParts.push(`${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`);
        values.push(value);
      }
    });

    if (setParts.length === 0) return;

    values.push(fixtureId);
    
    await this.db.run(
      `UPDATE fixtures SET ${setParts.join(', ')} WHERE id = ?`,
      values
    );
  }

  // ===== CLUB OPERATIONS =====

  async updateClub(clubId: string, updates: Partial<ClubData>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setParts: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setParts.push(`${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`);
        values.push(value);
      }
    });

    if (setParts.length === 0) return;

    values.push(clubId);
    
    await this.db.run(
      `UPDATE clubs SET ${setParts.join(', ')} WHERE id = ?`,
      values
    );
  }

  async getClubsByDivision(divisionId: string): Promise<ClubData[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query(
      'SELECT * FROM clubs WHERE division_id = ? ORDER BY rank ASC',
      [divisionId]
    );
    return this.convertDbResultsToCamelCase(result.values || []);
  }

  // ===== MANAGER OPERATIONS =====

  async updateManager(updates: Partial<ManagerData>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setParts: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setParts.push(`${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`);
        values.push(value);
      }
    });

    if (setParts.length === 0) return;

    await this.db.run(
      `UPDATE managers SET ${setParts.join(', ')} WHERE id = 'manager_1'`,
      values
    );
  }

  // ===== GAME STATE OPERATIONS =====

  async updateGameState(updates: Partial<GameState>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setParts: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        setParts.push(`${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)} = ?`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });

    if (setParts.length === 0) return;

    await this.db.run(
      `UPDATE game_state SET ${setParts.join(', ')} WHERE id = 'main'`,
      values
    );
  }

  // ===== SEARCH OPERATIONS =====

  /**
   * Top scorers for a division in a season, joining season totals back to
   * the players and clubs they belong to.
   */
  async getTopScorers(
    divisionId: string,
    season: string,
    limit: number = 5
  ): Promise<Array<{ playerId: string; firstName: string; lastName: string; clubName: string; goals: number; assists: number }>> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query(
      `SELECT p.id as player_id, p.first_name, p.last_name, c.name as club_name, ph.goals, ph.assists
       FROM player_history ph
       JOIN players p ON p.id = ph.player_id
       JOIN clubs c ON c.id = ph.club_id
       WHERE c.division_id = ? AND ph.season = ? AND ph.goals > 0
       ORDER BY ph.goals DESC, ph.assists DESC
       LIMIT ?`,
      [divisionId, season, limit]
    );

    return (result.values || []).map((row: any) => ({
      playerId: row.player_id,
      firstName: row.first_name,
      lastName: row.last_name,
      clubName: row.club_name,
      goals: row.goals,
      assists: row.assists,
    }));
  }

  async getPlayerStats(playerId: string, season?: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM player_history WHERE player_id = ?';
    let params: any[] = [playerId];

    if (season) {
      query += ' AND season = ?';
      params.push(season);
    }

    query += ' ORDER BY season DESC';

    const result = await this.db.query(query, params);
    return result.values || [];
  }

  // ===== DIVISION OPERATIONS =====

  async addStaff(clubId: string, staffData: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const staffId = `staff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db.run(
      `INSERT INTO staff (id, club_id, name, role, age, nationality, rating, wage, contract_end)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [staffId, clubId, staffData.name, staffData.role, staffData.age, staffData.nationality, 
       staffData.rating, staffData.wage, staffData.contractEnd]
    );
  }

  // ===== UTILITY OPERATIONS =====

  async executeCustomQuery(query: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      if (query.trim().toLowerCase().startsWith('select')) {
        const result = await this.db.query(query, params);
        return result.values || [];
      } else {
        await this.db.run(query, params);
        return true;
      }
    } catch (error) {
      console.error('Custom query error:', error);
      throw error;
    }
  }

  async getDatabaseStats(): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = {
      totalPlayers: 0,
      totalClubs: 0,
      totalDivisions: 0,
      totalTransfers: 0,
      totalFixtures: 0
    };

    try {
      const playerCount = await this.db.query('SELECT COUNT(*) as count FROM players');
      stats.totalPlayers = playerCount.values?.[0]?.count || 0;

      const clubCount = await this.db.query('SELECT COUNT(*) as count FROM clubs');
      stats.totalClubs = clubCount.values?.[0]?.count || 0;

      const divisionCount = await this.db.query('SELECT COUNT(*) as count FROM divisions');
      stats.totalDivisions = divisionCount.values?.[0]?.count || 0;

      const transferCount = await this.db.query('SELECT COUNT(*) as count FROM transfers');
      stats.totalTransfers = transferCount.values?.[0]?.count || 0;

      const fixtureCount = await this.db.query('SELECT COUNT(*) as count FROM fixtures');
      stats.totalFixtures = fixtureCount.values?.[0]?.count || 0;
    } catch (error) {
      console.error('Error getting database stats:', error);
    }

    return stats;
  }

  // ===== CLEANUP =====

  // async close(): Promise<void> {
  //   if (this.db) {
  //     await this.db.close();
  //     this.db = null;
  //     this.isReady = false;
  //     console.log('Database connection closed');
  //   }
  // }

  get ready(): boolean {
    return this.isReady;
  }
}

// ===== SINGLETON INSTANCE =====

export const gameDB = new FootballManagerDB();