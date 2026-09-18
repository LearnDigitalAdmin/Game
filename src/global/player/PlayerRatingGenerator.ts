// src/global/player/PlayerRatingGenerator.ts
// Realistic player rating generation with proper skill distribution
// Implements FIFA/FM-caliber algorithms for rating and attributes

/**
 * Player generation parameters
 */
export interface PlayerGenerationParams {
  age: number;
  position: string;
  isProdigy: boolean;
  isWonderkid: boolean;
  nationality?: string;
  experience?: number;
}

/**
 * Generated player ratings
 */
export interface GeneratedPlayerRatings {
  overallRating: number;
  potential: number;
  pace: number;
  strength: number;
  stamina: number;
  technique: number;
  passing: number;
  dribbling: number;
  shooting: number;
  heading: number;
  defense: number;
  awareness: number;
  leadership: number;
  mentality: number;
  concentration: number;
  composure: number;
  weakFoot: number;
  skillMoves: 0 | 1 | 2 | 3 | 4 | 5;
  growthRate: number;
  injuryProneness: number;
}

/**
 * Realistic player rating generation engine
 */
export class PlayerRatingGenerator {
  /**
   * Generate complete player ratings
   */
  generatePlayerRatings(params: PlayerGenerationParams): GeneratedPlayerRatings {
    // 1. Determine base rating by age and experience
    const baseRating = this.calculateBaseRating(params.age, params.experience || 0, params.isProdigy, params.isWonderkid);

    // 2. Generate position-specific attributes
    const positionAttributes = this.generatePositionAttributes(params.position, baseRating);

    // 3. Calculate overall rating from attributes
    const overallRating = this.calculateOverallRating(positionAttributes);

    // 4. Determine potential
    const potential = this.calculatePotential(params.age, overallRating, params.isProdigy, params.isWonderkid);

    // 5. Generate other attributes
    const leadership = this.generateLeadership();
    const mentality = this.generateMentality();
    const concentration = 40 + Math.random() * 40; // 40-80
    const composure = Math.max(30, overallRating - 20 + (Math.random() - 0.5) * 20);

    // 6. Generate growth rate
    const growthRate = this.calculateGrowthRate(params.age, overallRating, potential);

    // 7. Injury proneness
    const injuryProneness = 30 + Math.random() * 50; // 30-80

    return {
      overallRating: Math.round(overallRating),
      potential: Math.round(potential),
      pace: Math.round(positionAttributes.pace),
      strength: Math.round(positionAttributes.strength),
      stamina: Math.round(positionAttributes.stamina),
      technique: Math.round(positionAttributes.technique),
      passing: Math.round(positionAttributes.passing),
      dribbling: Math.round(positionAttributes.dribbling),
      shooting: Math.round(positionAttributes.shooting),
      heading: Math.round(positionAttributes.heading),
      defense: Math.round(positionAttributes.defense),
      awareness: Math.round(positionAttributes.awareness),
      leadership: Math.round(leadership),
      mentality: Math.round(mentality),
      concentration: Math.round(concentration),
      composure: Math.round(composure),
      weakFoot: Math.round(Math.max(30, overallRating - 30)),
      skillMoves: this.generateSkillMoves(overallRating) as 0 | 1 | 2 | 3 | 4 | 5,
      growthRate: Math.round(growthRate),
      injuryProneness: Math.round(injuryProneness),
    };
  }

  /**
   * Calculate base rating from age and experience
   */
  private calculateBaseRating(age: number, experience: number, isProdigy: boolean, isWonderkid: boolean): number {
    let baseRating = 0;

    // Age curve (realistic career progression)
    if (age < 17) {
      // Youth players: 45-70 depending on talent
      baseRating = 45 + (Math.random() * 25);
    } else if (age < 20) {
      // Young players: 55-75
      baseRating = 55 + (Math.random() * 20);
    } else if (age < 23) {
      // Developing players: 60-80
      baseRating = 60 + (Math.random() * 20);
    } else if (age < 27) {
      // Prime players: 70-90
      baseRating = 70 + (Math.random() * 20);
    } else if (age < 31) {
      // Experienced players: 65-85
      baseRating = 65 + (Math.random() * 20);
    } else if (age < 34) {
      // Veteran players: 55-75
      baseRating = 55 + (Math.random() * 20);
    } else {
      // Aging players: 40-60
      baseRating = 40 + (Math.random() * 20);
    }

    // Prodigy bonus: +5-15 rating
    if (isProdigy) baseRating += 5 + Math.random() * 10;

    // Wonderkid bonus: +10-20 rating
    if (isWonderkid) baseRating += 10 + Math.random() * 10;

    // Experience bonus: +0.5 per year of experience
    baseRating += Math.min(experience * 0.5, 15);

    return Math.max(40, Math.min(95, baseRating));
  }

  /**
   * Generate position-specific attributes
   */
  private generatePositionAttributes(
    position: string,
    baseRating: number
  ): {
    pace: number;
    strength: number;
    stamina: number;
    technique: number;
    passing: number;
    dribbling: number;
    shooting: number;
    heading: number;
    defense: number;
    awareness: number;
  } {
    const variance = () => (Math.random() - 0.5) * 15; // ±7.5 variance

    // Base attributes around overall rating
    const attrs = {
      pace: baseRating + variance(),
      strength: baseRating + variance(),
      stamina: baseRating + variance(),
      technique: baseRating + variance(),
      passing: baseRating + variance(),
      dribbling: baseRating + variance(),
      shooting: baseRating + variance(),
      heading: baseRating + variance(),
      defense: baseRating + variance(),
      awareness: baseRating + variance(),
    };

    // Position-specific bonuses/penalties
    switch (position) {
      case 'GK':
        attrs.pace = baseRating - 10 + Math.random() * 15; // Goalkeepers slower
        attrs.strength = baseRating + 10 + Math.random() * 10; // Strong
        attrs.stamina = baseRating + 5;
        attrs.technique = baseRating - 5; // Less technical
        attrs.passing = baseRating - 10; // Less passing
        attrs.dribbling = baseRating - 30; // Can't dribble
        attrs.shooting = baseRating - 50; // Can't shoot
        attrs.heading = baseRating + 5; // Good at punching
        attrs.defense = baseRating + 25; // Excellent defense
        attrs.awareness = baseRating + 15;
        break;

      case 'CB':
        attrs.pace = baseRating - 5; // Slower
        attrs.strength = baseRating + 12; // Very strong
        attrs.stamina = baseRating + 3;
        attrs.technique = baseRating - 10; // Less technical
        attrs.passing = baseRating - 5;
        attrs.dribbling = baseRating - 20;
        attrs.shooting = baseRating - 30;
        attrs.heading = baseRating + 18; // Excellent heading
        attrs.defense = baseRating + 28; // Excellent defense
        attrs.awareness = baseRating + 20;
        break;

      case 'LB':
      case 'RB':
        attrs.pace = baseRating + 3; // Slightly faster
        attrs.strength = baseRating + 8;
        attrs.stamina = baseRating + 8; // High stamina for covering ground
        attrs.technique = baseRating + 2;
        attrs.passing = baseRating + 5;
        attrs.dribbling = baseRating + 8;
        attrs.shooting = baseRating - 15;
        attrs.heading = baseRating + 10;
        attrs.defense = baseRating + 22;
        attrs.awareness = baseRating + 15;
        break;

      case 'CDM':
      case 'DM':
        attrs.pace = baseRating - 3;
        attrs.strength = baseRating + 15; // Very strong
        attrs.stamina = baseRating + 12; // High stamina
        attrs.technique = baseRating + 2;
        attrs.passing = baseRating + 10; // Good passing
        attrs.dribbling = baseRating - 5;
        attrs.shooting = baseRating - 20;
        attrs.heading = baseRating + 8;
        attrs.defense = baseRating + 25;
        attrs.awareness = baseRating + 18;
        break;

      case 'CM':
        attrs.pace = baseRating + 2;
        attrs.strength = baseRating + 8;
        attrs.stamina = baseRating + 15; // Very high stamina
        attrs.technique = baseRating + 8;
        attrs.passing = baseRating + 12; // Good passing
        attrs.dribbling = baseRating + 5;
        attrs.shooting = baseRating - 5;
        attrs.heading = baseRating + 5;
        attrs.defense = baseRating + 12;
        attrs.awareness = baseRating + 18;
        break;

      case 'CAM':
        attrs.pace = baseRating + 5;
        attrs.strength = baseRating - 5; // Less strong
        attrs.stamina = baseRating + 8;
        attrs.technique = baseRating + 18; // Very technical
        attrs.passing = baseRating + 15; // Excellent passing
        attrs.dribbling = baseRating + 15; // Excellent dribbling
        attrs.shooting = baseRating + 8;
        attrs.heading = baseRating - 10;
        attrs.defense = baseRating - 15;
        attrs.awareness = baseRating + 20;
        break;

      case 'LW':
      case 'RW':
        attrs.pace = baseRating + 12; // Fast
        attrs.strength = baseRating - 3;
        attrs.stamina = baseRating + 10;
        attrs.technique = baseRating + 15; // Technical
        attrs.passing = baseRating + 5;
        attrs.dribbling = baseRating + 20; // Excellent dribbling
        attrs.shooting = baseRating + 10;
        attrs.heading = baseRating - 8;
        attrs.defense = baseRating - 20;
        attrs.awareness = baseRating + 8;
        break;

      case 'ST':
        attrs.pace = baseRating + 8; // Fast
        attrs.strength = baseRating + 5;
        attrs.stamina = baseRating + 5;
        attrs.technique = baseRating + 8;
        attrs.passing = baseRating - 5;
        attrs.dribbling = baseRating + 10;
        attrs.shooting = baseRating + 25; // Excellent shooting
        attrs.heading = baseRating + 15;
        attrs.defense = baseRating - 30;
        attrs.awareness = baseRating + 5;
        break;
    }

    // Clamp all attributes to 0-100
    Object.keys(attrs).forEach(key => {
      attrs[key as keyof typeof attrs] = Math.max(1, Math.min(100, attrs[key as keyof typeof attrs]));
    });

    return attrs;
  }

  /**
   * Calculate overall rating from attributes
   */
  private calculateOverallRating(attrs: ReturnType<typeof this.generatePositionAttributes>): number {
    // Weighted average (different attributes have different importance)
    const weights = {
      pace: 0.1,
      strength: 0.1,
      stamina: 0.1,
      technique: 0.15,
      passing: 0.15,
      dribbling: 0.1,
      shooting: 0.1,
      heading: 0.05,
      defense: 0.1,
      awareness: 0.1,
    };

    let weighted = 0;
    let totalWeight = 0;

    Object.entries(attrs).forEach(([key, value]) => {
      const weight = weights[key as keyof typeof weights] || 0;
      weighted += value * weight;
      totalWeight += weight;
    });

    return Math.round((weighted / totalWeight) * 10) / 10;
  }

  /**
   * Calculate potential rating
   */
  private calculatePotential(age: number, rating: number, isProdigy: boolean, isWonderkid: boolean): number {
    let potential = rating;

    // Age-based potential
    if (age < 20) {
      // Young players have high potential
      potential = rating + (20 - age) * 1.5;
    } else if (age < 27) {
      // Prime age players
      potential = rating + (27 - age) * 0.8;
    } else if (age < 32) {
      // Post-prime
      potential = rating + Math.max(0, (32 - age) * 0.2);
    } else {
      // Declining
      potential = Math.max(rating, rating - 5);
    }

    // Wonderkid gets high potential
    if (isWonderkid) {
      potential = Math.max(potential, Math.min(98, rating + 25));
    }

    // Prodigy gets good potential
    if (isProdigy) {
      potential = Math.max(potential, Math.min(90, rating + 15));
    }

    return Math.min(99, Math.max(rating, potential));
  }

  /**
   * Calculate growth rate
   */
  private calculateGrowthRate(age: number, rating: number, potential: number): number {
    const potentialGain = potential - rating;

    if (potentialGain <= 0) return 5; // No growth

    // Growth rate depends on age and potential gap
    if (age < 20) {
      // Young players grow fast
      return Math.min(20, 5 + (potentialGain / 10));
    } else if (age < 25) {
      // Still growing but slower
      return Math.min(15, 3 + (potentialGain / 15));
    } else if (age < 30) {
      // Minimal growth
      return Math.max(1, potentialGain / 20);
    } else {
      // Declining
      return 1;
    }
  }

  /**
   * Generate leadership attribute
   */
  private generateLeadership(): number {
    // Most players have low-medium leadership
    const roll = Math.random();
    if (roll < 0.7) {
      return 30 + Math.random() * 30; // 30-60 (normal)
    } else if (roll < 0.95) {
      return 60 + Math.random() * 25; // 60-85 (leader)
    } else {
      return 85 + Math.random() * 15; // 85-100 (captain material)
    }
  }

  /**
   * Generate mentality attribute
   */
  private generateMentality(): number {
    // Mentality is roughly normal distribution around 50
    let mentality = 50;
    for (let i = 0; i < 3; i++) {
      mentality += (Math.random() - 0.5) * 30;
    }
    return Math.max(20, Math.min(100, mentality));
  }

  /**
   * Generate skill moves rating
   */
  private generateSkillMoves(rating: number): number {
    // Higher rated players have more skill moves
    if (rating > 85) {
      const roll = Math.random();
      if (roll < 0.4) return 3;
      if (roll < 0.7) return 4;
      return 5;
    } else if (rating > 75) {
      const roll = Math.random();
      if (roll < 0.5) return 2;
      if (roll < 0.8) return 3;
      return 4;
    } else if (rating > 65) {
      const roll = Math.random();
      if (roll < 0.6) return 1;
      if (roll < 0.9) return 2;
      return 3;
    } else {
      return Math.random() < 0.7 ? 0 : 1;
    }
  }

  /**
   * Determine if player is prodigy/wonderkid
   */
  static determineProdigyStatus(age: number, rating: number): { isProdigy: boolean; isWonderkid: boolean } {
    const isWonderkid = age < 21 && rating > 78; // Exceptional young talent
    const isProdigy = age < 23 && rating > 72 && !isWonderkid; // High potential young talent

    return { isProdigy, isWonderkid };
  }

  /**
   * Calculate realistic age distribution for club (mostly 24-29, some youth, some veterans)
   */
  static generateRealisticAge(): number {
    const roll = Math.random();

    // Distribution: 60% prime (24-31), 20% youth (17-23), 20% veterans (32+)
    if (roll < 0.6) {
      // Prime years: 24-31
      return Math.floor(24 + Math.random() * 8);
    } else if (roll < 0.8) {
      // Youth: 17-23
      return Math.floor(17 + Math.random() * 7);
    } else {
      // Veteran: 32-38
      return Math.floor(32 + Math.random() * 7);
    }
  }

  /**
   * Generate physical attributes
   */
  static generatePhysicalAttributes(): { height: number; weight: number } {
    // Average height: 181cm (5'11")
    // Variance by position handled elsewhere
    const height = Math.floor(170 + Math.random() * 20); // 170-190cm

    // Weight scales with height (roughly)
    const weight = Math.floor(height * 0.85 + (Math.random() - 0.5) * 10); // 70-95kg typically

    return { height, weight };
  }

  /**
   * Generate nationality with realistic distribution
   */
  static generateNationality(): string {
    // Top football nations with higher probability
    const countries = [
      // Top tier (15%)
      { code: 'ES', prob: 0.015 }, // Spain
      { code: 'FR', prob: 0.015 }, // France
      { code: 'DE', prob: 0.015 }, // Germany
      { code: 'IT', prob: 0.012 }, // Italy
      { code: 'BR', prob: 0.012 }, // Brazil
      { code: 'PT', prob: 0.01 }, // Portugal
      { code: 'NL', prob: 0.01 }, // Netherlands
      { code: 'AR', prob: 0.01 }, // Argentina
      { code: 'GB', prob: 0.01 }, // England
      // Mid tier (40%)
      { code: 'AT', prob: 0.005 },
      { code: 'BE', prob: 0.005 },
      { code: 'CH', prob: 0.005 },
      { code: 'CZ', prob: 0.005 },
      { code: 'DK', prob: 0.005 },
      { code: 'HR', prob: 0.005 },
      { code: 'HU', prob: 0.005 },
      { code: 'MX', prob: 0.005 },
      { code: 'PL', prob: 0.005 },
      { code: 'RO', prob: 0.005 },
      { code: 'RU', prob: 0.005 },
      { code: 'SE', prob: 0.005 },
      { code: 'TR', prob: 0.005 },
      { code: 'UA', prob: 0.005 },
      { code: 'UY', prob: 0.005 },
      // Rest of world (45%)
      { code: 'OTHER', prob: 0.45 },
    ];

    const roll = Math.random();
    let cumulative = 0;

    for (const country of countries) {
      cumulative += country.prob;
      if (roll < cumulative) {
        if (country.code === 'OTHER') {
          // Random country from second tier
          const others = ['IS', 'GR', 'SRB', 'SVK', 'SVN', 'NOR', 'BIH', 'MKD', 'ALB', 'KOS', 'SCO', 'WLS', 'IRN'];
          return others[Math.floor(Math.random() * others.length)];
        }
        return country.code;
      }
    }

    return 'GB';
  }
}

export default PlayerRatingGenerator;
