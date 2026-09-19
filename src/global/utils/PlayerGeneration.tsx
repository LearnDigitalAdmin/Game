// PlayerGenerator.tsx - Football Management Game Player Generation Module
import { v4 as uuidv4 } from 'uuid';

// ===== INTERFACES =====

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  countryId: string;
  clubId: string | null; // null for free agents
  position: Position;
  secondaryPosition: Position | null;
  rating: number; // 0-100
  potential: number; // 0-100
  value: number; // market value in euros
  wage: number; // weekly wage in euros
  height: number; // cm
  weight: number; // kg
  foot: 'Left' | 'Right' | 'Both';
  personality: Personality;
  form: number; // 0-100
  injuries: Injury[];
  history: PlayerHistory[];
  // Add the missing properties
  morale?: number;
  fitness?: number;
  matchSharpness?: number;
  // Present in the `players` table from the start but previously undeclared
  // here — contract end date, ISO string.
  contractEnd?: string | null;
  // Added by the tactics-availability migration (Save.tsx).
  status?: 'active' | 'injured' | 'suspended' | 'retired';
  injuryType?: string | null;
  injuryDurationWeeks?: number;
  yellowCards?: number;
  lastMatchDate?: string | null;
  suspensionEndDate?: string | null;
  // Added by the financial/loans migration (Save.tsx) — set while a player
  // is out on loan; clubId holds the borrowing club, this holds the real owner.
  onLoanFromClubId?: string | null;
  loanReturnDate?: string | null;
}

export interface Injury {
  type: InjuryType;
  severity: 'Minor' | 'Moderate' | 'Major';
  duration: number; // days remaining
  recurring: boolean;
}

export interface PlayerHistory {
  season: string;
  clubId: string;
  stats: {
    appearances: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  };
}

export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST';

export type Personality = 
  | 'Professional' | 'Ambitious' | 'Loyal' | 'Temperamental' | 'Leader'
  | 'Quiet' | 'Determined' | 'Mercenary' | 'Team Player' | 'Maverick';

export type InjuryType = 
  | 'Muscle Strain' | 'Ligament Damage' | 'Fracture' | 'Concussion'
  | 'Ankle Sprain' | 'Knee Injury' | 'Hamstring' | 'Groin Strain';

interface Club {
  id: string;
  name: string;
  divisionId: string;
  countryId: string;
  rank: number;
  status: string;
  balance: string;
}

interface Country {
  id: string;
  name: string;
  federationId: string;
  continentFedId: string;
  rank: number;
}

interface PlayerNames {
  [countryId: string]: {
    firstNames: string[];
    lastNames: string[];
  };
}

interface GenerationConfig {
  playersPerClub: number;
  freeAgentCount: number;
  currentSeason: string;
  injuryProbability: number; // 0-1
}

// ===== CONSTANTS =====

const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

const PERSONALITIES: Personality[] = [
  'Professional', 'Ambitious', 'Loyal', 'Temperamental', 'Leader',
  'Quiet', 'Determined', 'Mercenary', 'Team Player', 'Maverick'
];

const INJURY_TYPES: InjuryType[] = [
  'Muscle Strain', 'Ligament Damage', 'Fracture', 'Concussion',
  'Ankle Sprain', 'Knee Injury', 'Hamstring', 'Groin Strain'
];

// Fallback names for countries not in JSON or as backup
const FALLBACK_NAMES = {
  firstNames: [
    // International/Common names
    'Alex', 'David', 'Michael', 'John', 'James', 'Daniel', 'Robert', 'Paul', 'Mark', 'Andrew',
    'Chris', 'Matt', 'Tom', 'Ben', 'Sam', 'Luke', 'Adam', 'Ryan', 'Kevin', 'Jason',
    // African names (common across regions)
    'Emmanuel', 'Joseph', 'Francis', 'Peter', 'Samuel', 'Stephen', 'Moses', 'Isaac', 'Abraham', 'Benjamin',
    'Collins', 'Dennis', 'George', 'Henry', 'Victor', 'Vincent', 'Patrick', 'Martin', 'Kenneth', 'Anthony'
  ],
  lastNames: [
    // International surnames
    'Johnson', 'Smith', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas',
    'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez',
    // African surnames (common patterns)
    'Mwangi', 'Kiprotich', 'Ochieng', 'Wanjiku', 'Kamau', 'Mutua', 'Omondi', 'Kiplagat', 'Njoroge', 'Wanjala',
    'Otieno', 'Karanja', 'Macharia', 'Kiptoo', 'Cheruiyot', 'Rotich', 'Bett', 'Too', 'Koech', 'Langat'
  ]
};

// Position distribution per squad (percentages)
const POSITION_DISTRIBUTION = {
  GK: 0.12,   // ~3 players
  CB: 0.20,   // ~5 players
  LB: 0.08,   // ~2 players
  RB: 0.08,   // ~2 players
  CDM: 0.12,  // ~3 players
  CM: 0.16,   // ~4 players
  CAM: 0.08,  // ~2 players
  LW: 0.08,   // ~2 players
  RW: 0.08,   // ~2 players
  ST: 0.12    // ~3 players
};

// Secondary position mapping
const SECONDARY_POSITIONS: { [key in Position]: Position[] } = {
  GK: [], // Goalkeepers rarely play outfield
  CB: ['CDM', 'RB', 'LB'],
  LB: ['LW', 'CB', 'CDM'],
  RB: ['RW', 'CB', 'CDM'],
  CDM: ['CM', 'CB'],
  CM: ['CAM', 'CDM', 'LW', 'RW'],
  CAM: ['CM', 'LW', 'RW', 'ST'],
  LW: ['LB', 'CAM', 'ST'],
  RW: ['RB', 'CAM', 'ST'],
  ST: ['CAM', 'LW', 'RW']
};

// Physical attributes by position
const POSITION_PHYSICAL = {
  GK: { height: [180, 200], weight: [55, 95] },
  CB: { height: [180, 200], weight: [55, 90] },
  LB: { height: [170, 185], weight: [55, 80] },
  RB: { height: [170, 185], weight: [55, 80] },
  CDM: { height: [175, 190], weight: [50, 85] },
  CM: { height: [170, 185], weight: [55, 80] },
  CAM: { height: [165, 180], weight: [55, 75] },
  LW: { height: [165, 180], weight: [55, 75] },
  RW: { height: [165, 180], weight: [47, 75] },
  ST: { height: [170, 190], weight: [44, 85] }
};

// ===== UTILITY FUNCTIONS =====

/**
 * Generate random number between min and max (inclusive)
 */
function getPlayerNamesData(): PlayerNames {
  try {
    // Since the data is loaded dynamically in loadGameDataFast, we should receive it as parameter
    // For now, let's create a fallback that works with your JSON structure
    console.log('getPlayerNamesData called - using fallback approach');
    return {};
  } catch (error) {
    console.error('Error loading players data:', error);
    return {};
  }
}

// Updated generateAllPlayers function to properly use the loaded data


// Fixed generatePlayerName function (the structure in your JSON is correct)
function generatePlayerName(countryId: string, playerNames: PlayerNames): { firstName: string; lastName: string } {
  console.log(`Generating name for country: ${countryId}`);
  
  // Get names for this country
  const countryNames = playerNames[countryId];
  
  if (countryNames && countryNames.firstNames && countryNames.lastNames && 
      countryNames.firstNames.length > 0 && countryNames.lastNames.length > 0) {
    
    console.log(`Using names for ${countryId}: ${countryNames.firstNames.length} first, ${countryNames.lastNames.length} last`);
    
    return {
      firstName: randomFromArray(countryNames.firstNames),
      lastName: randomFromArray(countryNames.lastNames)
    };
  }
  
  // Log what we actually received
  console.warn(`No valid names for country ${countryId}. Received:`, countryNames);
  console.warn(`Available countries in data:`, Object.keys(playerNames));
  
  // Use fallback names
  return {
    firstName: randomFromArray(FALLBACK_NAMES.firstNames),
    lastName: randomFromArray(FALLBACK_NAMES.lastNames)
  };
}








function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Select random item from array
 */
function randomFromArray<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Calculate club quality modifier based on rank and status
 */
function getClubQualityModifier(club: Club): number {
  const rankModifier = Math.max(0.3, 1 - (club.rank - 1) / 20); // Top clubs get higher modifier
  const statusModifier = club.status === 'pro' ? 1.0 : 0.75;
  const balanceModifier = club.balance === 'rich' ? 1.1 : club.balance === 'average' ? 1.0 : 0.7;
  
  return rankModifier * statusModifier * balanceModifier;
}

/**
 * Generate age based on position and club quality
 */
function generateAge(position: Position, clubQuality: number): number {
  // Different age profiles by position
  const ageRanges = {
    GK: [16, 38],    // Goalkeepers have longer careers
    CB: [16, 36],    // Center backs peak later
    LB: [18, 34],    // Fullbacks need pace
    RB: [18, 34],
    CDM: [16, 35],   // Defensive midfielders last longer
    CM: [18, 34],
    CAM: [18, 32],   // Attacking midfielders peak earlier
    LW: [17, 32],    // Wingers need pace
    RW: [17, 32],
    ST: [18, 34]     // Strikers have varied careers
  };
  
  const [minAge, maxAge] = ageRanges[position];
  
  // Higher quality clubs tend to have more experienced players
  const experienceBias = clubQuality > 0.7 ? 2 : clubQuality > 0.5 ? 1 : 0;
  
  return randomBetween(minAge + experienceBias, maxAge);
}

/**
 * Calculate base rating based on age, position, and club quality
 */
function calculateBaseRating(age: number, position: Position, clubQuality: number): number {
  // Base rating influenced by club quality (40-85 range typically)
  const clubBase = Math.round(50 + (clubQuality * 35));
  
  // Age curve - different peaks for different positions
  let ageModifier = 1.0;
  
  if (position === 'GK') {
    // Goalkeepers peak later (28-35)
    if (age < 25) ageModifier = 0.7 + (age - 16) * 0.02;
    else if (age <= 35) ageModifier = 1.0;
    else ageModifier = 1.0 - (age - 35) * 0.05;
  } else if (position === 'CB' || position === 'CDM') {
    // Defenders peak 26-32
    if (age < 23) ageModifier = 0.65 + (age - 16) * 0.035;
    else if (age <= 32) ageModifier = 1.0;
    else ageModifier = 1.0 - (age - 32) * 0.04;
  } else {
    // Attackers and wingers peak 22-30
    if (age < 20) ageModifier = 0.6 + (age - 16) * 0.05;
    else if (age <= 30) ageModifier = 1.0;
    else ageModifier = 1.0 - (age - 30) * 0.06;
  }
  
  const baseRating = Math.round(clubBase * ageModifier);
  
  // Add some randomness (-5 to +5)
  return Math.max(30, Math.min(81, baseRating + randomBetween(-5, 5)));
}

/**
 * Calculate potential based on current rating and age
 */
function calculatePotential(currentRating: number, age: number): number {
  if (age >= 27) {
    // Older players rarely improve significantly
    return Math.min(97, currentRating + randomBetween(-2, 3));
  }
  
  // Younger players have higher potential upside
  const ageFactor = Math.max(0.1, (30 - age) / 14); // Higher factor for younger players
  const potentialGain = randomBetween(0, Math.round(20 * ageFactor));
  
  return Math.min(100, currentRating + potentialGain);
}

/**
 * Calculate market value based on rating, age, and position
 */
function calculateMarketValue(rating: number, age: number, position: Position): number {
  // Base value calculation
  let baseValue = Math.pow(rating / 20, 2.8) * 100000; // Exponential curve
  
  // Age modifier
  let ageModifier = 1.0;
  if (age <= 25) ageModifier = 0.8 + (age - 16) * 0.04; // Young players worth more
  else if (age <= 30) ageModifier = 1.2; // Peak value
  else ageModifier = 1.2 - (age - 30) * 0.08; // Declining value
  
  // Position modifier (attackers worth more)
  const positionModifier = {
    ST: 1.3, CAM: 1.2, LW: 1.15, RW: 1.15,
    CM: 1.0, CDM: 0.95, CB: 0.9,
    LB: 0.85, RB: 0.85, GK: 0.8
  }[position];
  
  return Math.round(baseValue * ageModifier * positionModifier);
}

/**
 * Calculate weekly wage based on rating and club balance
 */
function calculateWage(rating: number, club: Club): number {
  // Base wage calculation
  const baseWage = Math.pow(rating / 25, 2.2) * 1000;
  
  // Club balance modifier with proper fallback
  const balanceModifier = {
  rich: 1.4,
  average: 1.0,
  poor: 0.7
}[(club.balance as 'rich' | 'average' | 'poor')] || 0.8;// fallback for unknown balance types
  
  // Professional vs semi-professional
  const statusModifier = club.status === 'pro' ? 1.0 : 0.6;
  
  return Math.round(baseWage * balanceModifier * statusModifier);
}

/**
 * Generate physical attributes for position
 */
function generatePhysical(position: Position): { height: number; weight: number } {
  const { height: heightRange, weight: weightRange } = POSITION_PHYSICAL[position];
  
  const height = randomBetween(heightRange[0], heightRange[1]);
  const weight = randomBetween(weightRange[0], weightRange[1]);
  
  return { height, weight };
}

/**
 * Generate secondary position
 */
function generateSecondaryPosition(primaryPosition: Position): Position | null {
  const possibleSecondary = SECONDARY_POSITIONS[primaryPosition];
  
  if (possibleSecondary.length === 0 || Math.random() < 0.3) {
    return null; // 30% chance of no secondary position
  }
  
  return randomFromArray(possibleSecondary);
}

/**
 * Generate injury (optional)
 */
function generateInjury(): Injury | null {
  const type = randomFromArray(INJURY_TYPES);
  const severity = randomFromArray(['Minor', 'Moderate', 'Major'] as const);
  
  // Duration based on severity
  const durationRanges: { [key in 'Minor' | 'Moderate' | 'Major']: [number, number] } = {
    Minor: [3, 14],
    Moderate: [14, 45],
    Major: [45, 180]
  };
  
  const duration = randomBetween(...durationRanges[severity]);
  const recurring = Math.random() < 0.15; 
  
  return { type, severity, duration, recurring };
}

/**
 * Distribute positions across squad
 */
function generateSquadPositions(squadSize: number): Position[] {
  const positions: Position[] = [];
  
  // Calculate how many players per position
  Object.entries(POSITION_DISTRIBUTION).forEach(([pos, percentage]) => {
    const count = Math.round(squadSize * percentage);
    for (let i = 0; i < count; i++) {
      positions.push(pos as Position);
    }
  });
  
  // Fill any remaining slots with random outfield positions
  while (positions.length < squadSize) {
    const outfieldPositions = POSITIONS.filter(p => p !== 'GK');
    positions.push(randomFromArray(outfieldPositions));
  }
  
  // Shuffle to randomize order
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  return positions.slice(0, squadSize);
}

// ===== MAIN GENERATOR FUNCTIONS =====

/**
 * Generate a single player
 */






function generatePlayer(
  club: Club | null,
  position: Position,
  playerNames: PlayerNames,
  config: GenerationConfig
): Player {
  const countryId = club?.countryId || randomFromArray(['KEN', 'UGA', 'TZA', 'RSA']);
  const clubQuality = club ? getClubQualityModifier(club) : 0.5; // Default for free agents
  
  const age = generateAge(position, clubQuality);
  const rating = calculateBaseRating(age, position, clubQuality);
  const potential = calculatePotential(rating, age);
  const { height, weight } = generatePhysical(position);
  const { firstName, lastName } = generatePlayerName(countryId, playerNames);
  
  // Generate injuries if probability met
  const injuries: Injury[] = [];
  if (Math.random() < config.injuryProbability) {
    const injury = generateInjury();
    if (injury) injuries.push(injury);
  }
  
  const player: Player = {
    id: uuidv4(),
    firstName,
    lastName,
    age,
    countryId,
    clubId: club?.id || null,
    position,
    secondaryPosition: generateSecondaryPosition(position),
    rating,
    potential,
    value: calculateMarketValue(rating, age, position),
    wage: club ? calculateWage(rating, club) : 0,
    height,
    weight,
    foot: randomFromArray(['Left', 'Right', 'Both']),
    personality: randomFromArray(PERSONALITIES),
    form: randomBetween(60, 90), // Initialize with decent form
    injuries,
    history: [] // Empty history for new players
  };
  
  return player;
}

/**
 * Generate players for a single club
 */
function generateClubPlayers(
  club: Club,
  playerNames: PlayerNames,
  config: GenerationConfig
): Player[] {
  const players: Player[] = [];
  const positions = generateSquadPositions(config.playersPerClub);
  
  positions.forEach(position => {
    const player = generatePlayer(club, position, playerNames, config);
    players.push(player);
  });
  
  return players;
}

/**
 * Generate free agents
 */
function generateFreeAgents(
  playerNames: PlayerNames,
  _countries: Country[],
  config: GenerationConfig
): Player[] {
  const freeAgents: Player[] = [];
  
  for (let i = 0; i < config.freeAgentCount; i++) {
    const position = randomFromArray(POSITIONS);
    const player = generatePlayer(null, position, playerNames, config);
    freeAgents.push(player);
  }
  
  return freeAgents;
}

// ===== MAIN EXPORT FUNCTION =====

/**
 * Generate all players for clubs and free agent pool
 */
export function generateAllPlayers(
  clubs: Club[],
  countries: Country[],
  playerNamesParam?: PlayerNames, // This should be the loaded JSON data
  config: Partial<GenerationConfig> = {}
): Player[] {
  const finalConfig: GenerationConfig = {
    playersPerClub: 25,
    freeAgentCount: 100,
    currentSeason: '2024-25',
    injuryProbability: 0.15,
    ...config
  };
  
  // Use the provided playerNames data directly (this comes from the database loading)
  const playerNames = playerNamesParam || {};
  
  console.log(`Starting player generation for ${clubs.length} clubs...`);
  console.log(`Player names data received:`, Object.keys(playerNames));
  console.log(`Sample country data (KEN):`, playerNames['KEN']);
  
  const startTime = Date.now();
  const allPlayers: Player[] = [];
  
  // Generate club players
  clubs.forEach((club, index) => {
    const clubPlayers = generateClubPlayers(club, playerNames, finalConfig);
    allPlayers.push(...clubPlayers);
    
    if ((index + 1) % 10 === 0) {
      console.log(`Generated players for ${index + 1}/${clubs.length} clubs`);
    }
  });
  
  // Generate free agents
  const freeAgents = generateFreeAgents(playerNames, countries, finalConfig);
  allPlayers.push(...freeAgents);
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  console.log(`Player generation complete!`);
  console.log(`Generated ${allPlayers.length} players in ${totalTime}ms`);
  console.log(`Club players: ${allPlayers.filter(p => p.clubId).length}`);
  console.log(`Free agents: ${allPlayers.filter(p => !p.clubId).length}`);
  console.log(`Average rating: ${Math.round(allPlayers.reduce((sum, p) => sum + p.rating, 0) / allPlayers.length)}`);
  
  // Log sample of generated names for verification
  const samplePlayers = allPlayers.slice(0, 10);
  console.log('Sample generated players:');
  samplePlayers.forEach(p => {
    console.log(`${p.firstName} ${p.lastName} (${p.countryId}) - ${p.position} - Rating: ${p.rating}`);
  });
  
  return allPlayers;
}

// ===== ADDITIONAL UTILITY EXPORTS =====

/**
 * Update player form (for simulation use)
 */
export function updatePlayerForm(player: Player, performanceRating: number): Player {
  const formChange = Math.round((performanceRating - 70) * 0.3); // Scale performance to form change
  const newForm = Math.max(0, Math.min(100, player.form + formChange));
  
  return { ...player, form: newForm };
}

/**
 * Age player by one year (for season progression)
 */
export function agePlayer(player: Player): Player {
  const newAge = player.age + 1;
  
  // Potential decreases as player ages
  let newPotential = player.potential;
  if (newAge >= 28) {
    newPotential = Math.max(player.rating, player.potential - randomBetween(0, 2));
  }
  
  // Rating may decline for older players
  let newRating = player.rating;
  if (newAge >= 32) {
    const declineChance = (newAge - 32) * 0.1;
    if (Math.random() < declineChance) {
      newRating = Math.max(30, newRating - randomBetween(1, 3));
    }
  }
  
  return {
    ...player,
    age: newAge,
    rating: newRating,
    potential: newPotential,
    value: calculateMarketValue(newRating, newAge, player.position)
  };
}

/**
 * Generate statistics for testing/debugging
 */
export function generatePlayerStatistics(players: Player[]): any {
  const stats = {
    totalPlayers: players.length,
    averageAge: Math.round(players.reduce((sum, p) => sum + p.age, 0) / players.length),
    averageRating: Math.round(players.reduce((sum, p) => sum + p.rating, 0) / players.length),
    positionDistribution: {} as Record<Position, number>,
    countryDistribution: {} as Record<string, number>,
    injuredPlayers: players.filter(p => p.injuries.length > 0).length,
    nameDistribution: {
      uniqueFirstNames: new Set(players.map(p => p.firstName)).size,
      uniqueLastNames: new Set(players.map(p => p.lastName)).size,
      fallbackUsage: players.filter(p => 
        FALLBACK_NAMES.firstNames.includes(p.firstName) || 
        FALLBACK_NAMES.lastNames.includes(p.lastName)
      ).length
    }
  };
  
  // Position distribution
  POSITIONS.forEach(pos => {
    stats.positionDistribution[pos] = players.filter(p => p.position === pos).length;
  });
  
  // Country distribution
  players.forEach(player => {
    stats.countryDistribution[player.countryId] = 
      (stats.countryDistribution[player.countryId] || 0) + 1;
  });
  
  return stats;
}

/**
 * Debug function to test name generation
 */
export function debugNameGeneration(countryId: string = 'NGA'): void {
  const playerNames = getPlayerNamesData();
  console.log('=== NAME GENERATION DEBUG ===');
  console.log('Available countries:', Object.keys(playerNames));
  console.log(`Testing country: ${countryId}`);
  
  if (playerNames[countryId]) {
    console.log('First names:', playerNames[countryId].firstNames?.slice(0, 5));
    console.log('Last names:', playerNames[countryId].lastNames?.slice(0, 5));
    
    // Generate 5 sample names
    console.log('Sample generated names:');
    for (let i = 0; i < 5; i++) {
      const name = generatePlayerName(countryId, playerNames);
      console.log(`${i + 1}. ${name.firstName} ${name.lastName}`);
    }
  } else {
    console.log(`Country ${countryId} not found in data`);
    console.log('Fallback names will be used');
    
    // Generate sample fallback names
    console.log('Sample fallback names:');
    for (let i = 0; i < 5; i++) {
      const name = generatePlayerName(countryId, playerNames);
      console.log(`${i + 1}. ${name.firstName} ${name.lastName}`);
    }
  }
}