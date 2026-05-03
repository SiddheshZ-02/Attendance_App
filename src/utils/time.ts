import { format, differenceInMinutes, parseISO } from 'date-fns';

/**
 * Formats a Date object or ISO string to "h:mm a" string.
 */
export const formatTime = (date: Date | string | null): string => {
  if (!date) return '--:--';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(d.getTime())) return '--:--';
    return format(d, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return '--:--';
  }
};

/**
 * Calculates the total worked hours between two ISO date strings or Date objects.
 * Returns a formatted "HH:MM" string.
 */
export const calculateTotalHours = (
  checkInTime: string | Date | null,
  checkOutTime: string | Date | null,
): string => {
  if (!checkInTime) return '--:--';
  
  try {
    const checkIn = typeof checkInTime === 'string' ? parseISO(checkInTime) : checkInTime;
    const checkOut = checkOutTime 
      ? (typeof checkOutTime === 'string' ? parseISO(checkOutTime) : checkOutTime)
      : new Date();
      
    const totalMinutes = differenceInMinutes(checkOut, checkIn);
    if (totalMinutes <= 0) return '00:00';
    
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    
    return `${h < 10 ? '0' + h : h}:${m < 10 ? '0' + m : m}`;
  } catch (error) {
    console.error('Error calculating hours:', error);
    return '--:--';
  }
};

/**
 * Formats working hours decimal to "Xh Ym" string.
 */
export const formatHoursLabel = (decimalHours: number | null): string => {
  if (decimalHours === null || isNaN(decimalHours)) return '--:--';
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  return `${h}h ${m}m`;
};
