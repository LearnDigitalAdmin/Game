# Football Legacy: Comprehensive Tactics System Guide

## Overview

A hyper-realistic, FIFA/FM-caliber tactical system featuring:

- **5 Modern Formations** (4-3-3, 4-2-3-1, 3-5-2, 5-3-2, 4-4-2)
- **22+ Player Roles** with position-specific behavior
- **Dynamic Player Positioning** with drag-and-drop customization
- **Realistic Constraints** (injuries, suspensions, fatigue)
- **Opponent AI** with formation counter-play and in-match adaptation
- **Tactical Impact** on match outcomes, morale, fatigue, and events
- **Professional-Grade Architecture** with full integration to match engine

---

## 1. Formation System

### Available Formations

```typescript
// 4-3-3 Attacking (Most Balanced)
// Wide formation with active wing play
// Strengths: Balanced defense, creative midfield, attacking width
// Weaknesses: Vulnerable on flanks, midfield can be overrun

// 4-2-3-1 Balanced (Most Stable)
// Two defensive midfielders, balanced midfield
// Strengths: Strong midfield control, defensive security
// Weaknesses: Less dynamic in attack

// 3-5-2 Aggressive (Wing-backs Active)
// Three center-backs, attacking wing-backs
// Strengths: Creative width, aggressive pressing
// Weaknesses: Exposed flanks if wing-backs caught high

// 5-3-2 Defensive (Ultra Cautious)
// Five defenders, three midfielders, two strikers
// Strengths: Defensive solidity, counter-attack threat
// Weaknesses: Lacks attacking dominance, vulnerable to possession

// 4-4-2 Classic (Direct Play)
// Two strikers, wide midfielders
// Strengths: Target man play, direct attacking
// Weaknesses: Vulnerable to modern passing patterns
```

### Formation Data

```typescript
interface Formation {
  id: string;
  name: string; // Human-readable name
  code: string; // Formation code: "433", "4231", etc.

  // Physical formation shape
  compactness: number; // 0-100: how tightly packed defensively
  width: number; // 0-100: formation spread
  depth: number; // 0-100: how deep the shape sits

  // Attacking characteristics
  attack_width: number; // 0-100: how wide attacking is
  passing_style: 'short' | 'mixed' | 'long';
  build_up_play: 'slow' | 'balanced' | 'fast';

  // Positions (11 players)
  positions: FormationPosition[];
}
```

---

## 2. Player Roles (22+ Different Types)

### Goalkeeper Roles
- **GK_SWEEPER**: Aggressive, comes off line, high positioning
- **GK_DISTRIBUTOR**: Focuses on ball distribution, starts attacks
- **GK_STANDARD**: Classic goalkeeper, stays in goal
- **GK_STOPPER**: Conservative, stays in goal line

### Defender Roles
- **CB_DEFENDER**: Pure defender, physical, aggressive
- **CB_LIBERO**: Ball-playing center-back, starts attacks
- **CB_STOPPER**: Physical, aggressive, pure defense
- **LB_DEFENDER**: Traditional left-back, defensive focus
- **LB_WING_BACK**: Wide attacking left-back role
- **LB_INVERTED**: Cuts inside, plays as 4th midfielder
- **RB_DEFENDER**: Traditional right-back, defensive focus
- **RB_WING_BACK**: Wide attacking right-back role
- **RB_INVERTED**: Cuts inside, plays as 4th midfielder

### Midfielder Roles
- **DM_ANCHOR**: Deep midfielder, pure defense, covers space
- **DM_BOX_TO_BOX**: Defensive mid who runs box-to-box
- **CM_PASSER**: Passing-focused central midfielder
- **CM_PLAYMAKER**: Creative central midfielder, takes risks
- **CM_BALL_WINNER**: Physical midfielder, wins the ball
- **AM_CREATOR**: Attacking midfielder, chance creation focus
- **AM_SHADOW_ST**: Between midfielder and striker
- **LM_WINGER**: Left wing, wide attacking role
- **LM_PLAYMAKER**: Left midfielder, creative role
- **RM_WINGER**: Right wing, wide attacking role
- **RM_PLAYMAKER**: Right midfielder, creative role

### Forward Roles
- **ST_STRIKER**: Pure striker, finishing focus
- **ST_TARGET_MAN**: Physical striker, hold-up play
- **ST_DEEP_LYING**: Drops deep to link play
- **ST_POACHER**: Inside-box predator, pure finishing
- **CF_FALSE_9**: Drops between lines, creates space
- **CF_SECOND_ST**: Between two strikers, support role

---

## 3. Tactical Settings

Each formation can be customized with tactical instructions:

```typescript
interface Tactics {
  // Core mentality (defines several other settings)
  mentality: 'ultra_defensive' | 'defensive' | 'balanced' | 'attacking' | 'ultra_attacking';

  // Speed of play
  tempo: 0-100; // 30=slow, 60=moderate, 90=fast

  // Defensive approach
  pressure: 'low' | 'medium' | 'high' | 'gegenpressing';
  def_line: 'deep' | 'normal' | 'high'; // Defensive line positioning

  // Possession philosophy
  possession_style: 'possession' | 'balanced' | 'counter_attack';
  ball_recovery: 'aggressive' | 'balanced' | 'patient';
  passing_length: 'short' | 'mixed' | 'long';

  // Set pieces
  corner_delivery: 'near_post' | 'far_post' | 'mixed' | 'short';
  free_kick_delivery: 'direct' | 'layoff' | 'mixed';
  throw_in_direction: 'forward' | 'sideways' | 'backward';

  // Attacking options
  through_balls: 'rare' | 'occasional' | 'frequent';
  wing_play: 'minimal' | 'balanced' | 'heavy';
  crosses: 'rare' | 'occasional' | 'frequent';
  long_balls: 'rare' | 'occasional' | 'frequent';
  counter_attacks: 'rare' | 'occasional' | 'frequent';
}
```

### Mentality Impact

```
Ultra Defensive (0-20)
├─ Tempo: 30
├─ Pressure: Low
├─ Def Line: Deep
├─ Counter Attack: Frequent
├─ Morale: -10% (boring play)
└─ Fatigue Rate: 0.6x (less running)

Defensive (20-40)
├─ Tempo: 45
├─ Pressure: Medium
├─ Def Line: Deep
├─ Counter Attack: Frequent
├─ Morale: -5%
└─ Fatigue Rate: 0.75x

Balanced (40-60)
├─ Tempo: 60
├─ Pressure: Medium
├─ Def Line: Normal
├─ Counter Attack: Occasional
├─ Morale: 0% (neutral)
└─ Fatigue Rate: 1.0x

Attacking (60-80)
├─ Tempo: 75
├─ Pressure: High
├─ Def Line: High
├─ Counter Attack: Rare
├─ Morale: +8% (exciting play)
└─ Fatigue Rate: 1.2x (more running)

Ultra Attacking (80-100)
├─ Tempo: 90
├─ Pressure: Gegenpressing
├─ Def Line: High
├─ Counter Attack: None
├─ Morale: +15% (very exciting)
└─ Fatigue Rate: 1.4x (extensive running)
```

---

## 4. Match Engine Integration

### How Tactics Affect Match Simulation

#### Formation Compactness (0-100)
- **50**: Balanced spacing
- **70**: Compact, harder to break through
- **85**: Ultra-compact, defensive shield
- **Impact**: Pass success rate, shot difficulty, defensive pressure

#### Defensive Line Height (0-100)
- **30**: Deep defense (own half)
- **55**: Normal (defensive third)
- **80**: High press (attacking third)
- **Impact**: Offside trap effectiveness, vulnerability to through balls

#### Wing Utilization (0-100)
- **50**: Minimal wing play, central focus
- **70**: Balanced use of wings
- **85**: Heavy wing play, constant crosses
- **Impact**: Crossing frequency, shot location, team width

#### Pressing Intensity (0-100)
- **25**: Low press (only in own box)
- **50**: Medium press (transition)
- **75**: High press (win ball high)
- **95**: Gegenpressing (immediate counter-press)
- **Impact**: Ball recovery, interception rate, defensive pressure

#### Tempo/Possession (0-100)
- **30**: Slow, deliberate buildup
- **60**: Balanced, natural rhythm
- **90**: Fast, quick transitioning
- **Impact**: Event generation frequency, passing accuracy

### Player Position Bonuses/Penalties

```typescript
// Playing in natural position: +0.5 rating bonus
ST playing as Striker: +0.5
CM playing as CM: +0.5

// Playing in unfamiliar position: 0 to -0.5 bonus
CB playing as DM: 0.0 (neutral)
LB playing as LM: -0.2 (awkward)
CM playing as CB: -0.5 (very awkward)

// Role-specific formation bonuses
Wing-backs in 3-5-2: +0.2 (formation suits role)
Target man in 4-4-2: +0.3 (classic pairing)
False 9 in 4-3-3: +0.1 (allows space)
```

### Tactical Advantage Calculation

```
Advantage = Mentality Matchup + Formation Matchup + Pressure Matchup

Mentality Matchups:
- Ultra Defensive vs Ultra Attacking: +20 advantage
- Defensive vs Balanced: +8 advantage
- Balanced vs Balanced: 0 advantage
- Attacking vs Defensive: +15 advantage
- Ultra Attacking vs Defensive: +20 advantage

Formation Matchups:
- 3-5-2 (width) vs 4-2-3-1 (central): +10 advantage
- 5-3-2 (defensive) vs 4-3-3 (attacking): +12 advantage
- 4-2-3-1 (control) vs 4-4-2 (direct): +8 advantage

Pressure Matchups:
- Gegenpressing vs Counter-attack: +10 advantage
- High press vs Long ball: +8 advantage
- Low press vs Possession: +8 advantage

Total Range: -50 to +50 tactical advantage
Application: Affects shot conversion, goal probability, morale
```

---

## 5. Player Constraints & Availability

### Injury System

```typescript
// Injury types and recovery times
Muscular: 2-4 weeks (30% reinjury risk at return)
Ligament: 4-8 weeks (50% reinjury risk at return)
Bone: 6-12 weeks (40% reinjury risk at return)
Concussion: 1-2 weeks (35% reinjury risk at return)

// Players must reach minimum fitness (70%) before playing
// Reinjury risk decreases as more time passes
// Automatic return after full recovery time
```

### Suspension System

```typescript
// Card accumulation
2 Yellow Cards = Red Card = 1 match ban
Red Card Direct = 3 match minimum ban

// Suspension logic
After red card: Automatic ban next match
Multiple reds in season: 3-10 match bans
Dangerous play: 5+ match bans

// Players cannot be selected in lineup during ban
```

### Fatigue System

```typescript
// Rest requirements
Minimum: 2 days between matches
Recommended: 3+ days for optimal performance
High tempo/mentality: Requires more rest

// Fatigue accumulation
After 90 minutes: Full fatigue reset needs 72 hours
Repeated matches: Fatigue compounds
Above 85% fatigue: Risk of injury increases

// Substitutes help manage fatigue
Fresh legs in final 20 minutes: -10% fatigue rate
Extended rest: -15% fatigue
Heavy rotation: Squad maintains energy
```

---

## 6. Opponent AI System

### Auto-Tactical Generation

The AI opponent automatically selects:

```typescript
// 1. Counter-Formation Selection
If User plays 4-3-3 → AI selects 4-2-3-1 (midfield control)
If User plays 5-3-2 → AI selects 4-3-3 (direct attacking)
If User plays 4-2-3-1 → AI selects 4-3-3 (width)

// 2. Mentality Selection (based on player quality)
Average rating 80+, form 70+: Attacking mentality
Average rating 75+, form 60+: Balanced mentality
Average rating 72+, form 55+: Defensive mentality
Below 72: Ultra Defensive mentality

// 3. Player Assignment
1. Sort available players by position match (quality/form)
2. Exclude injured/suspended players
3. Fill positions optimally
4. Select best XI from available
```

### In-Match Tactical Adjustments

```typescript
// Minute 0-20
If leading: Keep tactics
If losing: Become slightly more attacking (if not already)

// Minute 45 (Halftime)
Assess performance: Change if tactics failing
Tactical analysis: Better formation selection

// Minute 60-70
If still losing: Become more attacking
If still leading: Become more defensive
Adapt to match state

// Minute 75+
If level late: Push for winner (attacking)
If losing: All-out attack
If winning: Solidify defense

// Minute 85+
Final push: Desperate for goal if needed
Defensive wall: If protecting lead
```

---

## 7. Usage Examples

### Creating User Tactics

```typescript
const tacticsSystem = new TacticsSystem(db);

// Create 4-3-3 attacking formation
const tactics = await tacticsSystem.createUserTactics(
  'club_arsenal',
  '433',
  'Arsenal Attacking Formation',
  [
    { id: 'player_1', shirtNumber: 1, role: 'GK_DISTRIBUTOR' },
    { id: 'player_2', shirtNumber: 2, role: 'RB_DEFENDER' },
    { id: 'player_3', shirtNumber: 3, role: 'CB_DEFENDER' },
    { id: 'player_4', shirtNumber: 4, role: 'CB_DEFENDER' },
    { id: 'player_5', shirtNumber: 5, role: 'LB_DEFENDER' },
    { id: 'player_6', shirtNumber: 6, role: 'CM_PLAYMAKER' },
    { id: 'player_7', shirtNumber: 7, role: 'DM_ANCHOR' },
    { id: 'player_8', shirtNumber: 8, role: 'CM_BALL_WINNER' },
    { id: 'player_9', shirtNumber: 9, role: 'ST_STRIKER' },
    { id: 'player_10', shirtNumber: 10, role: 'LM_WINGER' },
    { id: 'player_11', shirtNumber: 11, role: 'RM_WINGER' },
  ],
  'attacking'
);
```

### Checking Player Availability

```typescript
// Get available players
const available = await tacticsSystem.getAvailablePlayers('club_arsenal');

// Check individual player
const availability = await tacticsSystem.checkPlayerAvailability('player_1');
console.log(availability);
// {
//   playerId: 'player_1',
//   isAvailable: true,
//   reason: 'healthy'
// }

// Get unavailable players
const unavailable = await tacticsSystem.getUnavailablePlayers('club_arsenal');
// Shows injured, suspended, fatigued players
```

### Validating Lineup

```typescript
const validation = await tacticsSystem.validateLineup(
  'club_arsenal',
  ['player_1', 'player_2', ..., 'player_11'] // 11 players
);

if (!validation.isValid) {
  console.error('Lineup issues:', validation.violations);
  // Output: ['player_3: injured', 'player_7: suspended']
}

if (validation.warnings.length > 0) {
  console.warn('Lineup warnings:', validation.warnings);
  // Output: ['player_5: High reinjury risk (75%)']
}
```

### Generating Opponent Tactics

```typescript
const opponentTactics = await tacticsSystem.generateOpponentTactics(
  'club_manchester',
  '433', // user formation
  'attacking', // user mentality
  opponentPlayers // opponent squad with rating/form
);

console.log(opponentTactics.formation_id); // e.g., '4231'
console.log(opponentTactics.mentality); // e.g., 'defensive'
```

### In-Match Tactical Adjustments

```typescript
const adjustment = await tacticsSystem.adjustOpponentTactics(
  matchId,
  homeScore, // 1
  awayScore, // 0
  minute, // 60
  false, // not home team (away)
  currentTactics
);

console.log(adjustment.shouldChangeTactics); // true
console.log(adjustment.newMentality); // 'attacking'
console.log(adjustment.reason); // 'Trailing by one goal'
```

---

## 8. React Components

### Formation View (Drag-Drop Pitch)

```typescript
import { FormationView } from '@/global/tactics/TacticsUIComponents';

<FormationView
  formation={selectedFormation}
  selectedPlayers={playerPositions} // Map<slot, playerId>
  onPlayerSelect={(slot, playerId) => {}}
  onPlayerDrop={(slot, playerId) => {}}
  availablePlayers={clubPlayers}
/>
```

### Tactics Settings Panel

```typescript
import { TacticsSettingsPanel } from '@/global/tactics/TacticsUIComponents';

<TacticsSettingsPanel
  mentality="balanced"
  tempo={60}
  pressure="medium"
  defLine="normal"
  onMentalityChange={(value) => {}}
  onTempoChange={(value) => {}}
  onPressureChange={(value) => {}}
  onDefLineChange={(value) => {}}
/>
```

### Lineup Manager (Subs Interface)

```typescript
import { LineupManager } from '@/global/tactics/TacticsUIComponents';

<LineupManager
  currentLineup={onPitchPlayers}
  substitutes={benchPlayers}
  availablePlayers={playerDetails}
  onSubstitution={(playerOut, playerIn) => {}}
/>
```

### Formation Selector

```typescript
import { FormationSelector } from '@/global/tactics/TacticsUIComponents';

<FormationSelector
  formations={allFormations}
  selectedFormation={currentFormation}
  onFormationSelect={(formation) => {}}
/>
```

---

## 9. Database Schema

### Key Tables

```sql
formations
├─ id, name, code
├─ compactness, width, depth
├─ attack_width, passing_style, build_up_play

formation_positions
├─ formation_id, position_slot
├─ position_name, position_type, role
├─ x_position, y_position
├─ width_range, depth_range
├─ press_height, marking_style

tactics
├─ id, club_id, season
├─ formation_id, name
├─ mentality, tempo, pressure, def_line
├─ possession_style, ball_recovery, passing_length
├─ corner_delivery, free_kick_delivery
├─ through_balls, wing_play, crosses, long_balls, counter_attacks

player_tactical_assignments
├─ tactic_id, player_id
├─ shirt_number, position_slot, role
├─ x_override, y_override

player_instructions
├─ assignment_id
├─ instruction_type (stay_wide, cut_inside, get_forward, etc.)
├─ enabled, intensity

tactical_adjustments
├─ match_id, minute_made
├─ adjustment_type, from_formation, to_formation
├─ reason, impact_assessment

opposition_analysis
├─ match_id, opponent_club_id
├─ avg_formation, typical_mentality
├─ weaknesses, recommendations
├─ confidence_level

player_positional_profiles
├─ player_id, position
├─ role_suitability (for each role 0-100)
├─ preferred_foot, pace, shooting, passing, dribbling, defense, physical
├─ aggression, positioning, distribution
├─ work_rate, mentality
├─ formations_played
```

---

## 10. API Reference

### TacticsSystem (Main Orchestrator)

```typescript
// Initialization
await tacticsSystem.initialize();

// User tactics
await createUserTactics(clubId, formationCode, name, players, mentality);
await getClubTactics(clubId);

// Formations
await getAvailableFormations();
await getFormation(code);

// Player management
await checkPlayerAvailability(playerId);
await getAvailablePlayers(clubId);
await getUnavailablePlayers(clubId);
await validateLineup(clubId, lineupPlayerIds);
await getSuggestedPlayers(clubId, position, limit);

// Opponent AI
await generateOpponentTactics(opponentClubId, userFormation, userMentality, players);
await adjustOpponentTactics(matchId, homeScore, awayScore, minute, isHome, tactics);

// Player injuries/suspensions
await injurePlayer(playerId, injuryType, durationWeeks);
await suspendPlayer(playerId, matches);
await clearPlayerStatus(playerId);
```

### MatchTacticalIntegration

```typescript
// Setup
await setupTeamTacticalState(matchState, team, tactics, formation);

// Modifiers
calculateTacticalAdvantage(homeTeamState, awayTeamState);
applyTacticalModifiersToPlayer(player, role, tacticalState, isHome);

// Logging
await logTacticalAdjustment(matchId, minute, adjustment);
```

---

## 11. Performance Metrics

```
Formation Impact on Match Outcome:
├─ 4-3-3: +2% goal probability vs 5-3-2
├─ 4-2-3-1: +1% possession control vs 4-4-2
├─ 3-5-2: +3% wing crossing vs 4-2-3-1
├─ 5-3-2: +8% defensive solidity vs 4-3-3
└─ 4-4-2: +5% target man effectiveness vs 4-2-3-1

Mentality Impact on Player Stats:
├─ Ultra Defensive: +20% tackle success, -15% shot quality
├─ Defensive: +12% interceptions, -10% creativity
├─ Balanced: 0% modifier (baseline)
├─ Attacking: +15% shot quality, -10% defensive pressure
└─ Ultra Attacking: +25% shot quality, -25% defensive pressure

Tactical Advantage Impact:
└─ Every +10 tactical advantage: +2% goal probability
```

---

## 12. Best Practices

### Formation Selection
- Against possession: Use 5-3-2 for defensive solidity
- Against direct play: Use 4-2-3-1 for midfield control
- Against wing play: Use compact formations (4-2-3-1, 5-3-2)
- For counter-attack: Use 4-3-3 or 4-4-2 with space

### Mentality Selection
- Leading late: Drop to Defensive (protect lead)
- Trailing late: Attack (push for winner)
- Early season: Balanced (learn opposition)
- Critical matches: Tactical setup vs opponent

### Player Role Assignment
- Match to natural position when possible (+0.5 bonus)
- Use wing-backs in 3-5-2/5-3-2
- Pair target man with two strikers in 4-4-2
- Deep-lying forward creates space in 4-3-3

### Constraint Management
- Rotate heavily (avoid fatigue)
- Manage suspensions (card awareness)
- Return injured players gradually
- Monitor reinjury risk (>60% risk = bench player)

---

## Summary

The tactical system provides:

✅ **5 Modern Formations** with realistic strengths/weaknesses
✅ **22+ Player Roles** with position-specific behavior
✅ **Drag-Drop Customization** for easy formation setup
✅ **Realistic Constraints** (injuries, suspensions, fatigue)
✅ **Opponent AI** with smart counter-formation selection
✅ **Match Integration** affecting outcomes realistically
✅ **Professional Architecture** suitable for production use

All systems are fully integrated and ready for implementation.
