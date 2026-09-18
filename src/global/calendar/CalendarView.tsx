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

// Mobile-optimized Event Badge Component
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
        className={`inline-block px-1 py-0.5 text-xs font-bold rounded cursor-pointer hover:opacity-80 active:scale-95 transition-all ${colorClass}`}
        title={`${event.description} - ${formatTime(new Date(event.runAt))}`}
        onClick={onClick}
      >
        {icon}
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer hover:opacity-90 active:scale-95 transition-all ${colorClass}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3">
        <span className="text-xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{event.description}</div>
          <div className="text-xs opacity-75">{formatTime(new Date(event.runAt))}</div>
          {event.requiresUser && (
            <div className="text-xs font-bold mt-1">ACTION REQUIRED</div>
          )}
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
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

// Mobile-optimized Speed Selector
const SpeedSelector: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { state, setSpeed } = useCalendar();
  
  const speeds: { value: Speed; label: string; description: string }[] = [
    { value: 'slow', label: '🐌 Slow', description: '3 sec/hour' },
    { value: 'default', label: '⏩ Normal', description: '1 sec/hour' },
    { value: 'fast', label: '⚡ Fast', description: '0.5 sec/hour' },
    { value: 'faster', label: '🚀 Faster', description: '0.2 sec/hour' },
    { value: 'holiday', label: '🏖️ Holiday', description: 'Skip to events' },
  ];

  const handleSpeedChange = (value: Speed) => {
    setSpeed(value);
    onClose?.();
  };

  return (
    <div className="space-y-3">
      <label className="block text-lg font-medium text-gray-700">Game Speed</label>
      <div className="grid grid-cols-1 gap-2">
        {speeds.map(({ value, label, description }) => (
          <button
            key={value}
            onClick={() => handleSpeedChange(value)}
            className={`text-left p-4 rounded-lg border transition-all active:scale-95 ${
              state.speed === value
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium text-lg">{label}</div>
            <div className="text-sm text-gray-500">{description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Mobile-optimized Controls
const Controls: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const handleAction = (action: () => void) => {
    action();
    onClose?.();
  };

  return (
    <div className="space-y-4">
      {/* Primary Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleAction(state.paused ? play : pause)}
          className={`p-4 rounded-lg font-medium text-lg transition-all active:scale-95 ${
            state.paused
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {state.paused ? '▶️ Play' : '⏸️ Pause'}
        </button>
        
        <button
          onClick={() => handleAction(nextHour)}
          disabled={!state.paused}
          className="p-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium text-lg transition-all active:scale-95"
        >
          ⏭️ Next Hour
        </button>
      </div>

      {/* Secondary Controls */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleAction(nextDay)}
          className="p-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-lg transition-all active:scale-95"
        >
          📅 Next Day
        </button>
        
        <button
          onClick={() => handleAction(nextMatch)}
          className="p-4 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-lg transition-all active:scale-95"
        >
          ⚽ Next Match
        </button>
      </div>

      {/* Advanced Controls Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all active:scale-95"
      >
        {showAdvanced ? '▼ Hide Advanced' : '▶ Advanced Controls'}
      </button>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="space-y-4 border-t pt-4">
          <div>
            <label className="block text-lg font-medium text-gray-700 mb-3">Jump to Date</label>
            <div className="space-y-3">
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleFastForwardToDate}
                disabled={!customDate}
                className="w-full p-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg font-medium text-lg transition-all active:scale-95"
              >
                Jump
              </button>
            </div>
          </div>

          <button
            onClick={() => handleAction(syncWithDatabase)}
            className="w-full p-4 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium text-lg transition-all active:scale-95"
          >
            🔄 Sync with Database
          </button>

          {__debugSeedEvents && (
            <button
              onClick={() => handleAction(__debugSeedEvents)}
              className="w-full p-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-lg transition-all active:scale-95"
            >
              🐛 Debug: Seed Sample Events
            </button>
          )}
        </div>
      )}

      {state.speed === 'holiday' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🏖️</span>
            <span className="font-medium text-lg">Holiday Mode Active</span>
          </div>
          <div className="text-sm mt-1">Time advances automatically to next events</div>
        </div>
      )}
    </div>
  );
};

// Mobile-optimized Blocking Events Banner
const BlockingEventsBanner: React.FC = () => {
  const blockingEvents = useBlockingEvents();
  const { resolve } = useCalendar();

  if (blockingEvents.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-red-500 text-2xl">⚠️</span>
        <h4 className="font-semibold text-red-800 text-lg">
          {blockingEvents.length} Action{blockingEvents.length > 1 ? 's' : ''} Required
        </h4>
      </div>
      
      <div className="space-y-4">
        {blockingEvents.map((event) => (
          <div key={event.id} className="bg-white rounded-lg p-4 border border-red-200">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-xl">{getEventTypeIcon(event.type)}</span>
                <div className="flex-1">
                  <div className="font-medium text-lg">{event.description}</div>
                  <div className={`inline-block px-2 py-1 rounded text-sm font-medium mt-1 ${
                    event.priority <= 2 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    Priority {event.priority}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Scheduled: {formatDateTime(new Date(event.runAt))}
                  </div>
                </div>
              </div>
              
              {/* Event-specific details */}
              {event.type === 'MATCH' && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div className="font-medium">Match Details:</div>
                  <div>Competition: {(event.payload as any).competition}</div>
                  <div>Matchday: {(event.payload as any).matchday}</div>
                </div>
              )}
              
              {event.type === 'TRANSFER_DECISION' && (
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div className="font-medium">Transfer Offer:</div>
                  <div>Player: {(event.payload as any).playerName}</div>
                  <div>Fee: £{(event.payload as any).fee?.toLocaleString()}</div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => resolve(event.id, 'DONE')}
                className="p-3 bg-green-500 hover:bg-green-600 text-white text-lg rounded-lg font-medium transition-all active:scale-95"
              >
                ✅ Accept
              </button>
              <button
                onClick={() => resolve(event.id, 'CANCELLED')}
                className="p-3 bg-red-500 hover:bg-red-600 text-white text-lg rounded-lg font-medium transition-all active:scale-95"
              >
                ❌ Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mobile-optimized Month Grid
const MonthGrid: React.FC<{
  calendarMonth: CalendarMonth;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}> = ({ calendarMonth, selectedDate, onDateSelect }) => {
  const { state } = useCalendar();
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-xl font-bold text-gray-800">
          {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric',
          })}
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full min-w-full">
          <thead>
            <tr>
              {weekdays.map((day) => (
                <th
                  key={day}
                  className="p-3 text-lg font-semibold text-gray-700 border-b-2 border-gray-200 min-w-[50px]"
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
                    return <td key={dayIndex} className="p-2 h-16 md:h-20 border border-gray-100 min-w-[50px]" />;
                  }

                  const isCurrentTime = isSameDay(dayData.date, state.now);
                  const isSelected = isSameDay(dayData.date, selectedDate);
                  const hasEvents = dayData.events.length > 0;
                  const hasUrgentEvents = dayData.events.some(e => e.priority <= 2);

                  return (
                    <td
                      key={dayIndex}
                      className={`p-1 md:p-2 h-16 md:h-20 border border-gray-100 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors min-w-[50px] ${
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
                      <div className="flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between">
                          <div
                            className={`text-base md:text-lg font-medium ${
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
                        
                        <div className="flex flex-wrap gap-0.5">
                          {dayData.events.slice(0, 2).map((event, index) => (
                            <EventBadge key={`${event.id}-${index}`} event={event} compact />
                          ))}
                          {dayData.events.length > 2 && (
                            <div className="text-xs text-gray-500 bg-gray-200 px-1 rounded">
                              +{dayData.events.length - 2}
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

// Mobile Bottom Sheet/Modal Component
const MobileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-t-2xl md:rounded-2xl overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl p-2 active:scale-95 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Enhanced Agenda Component
const Agenda: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
  const events = useDayEvents(selectedDate);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          📅 {formatDate(selectedDate)}
        </h3>
        
        {events.length === 0 ? (
          <div className="text-gray-500 italic text-center py-8 bg-gray-50 rounded-lg">
            <div className="text-4xl mb-2">🌙</div>
            <div className="text-lg">No events scheduled</div>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
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
      </div>

      {/* Event Detail Modal */}
      <MobileModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Event Details"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{getEventTypeIcon(selectedEvent.type)}</span>
              <div className="flex-1">
                <h3 className="font-bold text-xl">{selectedEvent.description}</h3>
                <p className="text-lg text-gray-600">{selectedEvent.type}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-lg font-medium text-gray-700">Scheduled Time</label>
                <div className="text-xl">{formatDateTime(new Date(selectedEvent.runAt))}</div>
              </div>
              
              <div>
                <label className="block text-lg font-medium text-gray-700">Priority</label>
                <div className={`inline-block px-3 py-2 rounded text-lg ${
                  selectedEvent.priority <= 2 ? 'bg-red-100 text-red-800' : 
                  selectedEvent.priority === 3 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-gray-100 text-gray-700'
                }`}>
                  Level {selectedEvent.priority}
                </div>
              </div>
              
              {selectedEvent.requiresUser && (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <div className="font-medium text-orange-800 text-lg">⚠️ Action Required</div>
                  <div className="text-base text-orange-700">This event requires your attention when it occurs.</div>
                </div>
              )}
              
              <div>
                <label className="block text-lg font-medium text-gray-700">Details</label>
                <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </MobileModal>
    </>
  );
};

// Enhanced History Component
const History: React.FC = () => {
  const recentLog = useRecentLog(10);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">📜 Recent Activity</h3>
      
      {recentLog.length === 0 ? (
        <div className="text-gray-500 italic text-center py-4 text-lg">
          No recent activity
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {recentLog.map((entry: any) => (
            <div
              key={entry.id}
              className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getEventTypeIcon(entry.type as CalendarEventType)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-base truncate">{entry.description}</div>
                  <div className="text-sm text-gray-600">
                    {formatDateTime(new Date(entry.occurred_at))}
                  </div>
                </div>
                <span className="text-lg text-gray-400">
                  {expandedEntry === entry.id ? '▼' : '▶'}
                </span>
              </div>
              
              {expandedEntry === entry.id && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-base space-y-2">
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

// Main Mobile-Optimized Calendar Component
const IntegratedCalendarView: React.FC = () => {
  const { state } = useCalendar();
  const [selectedDate, setSelectedDate] = useState<Date>(state.now);
  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number }>({
    year: state.now.getFullYear(),
    month: state.now.getMonth(),
  });
  const [activeModal, setActiveModal] = useState<string | null>(null);

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

  // Touch navigation support
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = Math.abs(touch.clientY - touchStart.y);
    
    // Only process horizontal swipes (ignore if too much vertical movement)
    if (deltaY < 100 && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        goToPrevMonth();
      } else {
        goToNextMonth();
      }
    }
    
    setTouchStart(null);
  };

  const closeModal = () => setActiveModal(null);

  return (
    <div  className="col-span-12 p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">⚽ FM Calendar</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveModal('speed')}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium active:scale-95 transition-all"
            >
              {state.speed === 'default' ? '⏩' : state.speed === 'slow' ? '🐌' : state.speed === 'fast' ? '⚡' : state.speed === 'faster' ? '🚀' : '🏖️'}
            </button>
            <button
              onClick={() => setActiveModal('controls')}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium active:scale-95 transition-all"
            >
              🎮
            </button>
          </div>
        </div>
        
        {/* Current Time Compact Display */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="font-bold text-blue-600 text-base">
                {formatTime(state.now)}
              </div>
              <div className="text-gray-600">{state.now.toLocaleDateString()}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-700">S{state.currentSeason} MD{state.currentMatchday}</div>
              <div className={`text-sm font-medium ${state.paused ? 'text-red-600' : 'text-green-600'}`}>
                {state.paused ? 'Paused' : 'Running'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blocking Events */}
      <div className="p-4">
        <BlockingEventsBanner />
      </div>

      {/* Calendar Navigation */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrevMonth}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg font-medium transition-all text-lg active:scale-95"
          >
            ←
          </button>
          <button
            onClick={goToToday}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-lg font-medium transition-all active:scale-95"
          >
            📍 Today
          </button>
          <button
            onClick={goToNextMonth}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg font-medium transition-all text-lg active:scale-95"
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div 
        className="px-4 mb-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <MonthGrid
          calendarMonth={calendarMonth}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setActiveModal('agenda')}
            className="p-3 bg-green-50 hover:bg-green-100 active:bg-green-200 text-green-700 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>📅</span>
            <span>Events</span>
          </button>
          <button
            onClick={() => setActiveModal('history')}
            className="p-3 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 text-purple-700 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>📜</span>
            <span>History</span>
          </button>
          <button
            onClick={state.paused ? () => {} : () => {}} // Will be handled by controls modal
            className={`p-3 rounded-lg font-medium transition-all active:scale-95 flex items-center justify-center space-x-2 ${
              state.paused
                ? 'bg-green-50 hover:bg-green-100 active:bg-green-200 text-green-700'
                : 'bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700'
            }`}
          >
            <span>{state.paused ? '▶️' : '⏸️'}</span>
            <span>{state.paused ? 'Play' : 'Pause'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Modals */}
      <MobileModal
        isOpen={activeModal === 'speed'}
        onClose={closeModal}
        title="Game Speed"
      >
        <SpeedSelector onClose={closeModal} />
      </MobileModal>

      <MobileModal
        isOpen={activeModal === 'controls'}
        onClose={closeModal}
        title="Game Controls"
      >
        <Controls onClose={closeModal} />
      </MobileModal>

      <MobileModal
        isOpen={activeModal === 'agenda'}
        onClose={closeModal}
        title="Day Events"
      >
        <Agenda selectedDate={selectedDate} />
      </MobileModal>

      <MobileModal
        isOpen={activeModal === 'history'}
        onClose={closeModal}
        title="Recent Activity"
      >
        <History />
      </MobileModal>

      {/* Desktop Layout (for larger screens) */}
      <div className="hidden lg:block px-4 pb-4">
        <div className="grid grid-cols-4 gap-6">
          {/* Sidebar content for desktop */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-4">
              <SpeedSelector />
            </div>
            
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3">🎮 Controls</h3>
              <Controls />
            </div>
          </div>
          
          <div className="col-span-2">
            <div className="bg-white rounded-lg shadow p-4">
              <Agenda selectedDate={selectedDate} />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <History />
          </div>
        </div>
      </div>

      {/* Gesture Instructions (hidden after first interaction) */}
      <div className="lg:hidden fixed bottom-20 left-4 right-4 bg-black bg-opacity-75 text-white text-center p-2 rounded text-sm opacity-50 pointer-events-none">
        💡 Swipe left/right to navigate months
      </div>
    </div>
  )};

  export default IntegratedCalendarView;    