# 🎮 Match Engine Implementation Guide

Complete guide to integrating the match engine with Football Legacy manager mode.

## 📦 Installation & Setup

### 1. Import Match Engine
```typescript
import {
  MatchEngine,
  MatchContainer,
  useMatchEngine,
  type MatchSetup,
  type MatchFixture,
} from '@/global/engine';
```

### 2. Create Match Setup from Fixture & Lineups
```typescript
import { gameDB } from '@/global/database/Save';

// Get fixture from database
const fixture = await gameDB.getFixture(fixtureId);

// Get club lineups
const homeClub = await gameDB.getClub(fixture.homeTeamId);
const awayClub = await gameDB.getClub(fixture.awayTeamId);

// Get players
const homePlayers = await gameDB.getClubPlayers(fixture.homeTeamId);
const awayPlayers = await gameDB.getClubPlayers(fixture.awayTeamId);

// Create setup
const setup: MatchSetup = {
  fixture: {
    id: fixture.id,
    divisionId: fixture.divisionId,
    homeClubId: fixture.homeTeamId,
    awayClubId: fixture.awayTeamId,
    homeTeamName: homeClub.name,
    awayTeamName: awayClub.name,
    matchday: fixture.matchday,
    date: fixture.date,
    time: fixture.time,
    status: 'live',
    venue: homeClub.name + ' Stadium',
    attendance: 40000,
    competition: 'League',
  },
  homeLineup: {
    players: convertPlayersToLineup(homePlayers),
    substitutes: convertPlayersToSubstitutes(homePlayers),
    formation: {
      shape: [4, 3, 3],
      style: 'balanced',
      pressing: 'medium',
      possession: 'build-up',
      counterAttack: false
    },
    managerName: 'Your Manager Name',
  },
  awayLineup: {
    players: convertPlayersToLineup(awayPlayers),
    substitutes: convertPlayersToSubstitutes(awayPlayers),
    formation: {
      shape: [4, 2, 3, 1],
      style: 'defensive',
      pressing: 'low',
      possession: 'direct',
      counterAttack: true
    },
    managerName: 'Opponent Manager',
  },
  userTeamId: fixture.homeTeamId, // or away if user controls away team
};
```

### 3. Helper Functions

```typescript
function convertPlayersToLineup(players: Player[]): MatchPlayer[] {
  // Sort players by position and rating
  return players
    .sort((a, b) => {
      const posOrder = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
      return posOrder.indexOf(a.position) - posOrder.indexOf(b.position);
    })
    .slice(0, 11) // Select 11 players
    .map((p, idx) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      number: idx + 1,
      position: p.position as Position,
      rating: p.rating,
      potential: p.potential,
      personality: p.personality,
      age: p.age,
      foot: p.foot as 'Left' | 'Right' | 'Both',

      // Live stats (initialize)
      liveRating: (p.rating / 100) * 10,
      fatigue: 0,
      morale: 75,
      form: p.form,
      status: 'playing' as const,
      minutesPlayed: 0,

      // Stats (initialize to 0)
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

      onPitch: true,
      isSubstitute: false,
      isOnBench: false,
      isInjured: p.injuries?.length > 0,
      isSuspended: false,
    }));
}

function convertPlayersToSubstitutes(players: Player[]): MatchPlayer[] {
  return players.slice(11, 18).map((p, idx) => ({
    // ... same as above
    isSubstitute: true,
    isOnBench: true,
    onPitch: false,
  }));
}
```

## 🎮 Usage in Manager Mode

### Display Match Live
```typescript
function ManagerMatchLive() {
  const { matchState, startMatch, pauseMatch } = useMatchEngine({
    onEvent: (event) => {
      // Update UI, play sounds, etc
      console.log(event.description);
    },
  });

  return (
    <MatchContainer
      setup={matchSetup}
      onMatchComplete={async (result) => {
        // Save match data to database
        await saveMatchResult(result);
        // Update league tables
        await updateLeagueTable(result);
        // Update player stats
        await updatePlayerStats(result);
      }}
    />
  );
}
```

### Save Match Results to Database
```typescript
async function saveMatchResult(result: any) {
  const { matchState, analytics } = result;

  // Update fixture status
  await gameDB.run(
    'UPDATE fixtures SET status = ?, home_score = ?, away_score = ?, attendance = ? WHERE id = ?',
    [
      'finished',
      matchState.score.home,
      matchState.score.away,
      matchState.crowd ? matchState.crowd.excitement * 100 : 0,
      matchState.fixture.id,
    ]
  );

  // Update player statistics
  for (const playerId in analytics.playerRatings) {
    const rating = analytics.playerRatings[playerId];
    await gameDB.run(
      'UPDATE players SET rating = ? WHERE id = ?',
      [rating * 10, playerId] // Convert 0-10 to 0-100
    );
  }

  // Store match analytics for later review
  await gameDB.run(
    'INSERT INTO match_analytics (match_id, home_xg, away_xg, home_possession, away_possession, json_data) VALUES (?, ?, ?, ?, ?, ?)',
    [
      matchState.id,
      analytics.expectedGoals.home,
      analytics.expectedGoals.away,
      analytics.possession.home,
      analytics.possession.away,
      JSON.stringify(analytics),
    ]
  );
}
```

### Update League Table
```typescript
async function updateLeagueTable(result: any) {
  const { matchState, fixture } = result;
  const { home, away } = matchState.score;
  const divisionId = matchState.fixture.divisionId;

  // Determine result
  let homePoints = 0, awayPoints = 0;
  if (home > away) {
    homePoints = 3;
  } else if (away > home) {
    awayPoints = 3;
  } else {
    homePoints = awayPoints = 1;
  }

  // Update home team
  await gameDB.run(
    `UPDATE league_tables
     SET played = played + 1,
         won = won + ?,
         drawn = drawn + ?,
         lost = lost + ?,
         goals_for = goals_for + ?,
         goals_against = goals_against + ?,
         points = points + ?,
         form = SUBSTR(form, 1, 4) || ?
     WHERE division_id = ? AND team_id = ?`,
    [
      home > away ? 1 : 0,
      home === away ? 1 : 0,
      home < away ? 1 : 0,
      home,
      away,
      homePoints,
      home > away ? 'W' : home === away ? 'D' : 'L',
      divisionId,
      matchState.fixture.homeClubId,
    ]
  );

  // Update away team similarly
  // ... (reverse goals, opposite result)

  // Recalculate standings
  await recalculateTablePositions(divisionId);
}

async function recalculateTablePositions(divisionId: string) {
  const result = await gameDB.query(
    `SELECT * FROM league_tables
     WHERE division_id = ?
     ORDER BY points DESC, goal_difference DESC, goals_for DESC`,
    [divisionId]
  );

  let position = 1;
  if (result.values) {
    for (const row of result.values) {
      await gameDB.run(
        'UPDATE league_tables SET position = ? WHERE id = ?',
        [position++, row.id]
      );
    }
  }
}
```

### Update Player Statistics
```typescript
async function updatePlayerStats(result: any) {
  const { matchState, analytics } = result;

  // Get all player data from match
  const allPlayers = [
    ...matchState.homeTeam.players,
    ...matchState.awayTeam.players,
  ];

  for (const player of allPlayers) {
    // Only update if player played
    if (player.minutesPlayed === 0) continue;

    await gameDB.run(
      `UPDATE player_history
       SET appearances = appearances + 1,
           minutes_played = minutes_played + ?,
           goals = goals + ?,
           assists = assists + ?,
           yellow_cards = yellow_cards + ?,
           red_cards = red_cards + ?
       WHERE player_id = ? AND season = ?`,
      [
        player.minutesPlayed,
        player.goals,
        player.assists,
        player.yellowCards,
        player.redCards,
        player.id,
        getCurrentSeason(), // Get from game state
      ]
    );

    // Update form
    const formChange = (player.liveRating - 5) * 3;
    const newForm = Math.max(0, Math.min(100, player.form + formChange));

    await gameDB.run(
      'UPDATE players SET form = ?, rating = ? WHERE id = ?',
      [newForm, player.rating, player.id]
    );
  }
}
```

## 🎯 Integration Points

### 1. Manager Home Screen
Add match result display and upcoming fixtures:

```typescript
// In ManagerDashboard
const nextFixture = await gameDB.getNextFixture(userClubId);
if (nextFixture && nextFixture.status === 'scheduled') {
  return <UpcomingFixtureCard fixture={nextFixture} onStartMatch={startLiveMatch} />;
}
```

### 2. Fixture Panel
Show match list with quick start:

```typescript
// In FixturesPanel
<button
  onClick={() => startLiveMatch(fixture.id)}
  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
>
  Play Match
</button>
```

### 3. Player Development Panel
Display post-match rating changes:

```typescript
// After match
const playerDevelopment = analytics.playerRatings;
playerDevelopment.forEach((playerId, rating) => {
  const player = allPlayers.find(p => p.id === playerId);
  const ratingChange = rating - player.rating;

  console.log(
    `${player.firstName} ${player.lastName}: ` +
    `${rating.toFixed(1)} (${ratingChange > 0 ? '+' : ''}${ratingChange.toFixed(1)})`
  );
});
```

### 4. League Table Updates
Automatic updates after each match:

```typescript
// In CalendarEngine processMatchEvent
await updateLeagueTable(result);
```

## 📊 Data Flow

```
ManagerDashboard
    ↓
FixturesPanel → Select Fixture
    ↓
MatchContainer (useMatchEngine)
    ↓
MatchEngine (Simulation)
    ├─ MatchSimulator (Physics)
    ├─ EventGenerator (Probabilistic)
    ├─ PlayerRater (Live Ratings)
    ├─ HighlightManager (Clips)
    └─ MatchAnalytics (Stats)
    ↓
saveMatchResult()
    ├─ Update Fixture Status
    ├─ Update Player Stats
    ├─ Update League Table
    └─ Save Analytics
    ↓
LeagueTable Updated
PlayerProfiles Updated
ManagerDashboard Refreshed
```

## ⚙️ Configuration Examples

### Realistic Simulation
```typescript
const config: SimulationConfig = {
  timeStep: 16,
  eventsPerMinute: 5,
  realism: 'ultra-realistic',
  injuryRate: 0.1,
  yellowCardRate: 0.2,
  randomness: 40, // More predictable
};
```

### Arcade/Fast Simulation
```typescript
const config: SimulationConfig = {
  timeStep: 32,
  eventsPerMinute: 3,
  realism: 'arcade',
  injuryRate: 0.05,
  yellowCardRate: 0.1,
  randomness: 80, // More random
};
```

## 🧪 Testing

### Unit Tests
```typescript
describe('MatchEngine', () => {
  it('should initialize match', async () => {
    const engine = new MatchEngine();
    await engine.initializeMatch(mockSetup);
    expect(engine.getMatchState()).toBeDefined();
  });

  it('should generate realistic events', async () => {
    const events = eventGenerator.generateEvents(mockState, 5);
    expect(events.length).toBeGreaterThan(0);
  });

  it('should calculate player rating correctly', () => {
    const performance = playerRater.calculateLiveRating(mockPlayer);
    expect(performance.liveRating).toBeBetween(0, 10);
  });
});
```

### Integration Tests
```typescript
describe('Match Simulation', () => {
  it('should complete full 90-minute match', async () => {
    const engine = new MatchEngine();
    await engine.initializeMatch(mockSetup);
    engine.startMatch();

    await new Promise(resolve => {
      engine.on('match-finished', resolve);
    });

    const finalState = engine.getMatchState();
    expect(finalState?.currentMinute).toBeCloseTo(90, 5);
  });
});
```

## 📱 Mobile Optimization

- Canvas rendering optimized for 1280x720 landscape
- Touch controls for substitutions
- Swipe to navigate UI panels
- Low-power mode (reduce animations)

## 🔄 Next Steps

1. **Integrate with CalendarEngine**: Trigger matches at scheduled times
2. **Add AI Opponents**: Simulate non-user matches
3. **Injury Recovery System**: Track injured players
4. **Contract Management**: Update contract details post-match
5. **Financial System**: Update club finances based on match attendance
6. **Transfer Market**: Adjust player values based on performance
7. **Awards System**: Track top scorers, best defenders, etc.
8. **Career Statistics**: Build historical records

## 🐛 Troubleshooting

### Match Won't Start
- Check that all players are properly initialized
- Verify lineup has 11 players minimum
- Ensure setup.userTeamId matches a fixture team

### Missing Events
- Increase `eventsPerMinute` in config
- Check EventGenerator probability thresholds
- Verify match state is being updated

### Performance Issues
- Reduce canvas rendering frequency
- Disable heatmaps/advanced analytics
- Increase `timeStep` in SimulationConfig

## 📚 Additional Resources

- See `README.md` for feature overview
- See `types/MatchTypes.ts` for complete type definitions
- See individual module files for implementation details
