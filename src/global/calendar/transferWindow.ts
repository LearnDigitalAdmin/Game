// src/global/calendar/transferWindow.ts
// Mirrors the window dates Calendar.tsx already schedules OPEN/CLOSE events
// for (summer: Jul 1 - Aug 31, winter: Jan 1 - Jan 31), as a plain function
// callable from anywhere that needs to know "is the window open right now"
// without depending on calendar event-processing having already run.

export type TransferWindow = 'summer' | 'winter' | null;

export function currentTransferWindow(date: Date): TransferWindow {
  const month = date.getMonth(); // 0-indexed
  if (month === 6 || month === 7) return 'summer'; // Jul, Aug
  if (month === 0) return 'winter'; // Jan
  return null;
}

export function isTransferWindowOpen(date: Date): boolean {
  return currentTransferWindow(date) !== null;
}
