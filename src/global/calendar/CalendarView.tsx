// src/ui/CalendarView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useCalendar, useDayEvents, useRecentLog, type CalendarEvent, type Speed } from './Calendar';

// Types
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

// Utilities
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

// Event Badge Component
const EventBadge: React.FC<{ event: CalendarEvent }> = ({ event }) => {
  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'MATCH':
        return 'bg-blue-500 text-white';
      case 'TRANSFER_DECISION':
        return 'bg-yellow-500 text-black';
      case 'TRAINING':
        return 'bg-green-500 text-white';
      case 'WINDOW_OPEN':
      case 'WINDOW_CLOSE':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getBadgeText = (type: string) => {
    switch (type) {
      case 'MATCH': return 'M';
      case 'TRANSFER_DECISION': return 'T';
      case 'TRAINING': return 'Tr';
      case 'WINDOW_OPEN': return 'W+';
      case 'WINDOW_CLOSE': return 'W-';
      default: return '?';
    }
  };

  return (
    <span
      className={`inline-block px-1 py-0.5 text-xs font-bold rounded ${getBadgeStyle(event.type)}`}
      title={`${event.type} at ${formatTime(new Date(event.runAt))}`}
    >
      {getBadgeText(event.type)}
    </span>
  );
};

// Speed Selector Component
const SpeedSelector: React.FC = () => {
  const { state, setSpeed } = useCalendar();
  
  const speeds: { value: Speed; label: string }[] = [
    { value: 'slow', label: 'Slow' },
    { value: 'default', label: 'Default' },
    { value: 'fast', label: 'Fast' },
    { value: 'faster', label: 'Faster' },
    { value: 'holiday', label: 'Holiday' },
  ];

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Speed</label>
      <select
        value={state.speed}
        onChange={(e) => setSpeed(e.target.value as Speed)}
        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {speeds.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Controls Component
const Controls: React.FC = () => {
  const { state, play, pause, nextHour, nextDay, fastForwardTo, __debugSeedSampleEvents } = useCalendar();

  const handleFastForwardToNextEvent = async () => {
    // This would query for the next event and jump to it
    // For demo purposes, just advance by 6 hours
    const nextEventTime = new Date(state.now);
    nextEventTime.setHours(nextEventTime.getHours() + 6);
    await fastForwardTo(nextEventTime);
  };

  return (
    <div className="space-y-3">
      <div className="flex space-x-2">
        <button
          onClick={state.paused ? play : pause}
          className={`px-4 py-2 rounded font-medium ${
            state.paused
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {state.paused ? 'Play' : 'Pause'}
        </button>
        
        <button
          onClick={nextHour}
          disabled={!state.paused}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded font-medium"
        >
          Next Hour
        </button>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={nextDay}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded font-medium"
        >
          Next Day
        </button>
        
        <button
          onClick={handleFastForwardToNextEvent}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded font-medium"
        >
          Next Event
        </button>
      </div>

      {state.speed === 'holiday' && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded">
          Holiday Mode Active
        </div>
      )}

      {__debugSeedSampleEvents && (
        <button
          onClick={__debugSeedSampleEvents}
          className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
        >
          Debug: Seed Events
        </button>
      )}
    </div>
  );
};

// Agenda Component
const Agenda: React.FC<{ selectedDate: Date }> = ({ selectedDate }) => {
  const events = useDayEvents(selectedDate);

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">
        Agenda for {formatDate(selectedDate)}
      </h3>
      
      {events.length === 0 ? (
        <p className="text-gray-500 italic">No events scheduled</p>
      ) : (
        <div className="space-y-2">
          {events.map((event: { id: React.Key | null | undefined; type: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; runAt: string | number | Date; status: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; requiresUser: any; }) => (
            <div
              key={event.id}
              className="p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{event.type}</span>
                <span className="text-sm text-gray-500">
                  {formatTime(new Date(event.runAt))}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Status: {event.status}
                {event.requiresUser && (
                  <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                    Requires Action
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// History Component
const History: React.FC = () => {
  const recentLog = useRecentLog(5);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Recent History</h3>
      
      {recentLog.length === 0 ? (
        <p className="text-gray-500 italic">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {recentLog.map((entry: { id: any; type: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; occurred_at: string | number | Date; }, index: any) => (
            <div
              key={entry.id || index}
              className="p-2 bg-gray-50 rounded text-sm"
            >
              <div className="font-medium">{entry.type}</div>
              <div className="text-gray-600">
                {formatDateTime(new Date(entry.occurred_at))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Month Grid Component
const MonthGrid: React.FC<{
  calendarMonth: CalendarMonth;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}> = ({ calendarMonth, selectedDate, onDateSelect }) => {
  const { state } = useCalendar();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">
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
                  className="p-2 text-sm font-medium text-gray-700 border-b border-gray-200"
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
                    return <td key={dayIndex} className="p-2 h-20 border border-gray-100" />;
                  }

                  const isCurrentTime = isSameDay(dayData.date, state.now);
                  const isSelected = isSameDay(dayData.date, selectedDate);

                  return (
                    <td
                      key={dayIndex}
                      className={`p-2 h-20 border border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        !dayData.isCurrentMonth ? 'text-gray-300' : ''
                      } ${
                        isCurrentTime ? 'bg-blue-100' : ''
                      } ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => onDateSelect(dayData.date)}
                    >
                      <div className="flex flex-col h-full">
                        <div
                          className={`text-sm font-medium mb-1 ${
                            isCurrentTime ? 'text-blue-700' : ''
                          }`}
                        >
                          {dayData.date.getDate()}
                        </div>
                        <div className="flex flex-wrap gap-1 flex-1">
                          {dayData.events.slice(0, 3).map((event, index) => (
                            <EventBadge key={`${event.id}-${index}`} event={event} />
                          ))}
                          {dayData.events.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{dayData.events.length - 3}
                            </span>
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

// Main Calendar View Component
const CalendarView: React.FC = () => {
  const { state, resolve } = useCalendar();
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

  // Generate calendar month data
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
        events: [], // Would fetch events for this date
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
        events: [], // Would fetch events for this date
      });
    }

    // Next month days to fill the grid
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(nextYear, nextMonth, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, state.now),
        isSelected: isSameDay(date, selectedDate),
        events: [], // Would fetch events for this date
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check for blocking events that need user action
  const blockingEvents: any[] = []; // Would query for TRIGGERED events that require user

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar Grid */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPrevMonth}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                ←
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-medium"
              >
                Today
              </button>
              <button
                onClick={goToNextMonth}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
              >
                →
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
              <h3 className="text-lg font-semibold mb-2">Current Time</h3>
              <div className="text-2xl font-bold text-blue-600">
                {formatDateTime(state.now)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Season {state.seasonYear}
              </div>
            </div>

            {/* Blocking Events Banner */}
            {blockingEvents.length > 0 && (
              <div className="bg-orange-100 border border-orange-400 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800 mb-2">
                  Action Required
                </h4>
                {blockingEvents.map((event: any) => (
                  <div key={event.id} className="mb-2">
                    <div className="text-sm font-medium">{event.type}</div>
                    <div className="flex space-x-2 mt-1">
                      <button
                        onClick={() => resolve(event.id, 'DONE')}
                        className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => resolve(event.id, 'CANCELLED')}
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Speed Selector */}
            <div className="bg-white rounded-lg shadow p-4">
              <SpeedSelector />
            </div>

            {/* Controls */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3">Controls</h3>
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

export default CalendarView;