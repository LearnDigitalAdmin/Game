// src/global/engine/MatchEngineConfig.ts
// Match engine configuration with realistic match speeds

export type MatchSpeed = 'fast' | 'default' | 'hyper-realistic';

export interface MatchSpeedConfig {
  speed: MatchSpeed;
  realTimeMs: number; // Real time in milliseconds for 90 minutes
  simulatedMinutes: number; // Simulated game minutes per update
  updateFrequencyHz: number; // Updates per second
  visualUpdateMs: number; // Milliseconds between visual updates
  eventDensity: number; // 0-1 factor for event generation frequency
  description: string;
}

// Match speed presets
export const MATCH_SPEEDS: Record<MatchSpeed, MatchSpeedConfig> = {
  fast: {
    speed: 'fast',
    realTimeMs: 45000, // 45 seconds for 90 minutes
    simulatedMinutes: 2, // Skip 2 minutes per update
    updateFrequencyHz: 2, // 2 updates per second
    visualUpdateMs: 500, // Update visuals every 500ms
    eventDensity: 0.8, // 80% event density
    description: 'Fast simulation (45 seconds for full match)',
  },

  default: {
    speed: 'default',
    realTimeMs: 90000, // 90 seconds for 90 minutes
    simulatedMinutes: 1, // Skip 1 minute per update
    updateFrequencyHz: 1, // 1 update per second
    visualUpdateMs: 1000, // Update visuals every 1 second
    eventDensity: 1.0, // 100% event density
    description: 'Default simulation (90 seconds for full match)',
  },

  'hyper-realistic': {
    speed: 'hyper-realistic',
    realTimeMs: 180000, // 3 minutes for 90 minutes (180 seconds)
    simulatedMinutes: 0.5, // Skip 0.5 minutes per update
    updateFrequencyHz: 30, // 30 updates per second (60 FPS)
    visualUpdateMs: 16, // Update visuals every 16ms (~60 FPS)
    eventDensity: 1.2, // 120% event density for more realistic feel
    description: 'Hyper-realistic simulation (3 minutes for full match)',
  },
};

/**
 * Get match speed configuration
 */
export function getMatchSpeedConfig(speed: MatchSpeed): MatchSpeedConfig {
  return MATCH_SPEEDS[speed];
}

/**
 * Calculate game minutes per real-world millisecond
 */
export function calculateGameMinutesPerMs(speed: MatchSpeed): number {
  const config = MATCH_SPEEDS[speed];
  return 90 / config.realTimeMs; // Total 90 minutes divided by total real time
}

/**
 * Calculate real milliseconds for game minutes
 */
export function calculateRealMsForGameMinutes(speed: MatchSpeed, gameMinutes: number): number {
  const config = MATCH_SPEEDS[speed];
  return (gameMinutes / 90) * config.realTimeMs;
}

/**
 * Validate and normalize match speed
 */
export function validateMatchSpeed(speed: any): MatchSpeed {
  if (Object.keys(MATCH_SPEEDS).includes(speed)) {
    return speed as MatchSpeed;
  }
  console.warn(`Invalid match speed: ${speed}, defaulting to 'default'`);
  return 'default';
}

/**
 * All match speed configurations list
 */
export const MATCH_SPEED_OPTIONS: MatchSpeedConfig[] = Object.values(MATCH_SPEEDS);

// Example timing calculations
export const MATCH_TIMING_EXAMPLES = {
  fast: {
    halfTime: 22.5, // Seconds for first half (45 minutes)
    fullTime: 45, // Seconds for full match
    extraTime: 60, // Seconds for extra time (30 minutes)
  },
  default: {
    halfTime: 45,
    fullTime: 90,
    extraTime: 120,
  },
  'hyper-realistic': {
    halfTime: 90,
    fullTime: 180,
    extraTime: 240,
  },
};
