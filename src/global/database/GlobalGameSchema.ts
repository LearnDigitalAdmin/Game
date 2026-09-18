// src/global/database/GlobalGameSchema.ts
// Complete global game database schema
// Combines all systems: players, managers, contracts, transfers, messages, game state, history

import { SQLiteDBConnection } from '@capacitor-community/sqlite';

/**
 * Initialize complete global game database schema
 */
export async function initializeGlobalGameSchema(db: SQLiteDBConnection): Promise<void> {
  console.log('🔧 Initializing global game schema...');

  try {
    // ===== GAME STATE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS game_state (
        id TEXT PRIMARY KEY,
        season INTEGER NOT NULL,
        current_date TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        week INTEGER NOT NULL,
        is_transfer_window INTEGER NOT NULL DEFAULT 0,
        transfer_window_end TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(season)
      );
      CREATE INDEX IF NOT EXISTS idx_game_state_season ON game_state(season);
      CREATE INDEX IF NOT EXISTS idx_game_state_date ON game_state(current_date);
    `);

    // ===== PLAYER LIFECYCLE =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_lifecycle_events (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        date TEXT NOT NULL,
        details TEXT NOT NULL,
        processed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
      CREATE INDEX IF NOT EXISTS idx_lifecycle_player ON player_lifecycle_events(player_id);
      CREATE INDEX IF NOT EXISTS idx_lifecycle_type ON player_lifecycle_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_lifecycle_date ON player_lifecycle_events(date);
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_retirements (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        club_id TEXT NOT NULL,
        retired_at TEXT NOT NULL,
        final_rating REAL NOT NULL,
        total_appearances INTEGER DEFAULT 0,
        total_goals INTEGER DEFAULT 0,
        total_assists INTEGER DEFAULT 0,
        international_caps INTEGER DEFAULT 0,
        international_goals INTEGER DEFAULT 0,
        scheduled_deletion_date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_retirements_player ON player_retirements(player_id);
      CREATE INDEX IF NOT EXISTS idx_retirements_date ON player_retirements(retired_at);
      CREATE INDEX IF NOT EXISTS idx_retirements_deletion ON player_retirements(scheduled_deletion_date);
    `);

    // ===== CONTRACT MANAGEMENT =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS contract_renewals (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        club_id TEXT NOT NULL,
        previous_end_date TEXT NOT NULL,
        new_end_date TEXT NOT NULL,
        previous_weekly_wage REAL NOT NULL,
        new_weekly_wage REAL NOT NULL,
        wage_increase REAL NOT NULL,
        renewed_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_renewals_player ON contract_renewals(player_id);
      CREATE INDEX IF NOT EXISTS idx_renewals_club ON contract_renewals(club_id);
      CREATE INDEX IF NOT EXISTS idx_renewals_date ON contract_renewals(renewed_at);
    `);

    // ===== MANAGERS =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS managers (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        age INTEGER NOT NULL,
        nationality TEXT NOT NULL,
        manager_status TEXT NOT NULL DEFAULT 'unemployed',
        tactical_acumen REAL NOT NULL,
        motivation_skill REAL NOT NULL,
        youth_development REAL NOT NULL,
        market_knowledge REAL NOT NULL,
        leadership_quality REAL NOT NULL,
        experience INTEGER NOT NULL,
        trophies_won INTEGER NOT NULL DEFAULT 0,
        league_titles INTEGER NOT NULL DEFAULT 0,
        cup_titles INTEGER NOT NULL DEFAULT 0,
        personality TEXT NOT NULL,
        philosophy TEXT NOT NULL,
        preferred_formation TEXT NOT NULL,
        notoriety REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        retired_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_managers_status ON managers(manager_status);
      CREATE INDEX IF NOT EXISTS idx_managers_age ON managers(age);
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS manager_contracts (
        id TEXT PRIMARY KEY,
        manager_id TEXT NOT NULL,
        club_id TEXT NOT NULL,
        appointed_at TEXT NOT NULL,
        contract_end_date TEXT NOT NULL,
        base_salary REAL NOT NULL,
        performance_bonus REAL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(manager_id) REFERENCES managers(id),
        FOREIGN KEY(club_id) REFERENCES clubs(id),
        UNIQUE(manager_id, club_id, status)
      );
      CREATE INDEX IF NOT EXISTS idx_manager_contracts_club ON manager_contracts(club_id);
      CREATE INDEX IF NOT EXISTS idx_manager_contracts_end ON manager_contracts(contract_end_date);
      CREATE INDEX IF NOT EXISTS idx_manager_contracts_status ON manager_contracts(status);
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS job_offers (
        id TEXT PRIMARY KEY,
        manager_id TEXT NOT NULL,
        club_id TEXT NOT NULL,
        base_salary REAL NOT NULL,
        contract_years INTEGER NOT NULL,
        deadline TEXT NOT NULL,
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY(manager_id) REFERENCES managers(id),
        FOREIGN KEY(club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_job_offers_manager ON job_offers(manager_id);
      CREATE INDEX IF NOT EXISTS idx_job_offers_status ON job_offers(status);
      CREATE INDEX IF NOT EXISTS idx_job_offers_deadline ON job_offers(deadline);
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS manager_sackings (
        id TEXT PRIMARY KEY,
        manager_id TEXT NOT NULL,
        club_id TEXT NOT NULL,
        sack_reason TEXT NOT NULL,
        sack_date TEXT NOT NULL,
        final_league_position INTEGER,
        win_percentage REAL,
        severance_payment REAL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(manager_id) REFERENCES managers(id),
        FOREIGN KEY(club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_sackings_manager ON manager_sackings(manager_id);
      CREATE INDEX IF NOT EXISTS idx_sackings_date ON manager_sackings(sack_date);
    `);

    // ===== MESSAGING =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS inbox_messages (
        id TEXT PRIMARY KEY,
        recipient_id TEXT NOT NULL,
        recipient_type TEXT NOT NULL,
        message_type TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_type TEXT NOT NULL,
        related_entity_id TEXT,
        related_entity_type TEXT,
        read INTEGER NOT NULL DEFAULT 0,
        action_required INTEGER NOT NULL DEFAULT 0,
        action_deadline TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        FOREIGN KEY(recipient_id) REFERENCES players(id) OR REFERENCES managers(id) OR REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_messages_recipient ON inbox_messages(recipient_id, recipient_type);
      CREATE INDEX IF NOT EXISTS idx_messages_read ON inbox_messages(read);
      CREATE INDEX IF NOT EXISTS idx_messages_type ON inbox_messages(message_type);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON inbox_messages(created_at);
      CREATE INDEX IF NOT EXISTS idx_messages_action ON inbox_messages(action_required, action_deadline);
    `);

    // ===== GAME SAVES =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS game_saves (
        id TEXT PRIMARY KEY,
        save_name TEXT NOT NULL,
        description TEXT,
        season INTEGER NOT NULL,
        game_week INTEGER NOT NULL,
        current_date TEXT NOT NULL,
        manager_club_id TEXT,
        manager_name TEXT,
        total_players INTEGER,
        total_clubs INTEGER,
        total_transfers INTEGER,
        total_matches INTEGER,
        playtime_hours REAL,
        version TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_modified TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_saves_date ON game_saves(last_modified);
      CREATE INDEX IF NOT EXISTS idx_saves_season ON game_saves(season);
    `);

    // ===== PLAYER & CLUB HISTORY =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS player_history (
        id TEXT PRIMARY KEY,
        player_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        club_id TEXT,
        details TEXT,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_player_history_player ON player_history(player_id);
      CREATE INDEX IF NOT EXISTS idx_player_history_type ON player_history(event_type);
      CREATE INDEX IF NOT EXISTS idx_player_history_date ON player_history(occurred_at);
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS club_history (
        id TEXT PRIMARY KEY,
        club_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        season INTEGER,
        details TEXT,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_club_history_club ON club_history(club_id);
      CREATE INDEX IF NOT EXISTS idx_club_history_season ON club_history(season);
      CREATE INDEX IF NOT EXISTS idx_club_history_type ON club_history(event_type);
      CREATE INDEX IF NOT EXISTS idx_club_history_date ON club_history(occurred_at);
    `);

    // ===== PLAYER DIALOGUE & TRANSFER TRACKING =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS transfer_dialogues (
        id TEXT PRIMARY KEY,
        transfer_offer_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        from_club_id TEXT NOT NULL,
        to_club_id TEXT NOT NULL,
        dialogue_type TEXT NOT NULL,
        message_from TEXT NOT NULL,
        message_content TEXT NOT NULL,
        player_response TEXT,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(from_club_id) REFERENCES clubs(id),
        FOREIGN KEY(to_club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_transfer_dialogues_player ON transfer_dialogues(player_id);
      CREATE INDEX IF NOT EXISTS idx_transfer_dialogues_offer ON transfer_dialogues(transfer_offer_id);
    `);

    // ===== STATISTICS TABLES =====
    await db.execute(`
      CREATE TABLE IF NOT EXISTS game_statistics (
        id TEXT PRIMARY KEY,
        season INTEGER NOT NULL,
        stat_type TEXT NOT NULL,
        player_id TEXT,
        manager_id TEXT,
        club_id TEXT,
        value REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(manager_id) REFERENCES managers(id),
        FOREIGN KEY(club_id) REFERENCES clubs(id)
      );
      CREATE INDEX IF NOT EXISTS idx_stats_season ON game_statistics(season);
      CREATE INDEX IF NOT EXISTS idx_stats_type ON game_statistics(stat_type);
      CREATE INDEX IF NOT EXISTS idx_stats_player ON game_statistics(player_id);
    `);

    console.log('✅ Global game schema initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing global game schema:', error);
    throw error;
  }
}

export default { initializeGlobalGameSchema };
