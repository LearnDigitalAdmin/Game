# Football Legacy: Complete System Integration Guide

## Overview

This guide demonstrates how all systems in Football Legacy work together seamlessly:

- **Fixture Management** (Scheduling, locks, validation)
- **Match Engine** (Simulation, speed control, live updates)
- **Calendar System** (Event orchestration, timing)
- **Database** (Persistent state)
- **UI Components** (React integration)

---

## 1. System Architecture Flow

```
User Interface
    ↓
Calendar Event Handler (MATCH event)
    ↓
FixtureLockSystem.lockFixture()
    ↓
MatchEngine.initializeMatch() → MatchEngine.startMatch()
    ↓
Match Simulation (Speed: fast/default/hyper-realistic)
    ↓
CalendarFixtureIntegration.handleMatchResult()
    ↓
FixtureLockSystem.unlockFixture()
    ↓
Database Update (Fixtures, Tables, Rest Days)
```

---

## 2. Match Speed Configuration

### Overview

Match speeds determine how fast 90 minutes of game time pass:

```typescript
import { MATCH_SPEEDS, validateMatchSpeed } from '@/global/engine';

// Fast: 45 seconds real-time for 90 minutes game time
// Default: 90 seconds real-time for 90 minutes game time
// Hyper-Realistic: 180 seconds (3 minutes) real-time for 90 minutes
```

### Configuration Details

| Speed | Real Time | Game Minutes | Update Frequency | Event Density | Use Case |
|-------|-----------|--------------|------------------|---------------|----------|
| `fast` | 45 sec | 90 min | 2 Hz | 0.8x | Quick play, testing |
| `default` | 90 sec | 90 min | 1 Hz | 1.0x | Standard gameplay |
| `hyper-realistic` | 180 sec | 90 min | 30 Hz | 1.2x | Detailed viewing |

### Implementation in MatchEngine

```typescript
// Initialize match with specific speed
const engine = new MatchEngine(defaultConfig, 'default');

// Change speed before starting (if not running)
engine.setMatchSpeed('fast');

// Get speed info
const speedConfig = engine.getMatchSpeedInfo();
console.log(`Match will take ${speedConfig.realTimeMs}ms`);
```

---

## 3. Fixture Lifecycle

### A. Season Setup

```typescript
import { FixtureManager } from '@/global/fixtures';

const fixtureManager = new FixtureManager(db);

// Initialize database
await fixtureManager.initializeDatabases();

// Generate season fixtures
const fixtures = await fixtureManager.generateSeasonFixtures(
  'div_premier',
  '2024-25',
  [
    { id: 'club_arsenal', name: 'Arsenal' },
    { id: 'club_chelsea', name: 'Chelsea' },
    // ... 18 more clubs
  ],
  '2024-08-17' // Season start date
);
```

### B. Fixture Scheduling

Fixtures are automatically scheduled with realistic patterns:

**League Matches:**
- Primarily Saturday 3:00 PM (15:00)
- Occasional Wednesday 7:45 PM (19:45)
- Respects 2+ day minimum rest between matches

**Cup Matches:**
- Midweek slots (Tuesday-Thursday)
- Flexible timing around league schedule

**International Matches:**
- Scheduled during international breaks
- Auto-dynamic generation (created as needed)

### C. Match Day Processing

```typescript
// 1. Get next fixture
const nextFixture = await fixtureManager.getNextFixture(userTeamId);

// 2. Validate it can be played
const validation = await fixtureManager.validateFixturePlayable(nextFixture.id);
if (!validation.canPlay) {
  console.log('Cannot play:', validation.reasons);
  return;
}

// 3. Lock the fixture (prevent other matches)
const lockSystem = fixtureManager.getLockSystem();
await lockSystem.lockFixture(nextFixture.id, 'user_playing', userId);

// 4. Initialize and run match
const engine = new MatchEngine(config, 'default');
await engine.initializeMatch({
  fixture: nextFixture,
  homeLineup: homeTeamPlayers,
  awayLineup: awayTeamPlayers,
  homeFormation: '4-3-3',
  awayFormation: '4-2-3-1',
  userTeamId: userTeamId,
});

engine.startMatch();
```

### D. Match Completion

```typescript
// When match finishes:
engine.on('match-finished', async (data) => {
  const { matchState, finalScore } = data;

  // Update everything in one transaction
  await CalendarFixtureIntegration.handleMatchResult(
    nextFixture.id,
    finalScore.home,
    finalScore.away,
    fixtureManager,
    leagueTableManager
  );

  // This automatically:
  // 1. Updates fixture result and status
  // 2. Updates league table for both teams
  // 3. Updates team rest days
  // 4. Recalculates positions
  // 5. Unlocks the fixture

  // Optionally: Move to next day in calendar
  await calendar.nextDay();
});
```

---

## 4. Rest Day Enforcement

The RestDayCalculator ensures teams have 2+ days between matches:

```typescript
import { RestDayCalculator } from '@/global/fixtures';

const restCalc = new RestDayCalculator();

// Check if fixture is valid for a team
const validation = restCalc.validateRestDays(
  currentFixture,
  previousFixture,
  nextFixture,
  2 // minimum days
);

if (!validation.isValid) {
  console.log('Invalid rest:', validation.issues);
  // Reschedule or suggest new date
  const optimalDate = restCalc.suggestOptimalDate(
    team.id,
    currentFixture,
    recentFixtures
  );
}

// Check team fatigue
const fatigue = restCalc.calculateTeamFatigue(recentMatches);
// 0-33: Low, 34-66: Moderate, 67-100: High

// Check for fixture congestion
const congestion = restCalc.checkFixtureCongestion(teamFixtures);
if (congestion.warning) {
  console.log('Congestion warning:', congestion.warning);
}
```

---

## 5. Fixture Lock System

Prevents fixture modifications while user is playing:

```typescript
import { FixtureLockSystem } from '@/global/fixtures';

const lockSystem = new FixtureLockSystem(db);

// Lock when user starts playing
await lockSystem.lockFixture(
  fixtureId,
  'user_playing',
  userId
);

// Prevent other fixtures from being played
const canPlay = await lockSystem.enforceFixtureLock(fixtureId, teamId);
if (!canPlay) {
  console.log('Another match is in progress');
  return;
}

// Unlock when done
await lockSystem.unlockFixture(fixtureId, 'match_completed');

// Auto-unlock safety (5-minute timeout)
await lockSystem.autoUnlockExpiredLocks(300000); // 5 minutes

// Check locks
const report = await lockSystem.getLockStatusReport();
console.log('Active locks:', report.activeLocks);
```

---

## 6. League Table Management

Tables update automatically after each match:

```typescript
// This is called automatically by CalendarFixtureIntegration.handleMatchResult()
await fixtureManager.updateLeagueTable(
  divisionId,
  teamId,
  homeScore,
  awayScore,
  isHomeTeam // true if this team is home team
);

// Updates:
// - Played games count
// - Wins/Draws/Losses
// - Goals For/Against
// - Goal Difference
// - Points (3 for win, 1 for draw, 0 for loss)
// - Form (last 5 matches: W/D/L)

// Positions auto-recalculate
await fixtureManager.recalculateTablePositions(divisionId);

// Retrieve current standings
const standings = await db.query(
  'SELECT * FROM league_tables WHERE division_id = ? ORDER BY position ASC',
  [divisionId]
);
```

---

## 7. Calendar Integration

Calendar events trigger match engine startup:

```typescript
import { CalendarFixtureIntegration } from '@/global/fixtures';

// When setting up season, add all fixtures to calendar
const eventIds = await CalendarFixtureIntegration.scheduleSeasonFixtures(
  allFixtures,
  calendarApi
);

// Calendar triggers MATCH events at scheduled kickoff time
calendarApi.on('MATCH', async (event: CalendarEvent<MatchPayload>) => {
  // Event payload contains:
  // - fixtureId
  // - homeClubId / awayClubId
  // - competition type
  // - userTeam (boolean)

  // Load fixture details
  const fixture = await fixtureManager.getFixture(event.payload.fixtureId);

  // Initialize match
  const engine = new MatchEngine(config, 'default');
  await engine.initializeMatch({
    fixture,
    homeLineup: homeTeam.players,
    awayLineup: awayTeam.players,
    homeFormation: homeTeam.tacticalFormation,
    awayFormation: awayTeam.tacticalFormation,
    userTeamId: userClubId,
  });

  // Start match
  engine.startMatch();

  // Handle completion
  engine.on('match-finished', async (data) => {
    await CalendarFixtureIntegration.handleMatchResult(
      fixture.id,
      data.finalScore.home,
      data.finalScore.away,
      fixtureManager,
      leagueTableManager
    );

    // Mark event as done
    await calendarApi.resolve(event.id, 'DONE');
  });
});
```

---

## 8. Player Development Integration

Player stats update after each match:

```typescript
// After match finishes, players gain:
// 1. Experience points (based on minutes played)
// 2. Form change (based on performance rating)
// 3. Development progression (based on age/position)

engine.on('match-finished', async (data) => {
  const { matchState } = data;

  // Process each player
  for (const player of matchState.homeTeam.players) {
    if (player.minutesPlayed > 0) {
      // Experience gain
      const experiencePoints = player.minutesPlayed * 0.5;

      // Form update
      const formChange = (player.liveRating - 5) * 2; // -10 to +10
      player.form = Math.max(0, Math.min(100, player.form + formChange));

      // Development check
      const development = developmentTracker.calculateDevelopment(
        player,
        experiencePoints
      );

      if (development.ratingChange > 0) {
        console.log(`${player.firstName} improved to ${player.rating}`);
      }

      // Persist to database
      await db.run(
        'UPDATE players SET form = ?, experience = experience + ? WHERE id = ?',
        [player.form, experiencePoints, player.id]
      );
    }
  }
});
```

---

## 9. Complete Match Day Example

Here's a complete example of a full match day flow:

```typescript
// INITIALIZATION
const db = await SQLiteConnectionManager.getInstance().getConnection('game');
const fixtureManager = new FixtureManager(db);
const calendar = new IntegratedCalendarEngine();
const engine = new MatchEngine(defaultConfig, 'default');

// SETUP SEASON
await fixtureManager.initializeDatabases();
const fixtures = await fixtureManager.generateSeasonFixtures(
  'div_premier',
  '2024-25',
  clubs,
  '2024-08-17'
);

// SCHEDULE IN CALENDAR
await CalendarFixtureIntegration.scheduleSeasonFixtures(
  fixtures,
  calendar
);

// LISTEN FOR MATCH EVENTS
calendar.on('MATCH', async (event) => {
  console.log(`🎮 Match event: ${event.description}`);

  // Load fixture
  const fixture = await fixtureManager.getFixture(event.payload.fixtureId);

  // Load teams
  const homeTeam = await loadTeam(fixture.homeTeamId);
  const awayTeam = await loadTeam(fixture.awayTeamId);

  // Lock fixture
  const lockSystem = fixtureManager.getLockSystem();
  await lockSystem.lockFixture(fixture.id, 'user_playing', userId);

  // Initialize match
  await engine.initializeMatch({
    fixture,
    homeLineup: homeTeam.squad,
    awayLineup: awayTeam.squad,
    homeFormation: homeTeam.formation,
    awayFormation: awayTeam.formation,
    userTeamId: userId,
  });

  // Show UI
  showMatchUI(engine);

  // Start match
  engine.startMatch();

  // MATCH IN PROGRESS
  engine.on('match-update', (data) => {
    updateMatchUI(data.matchState);
  });

  engine.on('match-event', (event) => {
    showEventNotification(event);
  });

  // MATCH FINISHED
  engine.on('match-finished', async (data) => {
    const { matchState, finalScore } = data;

    // Update everything
    await CalendarFixtureIntegration.handleMatchResult(
      fixture.id,
      finalScore.home,
      finalScore.away,
      fixtureManager,
      leagueTableManager
    );

    // Update players
    for (const player of matchState.homeTeam.players) {
      if (player.minutesPlayed > 0) {
        await updatePlayerStats(player);
      }
    }

    // Show results
    showMatchResultsScreen(matchState);

    // Mark calendar event done
    await calendar.resolve(event.id, 'DONE');

    // Auto-advance to next day
    setTimeout(() => calendar.nextDay(), 3000);
  });
});

// START CALENDAR
await calendar.init({ startFrom: new Date('2024-08-17'), userClubId });
await calendar.play();
```

---

## 10. Performance Optimizations

### Database Queries

All queries use indexes for fast lookups:

```sql
CREATE INDEX idx_fixtures_division ON fixtures(division_id)
CREATE INDEX idx_fixtures_date ON fixtures(scheduled_date)
CREATE INDEX idx_fixtures_status ON fixtures(status)
CREATE INDEX idx_league_tables_division ON league_tables(division_id)
CREATE INDEX idx_team_rest_club ON team_rest_days(club_id)
```

### Batch Operations

Fixtures are inserted in batches for performance:

```typescript
const batchSize = 50;
for (let i = 0; i < fixtures.length; i += batchSize) {
  const batch = fixtures.slice(i, i + batchSize);
  for (const fixture of batch) {
    await db.run(INSERT_FIXTURE_SQL, [...values]);
  }
}
```

### Memory Management

- Event listeners are properly cleaned up
- Interval timers are cleared
- Database connections are closed after use

---

## 11. Error Handling

### Match Validation

```typescript
const validation = await fixtureManager.validateFixturePlayable(fixtureId);

if (!validation.canPlay) {
  console.error('Match cannot be played:', validation.reasons);
  // Handle blocking reasons
  for (const reason of validation.reasons) {
    console.error(`  - ${reason}`);
  }
  return;
}

// Warnings don't block but should be shown
for (const warning of validation.warnings) {
  console.warn(`  ⚠️ ${warning}`);
}
```

### Rest Day Violations

```typescript
const restValidation = restCalculator.validateRestDays(
  currentFixture,
  previousFixture,
  null,
  2
);

if (!restValidation.isValid) {
  // Suggest optimal date
  const optimal = restCalculator.suggestOptimalDate(
    teamId,
    currentFixture,
    recentFixtures
  );
  console.log(`Reschedule to: ${optimal}`);

  // Reschedule match
  await CalendarFixtureIntegration.rescheduleFixture(
    currentFixture,
    optimal.split('T')[0], // Date
    '15:00', // Time
    'REST_VIOLATION',
    fixtureManager
  );
}
```

---

## 12. Testing Checklist

- [ ] Season fixtures generate correctly
- [ ] Fixtures respect 2+ day rest
- [ ] Match speeds control game timing
- [ ] Locks prevent concurrent matches
- [ ] League tables update correctly
- [ ] Player stats are recorded
- [ ] Calendar events trigger matches
- [ ] Rest days recalculate after match
- [ ] Reschedules work properly
- [ ] Performance is smooth at all speeds

---

## 13. API Reference

### FixtureManager
```typescript
initializeDatabases(): Promise<void>
generateSeasonFixtures(divisionId, season, clubs, startDate): Promise<Fixture[]>
getNextFixture(teamId): Promise<Fixture | null>
getTeamFixtures(teamId, limit, status?): Promise<Fixture[]>
getFixture(fixtureId): Promise<Fixture | null>
updateFixtureResult(fixtureId, homeScore, awayScore, attendance?): Promise<void>
updateLeagueTable(divisionId, teamId, homeScore, awayScore, isHomeTeam): Promise<void>
recalculateTablePositions(divisionId): Promise<void>
validateFixturePlayable(fixtureId): Promise<{canPlay, reasons, warnings}>
```

### RestDayCalculator
```typescript
validateRestDays(current, previous, next, minimumDays?): {isValid, issues}
calculateTeamFatigue(recentMatches): number // 0-100
checkFixtureCongestion(teamFixtures): {warning?: string}
calculatePlayerRecoveryTime(player, position, age): number // days
recommendRestPeriod(lastMatch, nextMatch, recentMatches): number // days
suggestOptimalDate(teamId, fixture, recentFixtures): string // ISO date
```

### FixtureLockSystem
```typescript
lockFixture(fixtureId, reason, userId?): Promise<void>
unlockFixture(fixtureId, reason): Promise<void>
isFixtureLocked(fixtureId): boolean
enforceFixtureLock(fixtureId, teamId): Promise<boolean>
autoUnlockExpiredLocks(timeoutMs): Promise<void>
getLockStatusReport(): Promise<LockReport>
```

### MatchEngine
```typescript
constructor(config, matchSpeed?)
initializeMatch(setup): Promise<void>
startMatch(): void
pause(): void
resume(): void
performSubstitution(playerOutId, playerInId, reason?): Promise<void>
getMatchState(): MatchState | null
getMatchSpeed(): MatchSpeed
setMatchSpeed(speed): void
getMatchSpeedInfo(): MatchSpeedConfig
getMatchProgress(): number
on(event, callback): void
off(event, callback): void
destroy(): void
```

### CalendarFixtureIntegration
```typescript
fixtureToCalendarEvent(fixture): CalendarEvent
scheduleSeasonFixtures(fixtures, calendarApi): Promise<string[]>
handleMatchResult(fixtureId, homeScore, awayScore, managers): Promise<void>
rescheduleFixture(fixture, newDate, newTime, reason, manager): Promise<void>
validateFixtureScheduling(fixture, manager, calculator): Promise<{isValid, issues, warnings}>
```

---

## 14. Common Issues & Solutions

### Issue: Match not ending

**Solution:** Check `shouldEndMatch()` in MatchEngine - ensure `currentMinute >= 90`

### Issue: Wrong fixture pace

**Solution:** Verify `MatchSpeedConfig.realTimeMs` matches desired duration. Check `timeStep` calculation.

### Issue: Rest days not enforced

**Solution:** Ensure `RestDayCalculator.validateRestDays()` is called before playing. Check database for rest day records.

### Issue: Locks not working

**Solution:** Verify `FixtureLockSystem.lockFixture()` is called before match starts. Check `isFixtureLocked()` before allowing new matches.

### Issue: Table not updating

**Solution:** Ensure `updateLeagueTable()` is called for both teams. Check `recalculateTablePositions()` is called after update.

---

## Summary

The Football Legacy system is fully integrated with:

✅ **Automatic fixture generation** with realistic scheduling
✅ **Smart rest day enforcement** (2+ days minimum)
✅ **Configurable match speeds** (45s, 90s, 180s)
✅ **Fixture locking** to prevent concurrent matches
✅ **Live league table updates** after each match
✅ **Player stat tracking** and development
✅ **Calendar event orchestration** for match scheduling
✅ **Production-grade error handling** and validation

All systems work together seamlessly for a complete, hyper-realistic football management experience.
