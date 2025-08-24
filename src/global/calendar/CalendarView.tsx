// src/global/calendar/IntegratedCalendarView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  useCalendar, 
  useDayEvents, 
  useRecentLog, 
  useBlockingEvents,
  type CalendarEvent, 
  type Speed,
  type CalendarEventType 
} from './Calendar';

// Types for calendar display
interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: CalendarEvent[];
}

interface CalendarMonth {
  year: number;
  month: number;
  days: CalendarDay[];
}

// Utility functions
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatDateTime = (date: Date): string => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

const getEventTypeColor = (type: CalendarEventType): string => {
  switch (type) {
    case 'MATCH':
      return 'bg-red-500 text-white';
    case 'MATCH_PREPARATION':
      return 'bg-orange-500 text-white';
    case 'MATCH_RESULT':
      return 'bg-green-500 text-white';
    case 'TRANSFER_DECISION':
      return 'bg-blue-500 text-white';
    case 'TRANSFER_WINDOW_OPEN':
    case 'TRANSFER_WINDOW_CLOSE':
      return 'bg-purple-500 text-white';
    case 'CONTRACT_EXPIRE':
    case 'CONTRACT_NEGOTIATION':
      return 'bg-yellow-500 text-black';
    case 'FINANCIAL_UPDATE':
      return 'bg-green-600 text-white';
    case 'BOARD_MEETING':
      return 'bg-gray-600 text-white';
    case 'SEASON_END':
    case 'SEASON_START':
      return 'bg-indigo-600 text-white';
    case 'TRAINING_CAMP':
      return 'bg-teal-500 text-white';
    case 'INJURY_RECOVERY':
      return 'bg-red-300 text-black';
    default:
      return 'bg-gray-400 text-white';
  }
};

const getEventTypeIcon = (type: CalendarEventType): string => {
  switch (type) {
    case 'MATCH':
      return '⚽';
    case 'MATCH_PREPARATION':
      return '🏃';
    case 'MATCH_RESULT':
      return '📊';
    case 'TRANSFER_DECISION':
      return '🔄';
    case 'TRANSFER_WINDOW_OPEN':
      return '📈';
    case 'TRANSFER_WINDOW_CLOSE':
      return '📉';
    case 'CONTRACT_EXPIRE':
    case 'CONTRACT_NEGOTIATION':
      return '📝';
    case 'FINANCIAL_UPDATE':
      return '💰';
    case 'BOARD_MEETING':
      return '👥';
    case 'SEASON_END':
    case 'SEASON_START':
      return '🏆';
    case 'TRAINING_CAMP':
      return '🏋️';
    case 'INJURY_RECOVERY':
      return '🏥';
    default:
      return '📅';
  }
};

// Enhanced Event Badge Component
const EventBadge: React.FC<{ 
  event: CalendarEvent; 
  compact?: boolean;
  onClick?: () => void;
}> = ({ event, compact = false, onClick }) => {
  const colorClass = getEventTypeColor(event.type);
  const icon = getEventTypeIcon(event.type);

  if (compact) {
    return (
      <div
        className={`inline-block px-1 py-0.5 text-xs font-bold rounded cursor-pointer hover:opacity-80 ${colorClass}`}
        title={`${event.description} - ${formatTime(new Date(event.runAt))}`}
        onClick={onClick}
      >
        {icon}
      </div>
    );
  }

  return (
    <div
      className={`p-2 rounded cursor-pointer hover:opacity-90 transition-opacity ${colorClass}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{event.description}</div>
          <div className="text-xs opacity-75">{formatTime(new Date(event.runAt))}</div>
          {event.requiresUser && (
            <div className="text-xs font-bold">ACTION REQUIRED</div>
          )}
        </div>
        <div className={`px-1 py-0.5 rounded text-xs ${
          event.priority <= 2 ? 'bg-red-200 text-red-800' : 
          event.priority === 3 ? 'bg-yellow-200 text-yellow-800' : 
          'bg-gray-200 text-gray-600'
        }`}>
          P{event.priority}
        </div>
      </div>
    </div>
  );
};

// Enhanced Speed Selector Component
const SpeedSelector: React.FC = () => {
  const { state, setSpeed } = useCalendar();
  
  const speeds: { value: Speed; label: string; description: string }[] = [
    { value: 'slow', label: '🐌 Slow', description: '3 sec/hour' },
    { value: 'default', label: '⏩ Normal', description: '1 sec/hour' },
    { value: 'fast', label: '⚡ Fast', description: '0.5 sec/hour' },
    { value: 'faster', label: '🚀 Faster', description: '0.2 sec/hour' },
    { value: 'holiday', label: '🏖️ Holiday', description: 'Skip to events' },
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Game Speed</label>
      <div className="space-y-2">
        {speeds.map(({ value, label, description }) => (
          <button
            key={value}
            onClick={() => setSpeed(value)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              state.speed === value
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium">{label}</div>
            <div className="text-xs text-gray-500">{description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Enhanced Controls Component
const Controls: React.FC = () => {
  const { 
    state, 
    play, 
    pause, 
    nextHour, 
    nextDay, 
    nextMatch,
    fastForwardTo, 
    syncWithDatabase,
    __debugSeedEvents 
  } = useCalendar();
  
  const [customDate, setCustomDate] = useState('');

  const handleFastForwardToDate = async () => {
    if (!customDate) return;
    
    try {
      const targetDate = new Date(customDate);
      if (targetDate > state.now) {
        await fastForwardTo(targetDate);
      }
    } catch (error) {
      console.error('Invalid date:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={state.paused ? play : pause}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            state.paused
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {state.paused ? '▶️ Play' : '⏸️ Pause'}
        </button>
        
        <button
          onClick={nextHour}
          disabled={!state.paused}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
        >
          ⏭️ Next Hour
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={nextDay}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded font-medium transition-colors"
        >
          📅 Next Day
        </button>
        
        <button
          onClick={nextMatch}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium transition-colors"
        >
          ⚽ Next Match
        </button>
      </div>

      <div className="border-t pt-3 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Jump to Date</label>
          <div className="flex space-x-2">
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleFastForwardToDate}
              disabled={!customDate}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded font-medium transition-colors"
            >
              Jump
            </button>
          </div>
        </div>

        <button
          onClick={syncWithDatabase}
          className="w-full px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded font-medium transition-colors"
        >
          🔄 Sync with Database
        </button>

        {__debugSeedEvents && (
          <button
            onClick={__debugSeedEvents}
            className="w-full px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
          >
            🐛 Debug: Seed Sample Events
          </button>
        )}
      </div>

      {state.speed === 'holiday' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded">
          <div className="flex items-center space-x-2">
            <span>🏖️</span>
            <span className="font-medium">Holiday Mode Active</span>
          </div>
          <div className="text-xs mt-1">Time advances automatically to next events</div>
        </div>
      )}
    </div>
  );
};

// Enhanced Blocking Events Banner
const BlockingEventsBanner: React.FC = () => {
  const blockingEvents = useBlockingEvents();
  const { resolve } = useCalendar();

  if (blockingEvents.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-red-500 text-xl">⚠️</span>
        <h4 className="font-semibold text-red-800">
          {blockingEvents.length} Action{blockingEvents.length > 1 ? 's' : ''} Required
        </h4>
      </div>
      
      <div className="space-y-3">
        {blockingEvents.map((event) => (
          <div key={event.id} className="bg-white rounded p-3 border border-red-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span>{getEventTypeIcon(event.type)}</span>
                  <span className="font-medium text-sm">{event.description}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    event.priority <= 2 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    Priority {event.priority}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Scheduled: {formatDateTime(new Date(event.runAt))}
                </div>
                
                {/* Event-specific details */}
                {event.type === 'MATCH' && (
                  <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                    <div className="font-medium">Match Details:</div>
                    <div>Competition: {(event.payload as any).competition}</div>
                    <div>Matchday: {(event.payload as any).matchday}</div>
                  </div>
                )}
                
                {event.type === 'TRANSFER_DECISION' && (
                  <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                    <div className="font-medium">Transfer Offer:</div>
                    <div>Player: {(event.payload as any).playerName}</div>
                    <div>Fee: £{(event.payload as any).fee?.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => resolve(event.id, 'DONE')}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded font-medium transition-colors"
              >
                ✅ Accept/Continue
              </button>
              <button
                onClick={() => resolve(event.id, 'CANCELLED')}
                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded font-medium transition-colors"
              >
                ❌ Decline/Cancel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced Agenda Component
const Agenda: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
  const events = useDayEvents(selectedDate);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">
        📅 {formatDate(selectedDate)}
      </h3>
      
      {events.length === 0 ? (
        <div className="text-gray-500 italic text-center py-8 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">🌙</div>
          <div>No events scheduled</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {events
            .sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime())
            .map((event) => (
              <EventBadge
                key={event.id}
                event={event}
                onClick={() => setSelectedEvent(event)}
              />
            ))}
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">{getEventTypeIcon(selectedEvent.type)}</span>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{selectedEvent.description}</h3>
                <p className="text-sm text-gray-600">{selectedEvent.type}</p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Scheduled Time</label>
                <div className="text-lg">{formatDateTime(new Date(selectedEvent.runAt))}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <div className={`inline-block px-2 py-1 rounded text-sm ${
                  selectedEvent.priority <= 2 ? 'bg-red-100 text-red-800' : 
                  selectedEvent.priority === 3 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-gray-100 text-gray-700'
                }`}>
                  Level {selectedEvent.priority}
                </div>
              </div>
              
              {selectedEvent.requiresUser && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                  <div className="font-medium text-orange-800">⚠️ Action Required</div>
                  <div className="text-sm text-orange-700">This event requires your attention when it occurs.</div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Details</label>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced History Component
const History: React.FC = () => {
  const recentLog = useRecentLog(10);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">📜 Recent Activity</h3>
      
      {recentLog.length === 0 ? (
        <div className="text-gray-500 italic text-center py-4">
          No recent activity
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentLog.map((entry: any) => (
            <div
              key={entry.id}
              className="bg-gray-50 rounded p-3 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
            >
              <div className="flex items-center space-x-2">
                <span>{getEventTypeIcon(entry.type as CalendarEventType)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{entry.description}</div>
                  <div className="text-xs text-gray-600">
                    {formatDateTime(new Date(entry.occurred_at))}
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {expandedEntry === entry.id ? '▼' : '▶'}
                </span>
              </div>
              
              {expandedEntry === entry.id && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs space-y-1">
                    <div><strong>Season:</strong> {entry.season}</div>
                    <div><strong>Matchday:</strong> {entry.matchday}</div>
                    <div><strong>Game Date:</strong> {new Date(entry.game_date).toLocaleDateString()}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Enhanced Month Grid Component
const MonthGrid: React.FC<{
  calendarMonth: CalendarMonth;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}> = ({ calendarMonth, selectedDate, onDateSelect }) => {
  const { state } = useCalendar();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-xl font-bold text-gray-800">
          {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>
      </div>
      
      <div className="p-4">
        <table className="w-full">
          <thead>
            <tr>
              {weekdays.map((day) => (
                <th
                  key={day}
                  className="p-3 text-sm font-semibold text-gray-700 border-b-2 border-gray-200"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.ceil(calendarMonth.days.length / 7) }, (_, weekIndex) => (
              <tr key={weekIndex}>
                {weekdays.map((_, dayIndex) => {
                  const dayData = calendarMonth.days[weekIndex * 7 + dayIndex];
                  
                  if (!dayData) {
                    return <td key={dayIndex} className="p-2 h-24 border border-gray-100" />;
                  }

                  const isCurrentTime = isSameDay(dayData.date, state.now);
                  const isSelected = isSameDay(dayData.date, selectedDate);
                  const hasEvents = dayData.events.length > 0;
                  const hasUrgentEvents = dayData.events.some(e => e.priority <= 2);

                  return (
                    <td
                      key={dayIndex}
                      className={`p-2 h-24 border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        !dayData.isCurrentMonth ? 'text-gray-300 bg-gray-50' : ''
                      } ${
                        isCurrentTime ? 'bg-blue-100 ring-2 ring-blue-300' : ''
                      } ${
                        isSelected ? 'ring-2 ring-indigo-500' : ''
                      } ${
                        hasUrgentEvents ? 'bg-red-50' : hasEvents ? 'bg-green-50' : ''
                      }`}
                      onClick={() => onDateSelect(dayData.date)}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-1">
                          <div
                            className={`text-sm font-medium ${
                              isCurrentTime ? 'text-blue-700 font-bold' : 
                              !dayData.isCurrentMonth ? 'text-gray-400' : ''
                            }`}
                          >
                            {dayData.date.getDate()}
                          </div>
                          {hasEvents && (
                            <div className="flex items-center space-x-1">
                              {hasUrgentEvents && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                              <span className="text-xs text-gray-500">{dayData.events.length}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-1 flex-1">
                          {dayData.events.slice(0, 4).map((event, index) => (
                            <EventBadge key={`${event.id}-${index}`} event={event} compact />
                          ))}
                          {dayData.events.length > 4 && (
                            <div className="text-xs text-gray-500 bg-gray-200 px-1 rounded">
                              +{dayData.events.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Main Enhanced Calendar View Component
const IntegratedCalendarView: React.FC = () => {
  const { state } = useCalendar();
  const [selectedDate, setSelectedDate] = useState<Date>(state.now);
  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number }>({
    year: state.now.getFullYear(),
    month: state.now.getMonth(),
  });

  // Update selected date when calendar state changes
  useEffect(() => {
    setSelectedDate(state.now);
    setCurrentMonth({
      year: state.now.getFullYear(),
      month: state.now.getMonth(),
    });
  }, [state.now]);

  // Generate calendar month data with events
  const calendarMonth = useMemo((): CalendarMonth => {
    const { year, month } = currentMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfWeek = getFirstDayOfMonth(year, month);
    
    const days: CalendarDay[] = [];

    // Previous month days
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(prevYear, prevMonth, daysInPrevMonth - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, state.now),
        isSelected: isSameDay(date, selectedDate),
        events: [], // Events would be fetched here in real implementation
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, state.now),
        isSelected: isSameDay(date, selectedDate),
        events: [], // Events would be fetched here in real implementation
      });
    }

    // Next month days to fill the grid
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const remainingDays = 42 - days.length;
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(nextYear, nextMonth, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, state.now),
        isSelected: isSameDay(date, selectedDate),
        events: [], // Events would be fetched here in real implementation
      });
    }

    return { year, month, days };
  }, [currentMonth, state.now, selectedDate]);

  // Navigation handlers
  const goToPrevMonth = () => {
    setCurrentMonth(prev => ({
      year: prev.month === 0 ? prev.year - 1 : prev.year,
      month: prev.month === 0 ? 11 : prev.month - 1,
    }));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => ({
      year: prev.month === 11 ? prev.year + 1 : prev.year,
      month: prev.month === 11 ? 0 : prev.month + 1,
    }));
  };

  const goToToday = () => {
    setSelectedDate(state.now);
    setCurrentMonth({
      year: state.now.getFullYear(),
      month: state.now.getMonth(),
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrevMonth();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextMonth();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToToday();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">⚽ Football Manager Calendar</h1>
          <p className="text-gray-600">Manage your season timeline and important events</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPrevMonth}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={goToToday}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                📍 Today
              </button>
              <button
                onClick={goToNextMonth}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
              >
                Next →
              </button>
            </div>

            <MonthGrid
              calendarMonth={calendarMonth}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Current Time Display */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <span>🕐</span>
                <span>Current Time</span>
              </h3>
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {formatDateTime(state.now)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>Season: <span className="font-medium">{state.currentSeason}</span></div>
                <div>Matchday: <span className="font-medium">{state.currentMatchday}</span></div>
                <div>Status: <span className={`font-medium ${state.paused ? 'text-red-600' : 'text-green-600'}`}>
                  {state.paused ? 'Paused' : 'Running'}
                </span></div>
                <div>Speed: <span className="font-medium">{state.speed}</span></div>
              </div>
            </div>

            {/* Blocking Events Banner */}
            <BlockingEventsBanner />

            {/* Speed Selector */}
            <div className="bg-white rounded-lg shadow p-4">
              <SpeedSelector />
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <span>🎮</span>
                <span>Controls</span>
              </h3>
              <Controls />
            </div>

            {/* Agenda */}
            <div className="bg-white rounded-lg shadow p-4">
              <Agenda selectedDate={selectedDate} />
            </div>

            {/* History */}
            <div className="bg-white rounded-lg shadow p-4">
              <History />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedCalendarView;