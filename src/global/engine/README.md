# ⚽ Football Legacy - Match Engine

A comprehensive, production-grade football match simulation engine built with TypeScript and React. Featuring realistic physics, probabilistic events, live player ratings, and interactive 2D visualization.

## 🏗️ Architecture Overview

```
src/global/engine/
├── MatchEngine.ts              # Main orchestrator
├── types/MatchTypes.ts         # Complete type definitions
├── simulation/
│   ├── MatchSimulator.ts       # Physics & position tracking
│   ├── EventGenerator.ts       # Probabilistic events
│   └── TacticsResolver.ts      # Formation logic
├── performance/
│   ├── PlayerRater.ts          # Live player ratings (0-10)
│   ├── FormCalculator.ts       # Form & consistency
│   └── DevelopmentTracker.ts   # Long-term progression
├── visualizer/
│   ├── PitchRenderer.tsx       # 2D canvas-based pitch
│   ├── AnimationEngine.ts      # Smooth animations
│   └── HighlightManager.ts     # Clip generation
├── analytics/
│   ├── MatchAnalytics.ts       # Advanced stats
│   ├── EventRecorder.ts        # Event logging
│   └── ReplayManager.ts        # Replay system
├── hooks/
│   └── useMatchEngine.ts       # React integration hook
├── MatchContainer.tsx           # Main UI component
└── README.md                    # This file
```

## 🎮 Core Features

### Match Simulation
- **Minute-by-minute progression** with realistic match flow
- **Possession-based** simulation affecting event probability
- **Momentum tracking** influencing team performance
- **Dynamic difficulty** scaling based on team ratings
- **Real-time ball physics** with friction and boundaries

### Event Generation
- **Probabilistic events** weighted by match situation
- **Smart event generation**:
  - 35% Pass events
  - 20% Defensive actions (tackles, intercepts)
  - 20% Shots
  - 10% Fouls/Yellow cards
  - 10% Set pieces (corners, free kicks)
  - 5% Special events (injuries, red cards)

- **Event types**:
  - Goals, shots, passes, tackles, fouls
  - Yellow/red cards, injuries, substitutions
  - Corners, free kicks, throw-ins
  - Momentum shifts, crowd moments

### Player Performance
- **Live ratings** (0-10 scale) updated every minute
- **Rating factors**:
  - Form (player's recent performance)
  - Fatigue (increases as match progresses)
  - Morale (affected by team performance)
  - Match fitness (vs injury/suspension)
  - Opposition quality
  - Weather conditions

- **Performance metrics**:
  - Passes, pass accuracy, key passes
  - Tackles, interceptions, clearances
  - Shots, shots on target, goals, assists
  - Dribbles, aerials, physical contact
  - Positional impact scoring

### Player Development
- **Aging system** with position-specific peak ages:
  - Goalkeepers: 32 years old
  - Defenders: 28-30 years old
  - Midfielders: 27-29 years old
  - Forwards: 26-28 years old

- **Rating progression**:
  - Younger players develop faster
  - Rating increases/decreases based on performance
  - Potential cap preventing unrealistic growth
  - Declining phase post-peak

- **Form tracking**:
  - Rolling 5-match form average
  - Momentum calculation from recent matches
  - Consistency measurement
  - Form trend analysis (improving/stable/declining)

### Visualization
- **2D Canvas-based pitch** (1:1 scale)
- **Real-time player positions** with velocity vectors
- **Ball physics** visualization
- **Team formation** display
- **Camera modes**:
  - Wide view (entire pitch)
  - Zoomed (tactical detail)
  - Player-focused (follow selected player)

- **Interactive elements**:
  - Click to select players
  - View player stats in real-time
  - Substitution interface
  - Formation changes

### Match Analytics
- **Advanced statistics**:
  - Expected Goals (xG) calculation
  - Possession analysis
  - Shot maps and pass networks
  - Heat maps (team and individual)
  - Momentum swing identification

- **Tactical analysis**:
  - Formation changes tracking
  - Substitution impact assessment
  - Pressing intensity measurement
  - Counterattack effectiveness

### Highlights & Replays
- **Automatic highlight detection** for:
  - Goals
  - Shots on target
  - Red cards
  - Injuries
  - Set pieces

- **Highlight compilation** (automatic best moments)
- **Replay system** with frame-by-frame playback
- **Slow-motion** replay capability
- **Multiple camera angles** support

### Tactical System
- **Formations**: 4-3-3, 3-5-2, 5-3-2, 4-2-3-1, etc.
- **Formation shapes**: [Defenders, Midfielders, Forwards]
- **Tactical styles**:
  - Attacking, Balanced, Defensive
  - High press, Medium press, Low block
  - Possession-based, Direct, Build-up play

- **In-match tactical changes**:
  - Formation adjustments
  - Pressing intensity changes
  - Mentality switching (attacking/defensive)
  - Defensive line depth adjustment

## 📊 Statistics & Metrics

### Team Statistics Tracked
- Goals, shots, shots on target
- Passes, pass accuracy, key passes
- Tackles, interceptions, clearances, saves
- Fouls, yellow cards, red cards
- Corners, free kicks, offsides
- Possession %, injury time

### Player Statistics Tracked
- Matches played, minutes played
- Touches, passes, pass accuracy
- Shots, shots on target, goals, assists
- Tackles, interceptions, dribbles
- Fouls, yellow cards, red cards
- Average rating, form, consistency

## 🎯 Usage

### Initialize Match
```typescript
const engine = new MatchEngine();

const setup: MatchSetup = {
  fixture: {
    id: 'match_001',
    homeClubId: 'club_1',
    awayClubId: 'club_2',
    // ... other fixture data
  },
  homeLineup: {
    players: [...],
    substitutes: [...],
    formation: { shape: [4, 3, 3], style: 'attacking', ... }
  },
  awayLineup: {...},
  userTeamId: 'club_1'
};

await engine.initializeMatch(setup);
```

### Start & Control Match
```typescript
engine.startMatch();
// ... match runs...
engine.pause();
engine.resume();

// Perform substitution
await engine.performSubstitution(playerOutId, playerInId);
```

### Listen to Events
```typescript
engine.on('match-event', (event) => {
  console.log(`${event.minute}' - ${event.description}`);
});

engine.on('goal', (event) => {
  console.log('⚽ GOAL!');
});

engine.on('match-finished', (result) => {
  console.log(`Final: ${result.finalScore.home} - ${result.finalScore.away}`);
});
```

### React Hook
```typescript
const { matchState, isRunning, startMatch, pauseMatch, performSubstitution } = useMatchEngine({
  onMatchUpdate: (state) => console.log(state),
  onEvent: (event) => console.log(event),
  onFinished: (result) => console.log(result)
});
```

## 🎨 UI Components

### MatchContainer
Main match UI wrapper orchestrating all systems.

```tsx
<MatchContainer
  setup={matchSetup}
  onMatchComplete={(result) => {...}}
  onClose={() => {...}}
/>
```

### PitchRenderer
2D canvas-based pitch visualization.

```tsx
<PitchRenderer
  matchState={matchState}
  playerPositions={positions}
  ballPosition={ballPos}
  selectedPlayerId={selected}
  onPlayerSelect={setSelected}
  cameraMode="wide"
/>
```

## 🔢 Mathematical Formulas

### Player Rating Calculation
```
baseRating = (playerRating / 100) * 10
ratingFactors = {
  form: (form / 100) * 2 - 1,
  fatigue: -(fatigue / 100) * 2,
  morale: (morale / 100) * 1,
  matchFitness: (fitness / 100) * 1,
  opposition: opposition_modifier,
  weather: weather_modifier
}
liveRating = baseRating + sum(ratingFactors)
```

### Expected Goals (xG)
```
baseXG = shotsOnTarget * 0.12
qualityMultiplier = (avgPlayerRating / 7) * 1.5
totalXG = baseXG * qualityMultiplier
```

### Market Value (Player Transfer Value)
```
baseValue = (rating/20)^2.8 * 100000
ageModifier = varies by age
positionModifier = varies by position
finalValue = baseValue * ageModifier * positionModifier
```

### Experience Gain
```
baseExperience = minutesPlayed * 0.5
performanceBonus = max(0, (rating - 5) * 5)
eventBonus = (goals + assists) * 10 + tackles * 2
totalExperience = baseExperience + performanceBonus + eventBonus
```

## ⚙️ Configuration

### SimulationConfig
```typescript
{
  timeStep: 16,           // MS per update (60 FPS)
  eventsPerMinute: 5,    // Discrete events per game minute
  realism: 'realistic',  // arcade | semi-realistic | realistic | ultra-realistic
  injuryRate: 0.15,      // 15% chance per update
  yellowCardRate: 0.25,  // 25% rate
  randomness: 50         // 0-100 RNG factor
}
```

## 📈 Performance Considerations

- **Efficient event generation**: Only calculates necessary probabilities
- **Batch updates**: Player stats updated once per minute
- **Canvas optimization**: Single canvas context, efficient drawing
- **Memory management**: Event logs cleaned after match
- **Lazy loading**: Components initialize on demand

## 🚀 Future Enhancements

- [ ] 3D match visualization (Babylon.js)
- [ ] AI referee system with VAR decisions
- [ ] Advanced set piece execution system
- [ ] Manager tactical adjustments mid-game
- [ ] Youth player development path tracking
- [ ] Historical player statistics database
- [ ] Match prediction neural network
- [ ] Multiplayer competitive matches
- [ ] Advanced weather impact simulation
- [ ] Injury recovery simulation with rehabilitation

## 📝 Event Types

### Match Events
- `kickoff`, `half-time`, `full-time`, `extra-time-start`, `penalty-shootout`

### Offensive Events
- `goal`, `assist`, `own-goal`, `shot`, `shot-on-target`, `shot-off-target`, `shot-blocked`

### Passing Events
- `pass`, `miss-pass`, `intercept`

### Defensive Events
- `tackle`, `foul`, `yellow-card`, `red-card`, `injury`

### Set Pieces
- `corner`, `free-kick`, `throw-in`, `goal-kick`

### Tactical Events
- `substitution`, `tactical-change`, `formation-change`

### Environmental Events
- `weather-event`, `crowd-moment`, `momentum-shift`, `possession-change`

## 🔐 Type Safety

Complete TypeScript type definitions for all systems:
- `MatchState` - Full match state
- `MatchPlayer` - Player with live stats
- `MatchEvent` - All event types
- `Formation` - Tactical setup
- `PlayerDevelopment` - Career progression
- `MatchAnalytics` - Match statistics
- `HighlightClip` - Replay data

## 📄 License

Part of Football Legacy - Sports Management Simulator
