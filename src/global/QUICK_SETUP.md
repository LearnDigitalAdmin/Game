# Football Legacy: Quick Setup Guide

## 5-Minute Setup

### Step 1: Initialize Database (1 min)

```typescript
import { FixtureManager } from '@/global/fixtures';
import { SQLiteConnectionManager } from '@/global/database/Initializer';

const connectionManager = SQLiteConnectionManager.getInstance();
const db = await connectionManager.getConnection('game');
const fixtureManager = new FixtureManager(db);

// Create all tables
await fixtureManager.initializeDatabases();
console.log('✅ Database initialized');
```

### Step 2: Generate Season Fixtures (2 min)

```typescript
const clubs = [
  { id: 'arsenal', name: 'Arsenal' },
  { id: 'chelsea', name: 'Chelsea' },
  { id: 'man_city', name: 'Manchester City' },
  { id: 'man_utd', name: 'Manchester United' },
  // ... add all 20 Premier League clubs
];

const fixtures = await fixtureManager.generateSeasonFixtures(
  'premier_league',
  '2024-25',
  clubs,
  '2024-08-17' // Season start
);

console.log(`✅ Generated ${fixtures.length} fixtures`);
```

### Step 3: Setup Calendar Integration (1 min)

```typescript
import { CalendarFixtureIntegration } from '@/global/fixtures';
import { IntegratedCalendarEngine } from '@/global/calendar';

const calendar = new IntegratedCalendarEngine();
await calendar.init({
  startFrom: new Date('2024-08-17'),
  userClubId: 'arsenal' // Set user's team
});

// Add all fixtures to calendar
await CalendarFixtureIntegration.scheduleSeasonFixtures(
  fixtures,
  calendar
);

console.log('✅ Calendar populated with fixtures');
```

### Step 4: Listen for Matches (1 min)

```typescript
import { MatchEngine } from '@/global/engine';

calendar.on('MATCH', async (event) => {
  console.log('🎮 Match starting:', event.description);

  // Create match engine with desired speed
  // Options: 'fast' (45s), 'default' (90s), 'hyper-realistic' (180s)
  const engine = new MatchEngine(defaultConfig, 'default');

  // Setup will be done by UI/handlers
  setupMatch(engine, event);
});

await calendar.play();
console.log('✅ Calendar running');
```

---

## Key Configuration Points

### Match Speeds

```typescript
// Fast: 45 seconds for full match (quick testing)
const engine = new MatchEngine(config, 'fast');

// Default: 90 seconds for full match (standard)
const engine = new MatchEngine(config, 'default');

// Hyper-Realistic: 180 seconds for full match (detailed play)
const engine = new MatchEngine(config, 'hyper-realistic');
```

### Rest Day Settings

Default: 2 days minimum between matches
```typescript
const isValid = restCalculator.validateRestDays(
  nextFixture,
  previousFixture,
  null,
  2 // minimum days - adjust here
);
```

### Fixture Locking

Prevents concurrent matches:
```typescript
// Lock when user starts playing
await lockSystem.lockFixture(fixtureId, 'user_playing', userId);

// Check before allowing another match
const isLocked = lockSystem.isFixtureLocked(otherFixtureId);
if (isLocked) {
  console.log('Another match in progress');
  return;
}

// Unlock when done
await lockSystem.unlockFixture(fixtureId, 'match_completed');
```

---

## Complete Match Example

```typescript
// When a MATCH event triggers
calendar.on('MATCH', async (matchEvent) => {
  try {
    // 1. Get fixture details
    const fixture = await fixtureManager.getFixture(
      matchEvent.payload.fixtureId
    );

    // 2. Validate can play
    const validation = await fixtureManager.validateFixturePlayable(
      fixture.id
    );
    if (!validation.canPlay) {
      console.error('Cannot play:', validation.reasons);
      return;
    }

    // 3. Lock fixture
    const lockSystem = fixtureManager.getLockSystem();
    await lockSystem.lockFixture(fixture.id, 'user_playing', userId);

    // 4. Load teams
    const homeTeam = await db.query(
      'SELECT * FROM clubs WHERE id = ?',
      [fixture.homeTeamId]
    );
    const awayTeam = await db.query(
      'SELECT * FROM clubs WHERE id = ?',
      [fixture.awayTeamId]
    );

    // 5. Create engine
    const engine = new MatchEngine(defaultConfig, 'default');

    // 6. Initialize match
    await engine.initializeMatch({
      fixture: {
        id: fixture.id,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        homeTeamName: fixture.homeTeamName,
        awayTeamName: fixture.awayTeamName,
        homeClubId: fixture.homeTeamId,
        awayClubId: fixture.awayTeamId,
        divisionId: fixture.divisionId,
        scheduledDate: fixture.scheduledDate,
        scheduledTime: fixture.scheduledTime,
        competitionType: fixture.competitionType,
      },
      homeLineup: homeTeam.players,
      awayLineup: awayTeam.players,
      homeFormation: '4-3-3',
      awayFormation: '4-2-3-1',
      userTeamId: userId,
    });

    // 7. Start match
    engine.startMatch();

    // 8. Listen for updates
    engine.on('match-update', (data) => {
      updateUI(data.matchState);
    });

    engine.on('goal', (event) => {
      showNotification(`⚽ GOAL! ${event.player?.firstName} scores`);
    });

    // 9. Handle completion
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

      // Show results
      showResultsScreen(matchState);

      // Mark calendar event done
      await calendar.resolve(matchEvent.id, 'DONE');
    });

  } catch (error) {
    console.error('Match error:', error);
    // Cleanup
    if (lockSystem) {
      await lockSystem.unlockFixture(matchEvent.payload.fixtureId, 'error');
    }
  }
});
```

---

## Database Schema Quick Reference

### Core Tables

**fixtures**
```sql
id, division_id, competition_type, home_team_id, away_team_id,
scheduled_date, scheduled_time, kickoff_timestamp, status,
home_score, away_score, venue, capacity, is_locked, created_at, updated_at
```

**fixture_locks**
```sql
id, fixture_id, lock_reason, locked_at, unlock_at,
locked_by_user_id, can_pause, can_quit, auto_unlock
```

**team_rest_days**
```sql
id, club_id, last_match_date, last_match_id,
days_since_last_match, fatigue_level, updated_at
```

**league_tables**
```sql
id, division_id, team_id, team_name, played, won, drawn, lost,
goals_for, goals_against, goal_difference, points, form, position
```

---

## Environment Setup

```typescript
// Types
import type {
  Fixture,
  MatchSpeed,
  MatchState,
  CalendarEvent
} from '@/global/fixtures';

// Classes
import {
  FixtureManager,
  RestDayCalculator,
  FixtureLockSystem,
  FixtureDatabaseSchema,
  CalendarFixtureIntegration
} from '@/global/fixtures';

import {
  MatchEngine,
  PlayerRater,
  FormCalculator,
  DevelopmentTracker,
  MatchAnalytics,
  MATCH_SPEEDS,
  validateMatchSpeed
} from '@/global/engine';

// Database
import { SQLiteConnectionManager } from '@/global/database/Initializer';
import { IntegratedCalendarEngine } from '@/global/calendar';
```

---

## Troubleshooting

### Fixtures not generating?
- Check clubs array has correct `id` and `name` properties
- Ensure `startDate` is a valid date string
- Verify database connection is active

### Match not starting?
- Confirm fixture is not locked: `lockSystem.isFixtureLocked(id)`
- Check validation: `validateFixturePlayable()` should return `canPlay: true`
- Verify teams have 11+ players in lineup

### Speed not working?
- Use: `'fast'`, `'default'`, or `'hyper-realistic'`
- Set before calling `startMatch()`
- Verify speed config: `engine.getMatchSpeedInfo()`

### Rest days not enforcing?
- Check `RestDayCalculator.validateRestDays()` is called
- Verify `team_rest_days` table is updated after each match
- Confirm minimum days setting (default: 2)

### Tables not updating?
- Ensure `updateLeagueTable()` is called for both teams
- Check `recalculateTablePositions()` is called after
- Verify `league_tables` entries exist for all teams

---

## Performance Tips

1. **Batch operations**: Insert fixtures in batches of 50
2. **Use indexes**: All queries use indexed columns
3. **Lazy loading**: Load player details only when needed
4. **Cleanup**: Always call `engine.destroy()` and `calendar.destroy()`
5. **Debounce UI updates**: Limit UI refresh to 60fps

---

## Production Checklist

- [ ] All database tables created
- [ ] Fixtures generated for full season
- [ ] Calendar events scheduled
- [ ] Match speeds tested
- [ ] Rest days validated
- [ ] Lock system tested
- [ ] Table updates verified
- [ ] Player stats tracked
- [ ] Error handling in place
- [ ] Memory cleanup verified

---

## Next Steps

1. **User Interface**: Build React components using `MatchContainer`
2. **Match UI**: Show live stats, substitution options, replays
3. **Season Progression**: Auto-advance calendar between matches
4. **Transfer Window**: Integrate player transfers
5. **Advanced Stats**: Add analytics and historical data
6. **Multiplayer**: Extend for league play with other players

---

## Support Files

- 📖 `INTEGRATION_GUIDE.md` - Complete system overview
- 📘 `FIXTURES_GUIDE.md` - Fixture system documentation
- 🎮 `engine/README.md` - Match engine documentation
- ⚙️ `engine/IMPLEMENTATION_GUIDE.md` - Engine implementation details
