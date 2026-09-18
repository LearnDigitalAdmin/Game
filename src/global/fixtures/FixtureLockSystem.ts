// src/global/fixtures/FixtureLockSystem.ts
// Lock system to prevent fixture changes while user is playing

import type { FixtureLock } from './FixtureDatabaseSchema';
import { v4 as uuidv4 } from 'uuid';
import { SQLiteDBConnection } from '@capacitor-community/sqlite';

export class FixtureLockSystem {
  private db: SQLiteDBConnection | null = null;
  private activeLocks: Map<string, FixtureLock> = new Map();

  constructor(db?: SQLiteDBConnection) {
    this.db = db || null;
  }

  /**
   * Lock a fixture (when user starts playing)
   */
  async lockFixture(
    fixtureId: string,
    reason: 'user_playing' | 'simulation_in_progress' | 'critical_match',
    userId?: string
  ): Promise<FixtureLock> {
    const lock: FixtureLock = {
      id: `lock_${uuidv4()}`,
      fixtureId,
      lockReason: reason,
      lockedAt: new Date().toISOString(),
      lockedByUserId: userId,
      canPause: reason === 'user_playing',
      canQuit: reason === 'user_playing',
      autoUnlock: reason === 'user_playing',
    };

    // Save to database
    if (this.db) {
      await this.db.run(
        `INSERT INTO fixture_locks (id, fixture_id, lock_reason, locked_at, locked_by_user_id, can_pause, can_quit, auto_unlock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lock.id,
          lock.fixtureId,
          lock.lockReason,
          lock.lockedAt,
          lock.lockedByUserId || null,
          lock.canPause ? 1 : 0,
          lock.canQuit ? 1 : 0,
          lock.autoUnlock ? 1 : 0,
        ]
      );

      // Update fixture to mark as locked
      await this.db.run(
        'UPDATE fixtures SET is_locked = 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), fixtureId]
      );
    }

    this.activeLocks.set(fixtureId, lock);
    console.log(`🔒 Fixture ${fixtureId} locked (${reason})`);

    return lock;
  }

  /**
   * Unlock a fixture (when user finishes playing)
   */
  async unlockFixture(
    fixtureId: string,
    reason: string = 'match_completed'
  ): Promise<boolean> {
    const lock = this.activeLocks.get(fixtureId);

    if (!lock) {
      console.warn(`Lock not found for fixture ${fixtureId}`);
      return false;
    }

    // Save unlock time
    if (this.db) {
      await this.db.run(
        'UPDATE fixture_locks SET unlock_at = ?, updated_at = ? WHERE fixture_id = ?',
        [new Date().toISOString(), new Date().toISOString(), fixtureId]
      );

      await this.db.run(
        'UPDATE fixtures SET is_locked = 0, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), fixtureId]
      );
    }

    this.activeLocks.delete(fixtureId);
    console.log(`🔓 Fixture ${fixtureId} unlocked (${reason})`);

    return true;
  }

  /**
   * Check if fixture is locked
   */
  isFixtureLocked(fixtureId: string): boolean {
    return this.activeLocks.has(fixtureId);
  }

  /**
   * Get lock details
   */
  getLockDetails(fixtureId: string): FixtureLock | null {
    return this.activeLocks.get(fixtureId) || null;
  }

  /**
   * Check if fixture can be paused
   */
  canPauseFixture(fixtureId: string): boolean {
    const lock = this.getLockDetails(fixtureId);
    return lock ? lock.canPause : false;
  }

  /**
   * Check if fixture can be quit
   */
  canQuitFixture(fixtureId: string): boolean {
    const lock = this.getLockDetails(fixtureId);
    return lock ? lock.canQuit : false;
  }

  /**
   * Prevent other fixtures from being played
   */
  async enforceFixtureLock(_fixtureId: string, _teamId?: string): Promise<{
    canPlay: boolean;
    reason?: string;
    lockedFixture?: string;
  }> {
    // Check if any fixture is locked
    for (const [lockedFixtureId, lock] of this.activeLocks.entries()) {
      if (lock.lockReason === 'user_playing') {
        return {
          canPlay: false,
          reason: `Cannot play while another fixture is in progress`,
          lockedFixture: lockedFixtureId,
        };
      }
    }

    return { canPlay: true };
  }

  /**
   * Get all active locks
   */
  getActiveLocks(): FixtureLock[] {
    return Array.from(this.activeLocks.values());
  }

  /**
   * Auto-unlock fixtures after time expires
   */
  async autoUnlockExpiredLocks(maxLockDurationMinutes: number = 300): Promise<string[]> {
    const unlockedFixtures: string[] = [];
    const now = new Date();

    for (const [fixtureId, lock] of this.activeLocks.entries()) {
      if (!lock.autoUnlock) continue;

      const lockedTime = new Date(lock.lockedAt);
      const minutesLocked = (now.getTime() - lockedTime.getTime()) / (1000 * 60);

      if (minutesLocked > maxLockDurationMinutes) {
        console.warn(`🔓 Auto-unlocking fixture ${fixtureId} after ${minutesLocked} minutes`);
        await this.unlockFixture(fixtureId, 'auto_unlock_timeout');
        unlockedFixtures.push(fixtureId);
      }
    }

    return unlockedFixtures;
  }

  /**
   * Clear all locks (use with caution)
   */
  async clearAllLocks(): Promise<void> {
    const fixtureIds = Array.from(this.activeLocks.keys());

    for (const fixtureId of fixtureIds) {
      await this.unlockFixture(fixtureId, 'manual_clear');
    }

    console.log(`⚠️ Cleared ${fixtureIds.length} fixture locks`);
  }

  /**
   * Set database connection
   */
  setDatabase(db: SQLiteDBConnection): void {
    this.db = db;
  }

  /**
   * Restore locks from database
   */
  async restoreLocks(): Promise<void> {
    if (!this.db) return;

    const result = await this.db.query(
      `SELECT * FROM fixture_locks
       WHERE unlock_at IS NULL
       ORDER BY locked_at DESC`
    );

    if (result.values) {
      for (const row of result.values) {
        const lock: FixtureLock = {
          id: row.id as string,
          fixtureId: row.fixture_id as string,
          lockReason: row.lock_reason as any,
          lockedAt: row.locked_at as string,
          unlockAt: row.unlock_at as string,
          lockedByUserId: row.locked_by_user_id as string,
          canPause: Boolean(row.can_pause),
          canQuit: Boolean(row.can_quit),
          autoUnlock: Boolean(row.auto_unlock),
        };

        this.activeLocks.set(lock.fixtureId, lock);
      }

      console.log(`📂 Restored ${this.activeLocks.size} fixture locks from database`);
    }
  }

  /**
   * Get lock status report
   */
  getLockStatusReport(): {
    totalActiveLocks: number;
    userPlayingLocks: number;
    simulationLocks: number;
    oldestLock: FixtureLock | null;
    newestLock: FixtureLock | null;
  } {
    const locks = Array.from(this.activeLocks.values());
    const sorted = locks.sort((a, b) => new Date(a.lockedAt).getTime() - new Date(b.lockedAt).getTime());

    return {
      totalActiveLocks: locks.length,
      userPlayingLocks: locks.filter(l => l.lockReason === 'user_playing').length,
      simulationLocks: locks.filter(l => l.lockReason === 'simulation_in_progress').length,
      oldestLock: sorted.length > 0 ? sorted[0] : null,
      newestLock: sorted.length > 0 ? sorted[sorted.length - 1] : null,
    };
  }
}

export default FixtureLockSystem;
