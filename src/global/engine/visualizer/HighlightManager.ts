// src/global/engine/visualizer/HighlightManager.ts
// Automatic highlight clip generation and replay management

import { v4 as uuidv4 } from 'uuid';
import type {
  MatchEvent,
  HighlightClip,
  MatchState,
  EventType,
} from '../types/MatchTypes';

export class HighlightManager {
  private highlights: HighlightClip[] = [];
  private replayFrames: Map<string, any[]> = new Map();

  /**
   * Create highlight from match event
   */
  createHighlight(event: MatchEvent, matchState: MatchState): HighlightClip | null {
    if (!this.isHighlightEvent(event.type)) {
      return null;
    }

    // Calculate highlight duration based on event type
    const duration = this.getHighlightDuration(event.type);
    const startMinute = Math.max(0, event.minute - 2);
    const endMinute = event.minute + (duration - 2);

    const highlight: HighlightClip = {
      id: uuidv4(),
      eventType: event.type,
      startMinute,
      endMinute,
      startTime: event.timestamp - 2000, // 2 seconds before event
      endTime: event.timestamp + (duration * 1000),
      description: event.description,
      homeScore: matchState.score.home,
      awayScore: matchState.score.away,
      playerIds: event.player ? [event.player.id] : [],
      isGoal: event.type === 'goal',
      isMissedChance: event.type === 'shot-off-target' || event.type === 'shot-blocked',
      isSave: false,
      isContact: this.getContactType(event.type),
    };

    this.highlights.push(highlight);
    return highlight;
  }

  /**
   * Check if event should be highlighted
   */
  private isHighlightEvent(eventType: EventType): boolean {
    const highlightableEvents: EventType[] = [
      'goal',
      'shot-on-target',
      'shot-off-target',
      'shot-blocked',
      'red-card',
      'injury',
      'corner',
      'free-kick',
      'substitution',
      'own-goal',
    ];

    return highlightableEvents.includes(eventType);
  }

  /**
   * Get highlight duration in seconds
   */
  private getHighlightDuration(eventType: EventType): number {
    const durations: Record<EventType, number> = {
      'goal': 8,
      'shot-on-target': 5,
      'shot-off-target': 5,
      'shot-blocked': 4,
      'corner': 15, // Entire corner sequence
      'free-kick': 12,
      'red-card': 10,
      'injury': 8,
      'substitution': 6,
      'own-goal': 8,
      'kickoff': 0,
      'assist': 0,
      'pass': 0,
      'miss-pass': 0,
      'intercept': 0,
      'tackle': 0,
      'throw-in': 0,
      'goal-kick': 0,
      'yellow-card': 5,
      'foul': 5,
      'half-time': 0,
      'full-time': 0,
      'extra-time-start': 0,
      'penalty-shootout': 0,
      'possession-change': 0,
      'momentum-shift': 0,
      'weather-event': 0,
      'crowd-moment': 0,
      'tactical-change': 0,
      shot: 0
    };

    return durations[eventType] || 5;
  }

  /**
   * Get contact type for highlight
   */
  private getContactType(eventType: EventType): string {
    if (eventType === 'goal' || eventType === 'shot-on-target' || eventType === 'shot-off-target') {
      return Math.random() < 0.3 ? 'head' : 'foot';
    }
    return 'foot';
  }

  /**
   * Get all highlights
   */
  getHighlights(): HighlightClip[] {
    return [...this.highlights];
  }

  /**
   * Get goals only
   */
  getGoals(): HighlightClip[] {
    return this.highlights.filter(h => h.isGoal);
  }

  /**
   * Get missed chances
   */
  getMissedChances(): HighlightClip[] {
    return this.highlights.filter(h => h.isMissedChance);
  }

  /**
   * Get red cards
   */
  getRedCards(): HighlightClip[] {
    return this.highlights.filter(h => h.eventType === 'red-card');
  }

  /**
   * Get best highlight
   */
  getBestHighlight(): HighlightClip | null {
    if (this.highlights.length === 0) return null;

    // Prioritize goals, then shots, then red cards
    for (const hl of this.highlights) {
      if (hl.isGoal) return hl;
    }

    for (const hl of this.highlights) {
      if (hl.eventType === 'shot-on-target') return hl;
    }

    return this.highlights[0];
  }

  /**
   * Get highlights for period
   */
  getHighlightsForMinutes(startMinute: number, endMinute: number): HighlightClip[] {
    return this.highlights.filter(
      h => h.startMinute >= startMinute && h.endMinute <= endMinute
    );
  }

  /**
   * Get highlights for team
   */
  getHighlightsForTeam(_teamName: string): HighlightClip[] {
    // Would need to track team on highlight clip
    return [];
  }

  /**
   * Generate match highlights compilation
   */
  generateHighlightsCompilation(_matchDuration: number): {
    clips: HighlightClip[];
    totalDuration: number;
    summary: string;
  } {
    // Sort by importance
    const sorted = this.sortHighlightsByImportance();

    // Select top highlights (limit to ~3 minutes of footage)
    const maxDuration = 180; // 3 minutes
    let totalDuration = 0;
    const selectedClips: HighlightClip[] = [];

    for (const clip of sorted) {
      const clipDuration = clip.endTime - clip.startTime;
      if (totalDuration + clipDuration <= maxDuration) {
        selectedClips.push(clip);
        totalDuration += clipDuration;
      }
    }

    const summary = `Match highlights compilation - ${selectedClips.length} clips, ${Math.round(totalDuration / 1000)}s total`;

    return {
      clips: selectedClips,
      totalDuration,
      summary,
    };
  }

  /**
   * Sort highlights by importance
   */
  private sortHighlightsByImportance(): HighlightClip[] {
    const scored = [...this.highlights].sort((a, b) => {
      // Scoring priority
      let aScore = 0;
      let bScore = 0;

      // Goals are top priority
      if (a.isGoal) aScore += 100;
      if (b.isGoal) bScore += 100;

      // Red cards are important
      if (a.eventType === 'red-card') aScore += 80;
      if (b.eventType === 'red-card') bScore += 80;

      // Shots on target
      if (a.eventType === 'shot-on-target') aScore += 40;
      if (b.eventType === 'shot-on-target') bScore += 40;

      // Missed chances
      if (a.isMissedChance) aScore += 20;
      if (b.isMissedChance) bScore += 20;

      // Others
      aScore += 10;
      bScore += 10;

      return bScore - aScore;
    });

    return scored;
  }

  /**
   * Store replay frames for detailed replay playback
   */
  recordReplayFrame(matchMinute: number, frameData: any): void {
    if (!this.replayFrames.has(matchMinute.toString())) {
      this.replayFrames.set(matchMinute.toString(), []);
    }

    this.replayFrames.get(matchMinute.toString())!.push(frameData);
  }

  /**
   * Get replay frames for minute
   */
  getReplayFrames(minute: number): any[] {
    return this.replayFrames.get(minute.toString()) || [];
  }

  /**
   * Playback replay at speed
   */
  playbackReplay(startMinute: number, endMinute: number, speed: number = 1): {
    frames: any[];
    duration: number;
  } {
    const frames: any[] = [];

    for (let i = Math.floor(startMinute); i <= Math.ceil(endMinute); i++) {
      const minuteFrames = this.getReplayFrames(i);
      frames.push(...minuteFrames);
    }

    const duration = (endMinute - startMinute) * 60 / speed; // Duration in seconds

    return { frames, duration };
  }

  /**
   * Clear highlights (for new match)
   */
  clear(): void {
    this.highlights = [];
    this.replayFrames.clear();
  }

  /**
   * Get match summary
   */
  generateMatchSummary(matchState: MatchState): string {
    const goals = this.getGoals().length;
    const redCards = this.getRedCards().length;
    const shots = this.highlights.filter(h => h.eventType === 'shot-on-target').length;

    let summary = `Final Score: ${matchState.score.home}-${matchState.score.away}. `;
    summary += `${goals} goal(s) scored. `;
    summary += `${shots} shots on target. `;

    if (redCards > 0) {
      summary += `${redCards} red card(s). `;
    }

    return summary;
  }
}

export default HighlightManager;
