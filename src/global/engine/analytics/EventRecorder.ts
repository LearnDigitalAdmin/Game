// src/global/engine/analytics/EventRecorder.ts
// Event logging and historical record management

import type { MatchEvent } from '../types/MatchTypes';

export interface EventLog {
  eventId: string;
  type: string;
  minute: number;
  timestamp: number;
  team: 'home' | 'away';
  playerName?: string;
  description: string;
  details: Record<string, any>;
}

export class EventRecorder {
  private eventLog: EventLog[] = [];

  /**
   * Record a match event
   */
  recordEvent(event: MatchEvent): void {
    const log: EventLog = {
      eventId: event.id,
      type: event.type,
      minute: Math.floor(event.minute),
      timestamp: event.timestamp,
      team: event.team,
      playerName: event.player ? `${event.player.firstName} ${event.player.lastName}` : undefined,
      description: event.description,
      details: {
        xG: event.xG,
        probability: event.probability,
        assistPlayer: event.assistPlayer?.firstName,
        score: event.resultingScore,
      },
    };

    this.eventLog.push(log);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${event.minute.toFixed(1)}'] ${event.description}`);
    }
  }

  /**
   * Get event log
   */
  getEventLog(): EventLog[] {
    return [...this.eventLog];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string): EventLog[] {
    return this.eventLog.filter(e => e.type === type);
  }

  /**
   * Get events by team
   */
  getEventsByTeam(team: 'home' | 'away'): EventLog[] {
    return this.eventLog.filter(e => e.team === team);
  }

  /**
   * Get events for minute range
   */
  getEventsForMinutes(startMinute: number, endMinute: number): EventLog[] {
    return this.eventLog.filter(e => e.minute >= startMinute && e.minute <= endMinute);
  }

  /**
   * Get goal events with timeline
   */
  getGoalTimeline(): EventLog[] {
    return this.getEventsByType('goal').sort((a, b) => a.minute - b.minute);
  }

  /**
   * Get disciplinary events (cards)
   */
  getDisciplinaryEvents(): EventLog[] {
    return this.eventLog.filter(e =>
      e.type === 'yellow-card' || e.type === 'red-card'
    );
  }

  /**
   * Generate match commentary
   */
  generateCommentary(): string {
    let commentary = '';

    // Group events by minute
    const eventsByMinute: Map<number, EventLog[]> = new Map();

    this.eventLog.forEach(event => {
      const minute = event.minute;
      if (!eventsByMinute.has(minute)) {
        eventsByMinute.set(minute, []);
      }
      eventsByMinute.get(minute)!.push(event);
    });

    // Create narrative
    const sortedMinutes = Array.from(eventsByMinute.keys()).sort((a, b) => a - b);

    sortedMinutes.forEach(minute => {
      const events = eventsByMinute.get(minute)!;

      commentary += `\n⏱️ ${minute}': `;

      events.forEach((event, index) => {
        if (index > 0) commentary += ' | ';

        switch (event.type) {
          case 'goal':
            commentary += `⚽ GOAL! ${event.playerName}!`;
            break;
          case 'shot-on-target':
            commentary += `📍 ${event.playerName} shoots on target.`;
            break;
          case 'shot-off-target':
            commentary += `📍 ${event.playerName} shoots wide.`;
            break;
          case 'yellow-card':
            commentary += `🟨 ${event.playerName} booked.`;
            break;
          case 'red-card':
            commentary += `🔴 ${event.playerName} sent off!`;
            break;
          case 'corner':
            commentary += `🏁 Corner to ${event.team === 'home' ? 'home' : 'away'} team.`;
            break;
          case 'free-kick':
            commentary += `⚽ Free kick to ${event.team === 'home' ? 'home' : 'away'} team.`;
            break;
          case 'injury':
            commentary += `🏥 ${event.playerName} is injured.`;
            break;
          case 'substitution':
            commentary += `🔄 Substitution made.`;
            break;
          default:
            commentary += event.description;
        }
      });
    });

    return commentary;
  }

  /**
   * Export event log as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(this.eventLog, null, 2);
  }

  /**
   * Export event log as CSV
   */
  exportAsCSV(): string {
    let csv = 'Minute,Type,Team,Player,Description\n';

    this.eventLog.forEach(event => {
      csv += `${event.minute},"${event.type}","${event.team}","${event.playerName || ''}","${event.description}"\n`;
    });

    return csv;
  }

  /**
   * Clear event log (for new match)
   */
  clear(): void {
    this.eventLog = [];
  }

  /**
   * Get match duration from log
   */
  getMatchDuration(): number {
    if (this.eventLog.length === 0) return 0;

    const lastEvent = this.eventLog[this.eventLog.length - 1];
    return lastEvent.minute;
  }

  /**
   * Get total events recorded
   */
  getTotalEvents(): number {
    return this.eventLog.length;
  }

  /**
   * Get event frequency per minute
   */
  getEventFrequency(): number {
    const duration = this.getMatchDuration();
    if (duration === 0) return 0;

    return this.getTotalEvents() / duration;
  }

  /**
   * Identify most eventful period
   */
  getMostEventfulPeriod(): { start: number; end: number; count: number } {
    const windowSize = 15; // 15-minute windows
    let maxEvents = 0;
    let maxStart = 0;

    for (let start = 0; start < 90; start += 5) {
      const count = this.getEventsForMinutes(start, start + windowSize).length;
      if (count > maxEvents) {
        maxEvents = count;
        maxStart = start;
      }
    }

    return {
      start: maxStart,
      end: maxStart + windowSize,
      count: maxEvents,
    };
  }

  /**
   * Get momentum shift points
   */
  getMomentumShifts(): { minute: number; description: string }[] {
    const shifts: { minute: number; description: string }[] = [];

    // Identify momentum shifts (goals, red cards, etc)
    this.getEventsByType('goal').forEach(event => {
      shifts.push({
        minute: event.minute,
        description: `Goal by ${event.team === 'home' ? 'home' : 'away'} team`,
      });
    });

    this.getEventsByType('red-card').forEach(event => {
      shifts.push({
        minute: event.minute,
        description: `Red card - ${event.team === 'home' ? 'home' : 'away'} team down to 10`,
      });
    });

    return shifts.sort((a, b) => a.minute - b.minute);
  }

  /**
   * Generate match statistics summary
   */
  generateStatsSummary(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    homeEvents: number;
    awayEvents: number;
    mostActiveTeam: 'home' | 'away' | 'equal';
  } {
    const eventsByType: Record<string, number> = {};
    let homeEvents = 0;
    let awayEvents = 0;

    this.eventLog.forEach(event => {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count by team
      if (event.team === 'home') homeEvents++;
      else awayEvents++;
    });

    const mostActiveTeam = homeEvents > awayEvents ? 'home' : awayEvents > homeEvents ? 'away' : 'equal';

    return {
      totalEvents: this.eventLog.length,
      eventsByType,
      homeEvents,
      awayEvents,
      mostActiveTeam,
    };
  }
}

export default EventRecorder;
