/**
 * Formats a Date object to "h:mm AM/PM" string.
 */
export const formatTime = (date: Date | string | null): string => {
  if (!date) return '--:--';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--:--';
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const m = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${h}:${m} ${ampm}`;
};

/**
 * Calculates the total worked hours between two ISO date strings.
 * Returns a formatted "HH:MM" string.
 */
export const calculateTotalHours = (
  checkInTime: string | null,
  checkOutTime: string | null,
): string => {
  if (!checkInTime) return '--:--';
  const checkIn = new Date(checkInTime);
  const checkOut = checkOutTime ? new Date(checkOutTime) : new Date();
  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs <= 0) return '--:--';
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
};
