# ⚽ Match Engine - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Import & Create Engine
```typescript
import MatchEngine, { MatchContainer } from '@/global/engine';

const engine = new MatchEngine();
```

### 2. Initialize a Match
```typescript
const setup = {
  fixture: { id: 'f1', homeTeamName: 'Team A', awayTeamName: 'Team B', ... },
  homeLineup: { players: [...11 players], substitutes: [...], formation: {...} },
  awayLineup: { players: [...11 players], substitutes: [...], formation: {...} },
  userTeamId: 'user_team_id'
};

await engine.initializeMatch(setup);
engine.startMatch();
```

### 3. Listen to Events
```typescript
engine.on('goal', (event) => console.log('⚽ GOAL!'));
engine.on('match-finished', (result) => console.log('Final:', result.finalScore));
```

### 4. Display UI
```typescript
<MatchContainer setup={setup} onMatchComplete={handleComplete} />
```

---

## 🎮 In React Component

```typescript
function MyMatch() {
  const { matchState, startMatch, pauseMatch, performSubstitution } = useMatchEngine({
    onEvent: (event) => console.log(event),
  });

  return (
    <div>
      <button onClick={startMatch}>Start</button>
      <button onClick={pauseMatch}>Pause</button>

      <MatchContainer setup={setup} />

      {matchState && (
        <div>
          Score: {matchState.score.home} - {matchState.score.away}
          Time: {Math.floor(matchState.currentMinute)}'
          Possession: {Math.round(matchState.ballPossession.home)}%
        </div>
      )}
    </div>
  );
}
```

---

## 📊 Get Match Results

```typescript
engine.on('match-finished', async (result) => {
  const { matchState, analytics } = result;

  console.log(`Final: ${matchState.score.home} - ${matchState.score.away}`);
  console.log(`Duration: ${matchState.currentMinute} minutes`);
  console.log(`Possession: ${matchState.ballPossession.home}%`);
  console.log(`Expected Goals: ${analytics.expectedGoals.home.toFixed(2)}`);

  // Get best highlights
  const highlights = engine.highlightManager.getGoals();
  highlights.forEach(h => console.log(h.description));

  // Get player ratings
  const ratings = analytics.playerRatings;
  Object.entries(ratings).forEach(([playerId, rating]) => {
    console.log(`Player ${playerId}: ${rating.toFixed(1)}/10`);
  });

  // Get match report
  const report = new MatchAnalytics().generateMatchReport(analytics);
  console.log(report);
});
```

---

## ⚙️ Configuration

### Fast Simulation (5 seconds for 90 minutes)
```typescript
const engine = new MatchEngine({
  timeStep: 32,
  eventsPerMinute: 3,
  realism: 'arcade',
  randomness: 80
});
```

### Realistic Simulation (20 seconds for 90 minutes)
```typescript
const engine = new MatchEngine({
  timeStep: 16,
  eventsPerMinute: 5,
  realism: 'realistic',
  randomness: 50
});
```

### Ultra-Realistic Simulation (60 seconds for 90 minutes)
```typescript
const engine = new MatchEngine({
  timeStep: 8,
  eventsPerMinute: 8,
  realism: 'ultra-realistic',
  randomness: 30
});
```

---

## 🎯 Key Methods

### Engine Control
```typescript
engine.startMatch()              // Start simulation
engine.pause()                   // Pause match
engine.resume()                  // Resume match
await engine.performSubstitution(playerOutId, playerInId)
engine.getMatchState()          // Get current state
engine.destroy()                // Cleanup
```

### Events
```typescript
engine.on('match-event', callback)     // Any event
engine.on('goal', callback)             // Goals only
engine.on('red-card', callback)        // Red cards
engine.on('injury', callback)          // Injuries
engine.on('match-finished', callback)  // Match end
```

### Analytics
```typescript
const analytics = new MatchAnalytics().generateMatchAnalytics(matchState);
const report = analytics.generateMatchReport();
const potm = analytics.getPlayerOfTheMatch();
const comparison = analytics.compareToAverage(analytics);
```

### Highlights
```typescript
const highlights = highlightManager.getHighlights();
const goals = highlightManager.getGoals();
const compilation = highlightManager.generateHighlightsCompilation(90);
const bestClip = highlightManager.getBestHighlight();
```

---

## 📋 Player Lineup Format

```typescript
interface MatchPlayer {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  position: 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';
  rating: number;        // 0-100
  age: number;
  form: number;          // 0-100
  foot: 'Left' | 'Right' | 'Both';

  // Live stats (initialize to 0 or starting values)
  liveRating: number;    // 0-10
  fatigue: number;       // 0-100
  morale: number;        // 0-100

  // Flags
  onPitch: boolean;
  isSubstitute: boolean;
  isInjured: boolean;
  isSuspended: boolean;
}
```

---

## 📊 Formation Shapes

```typescript
const formations = {
  '4-3-3': { shape: [4, 3, 3], style: 'balanced' },
  '3-5-2': { shape: [3, 5, 2], style: 'attacking' },
  '5-3-2': { shape: [5, 3, 2], style: 'defensive' },
  '4-2-3-1': { shape: [4, 2, 3, 1], style: 'balanced' },
  '4-4-2': { shape: [4, 4, 2], style: 'classic' },
  '3-3-4': { shape: [3, 3, 4], style: 'attacking' },
};
```

---

## 🎬 Common Scenarios

### Simulate Match & Get Results
```typescript
async function playMatch(fixture) {
  const engine = new MatchEngine();
  await engine.initializeMatch(setupFromFixture(fixture));

  const result = await new Promise(resolve => {
    engine.on('match-finished', resolve);
  });

  engine.startMatch();

  return result;
}
```

### Get Player Performance
```typescript
engine.on('match-finished', (result) => {
  const allPlayers = [
    ...result.matchState.homeTeam.players,
    ...result.matchState.awayTeam.players
  ];

  allPlayers.forEach(player => {
    console.log(`${player.firstName}: ${player.liveRating.toFixed(1)}/10 - ${player.goals} goals`);
  });
});
```

### Get Top Performers
```typescript
const rater = new PlayerRater();
const allPlayers = [...homeTeam.players, ...awayTeam.players];
const topPlayers = rater.getPlayersByRating(allPlayers).slice(0, 5);
const { bestPlayer, worstPlayer } = rater.getPerformanceExtremes(allPlayers);
```

### Generate Match Report
```typescript
engine.on('match-finished', (result) => {
  const report = new MatchAnalytics().generateMatchReport(result.analytics);
  console.log(report);

  // Export report
  const csv = new EventRecorder(result.events).exportAsCSV();
  const json = new EventRecorder(result.events).exportAsJSON();
});
```

---

## 🐛 Debugging

```typescript
// Check match state
console.log(engine.getMatchState());

// Check events generated
engine.on('match-event', (event) => {
  console.log(`[${event.minute}'] ${event.type}: ${event.description}`);
});

// Check player ratings in real-time
engine.on('match-update', (state) => {
  console.log('Home team avg rating:',
    state.homeTeam.players
      .filter(p => p.onPitch)
      .reduce((sum, p) => sum + p.liveRating, 0) / 11
  );
});

// Check analytics
engine.on('match-finished', (result) => {
  const { homeStats, awayStats } = result.analytics;
  console.log('Home team stats:', homeStats);
  console.log('Away team stats:', awayStats);
});
```

---

## 🚀 Next: Integration with Manager Mode

1. Load fixture from database
2. Create lineup (top 11 + subs)
3. Set formation and tactics
4. Initialize match
5. Display MatchContainer
6. Wait for match-finished event
7. Save results to database
8. Update league table
9. Update player stats
10. Show match summary

See `IMPLEMENTATION_GUIDE.md` for detailed integration steps.

---

## 📚 Documentation Files

- `README.md` - Complete feature list & formulas
- `IMPLEMENTATION_GUIDE.md` - Database integration
- `MATCH_ENGINE_SUMMARY.md` - Architecture overview
- `QUICK_START.md` - This file

---

## ❓ FAQ

**Q: How fast is the simulation?**
A: 90 minutes in ~15-20 seconds at default settings. Configurable via `timeStep`.

**Q: Can I control user team during match?**
A: Yes, via substitutions and tactical changes. Formation changes coming soon.

**Q: How realistic are the events?**
A: Weighted by match dynamics. Scoring ~0.5-2 goals per match typical.

**Q: Can I export match data?**
A: Yes, JSON and CSV export available via EventRecorder.

**Q: Does it work with my database?**
A: Yes, returns match results you can save to database.

**Q: Can I play matches automatically?**
A: Yes, integrate with CalendarEngine for automatic progression.

---

## 💪 You're Ready!

Start with `QUICK_START` examples, move to `IMPLEMENTATION_GUIDE` for integration, then `README` for advanced features. Happy simulating! ⚽🎮
