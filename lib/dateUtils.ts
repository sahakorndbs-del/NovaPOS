/**
 * Utilities for formatting and comparing dates based on user's local timezone
 */

export const getLocalDateString = (dateInput?: string | Date | number): string => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalMonthString = (dateInput?: string | Date | number): string => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const isToday = (dateInput: string | Date | number): boolean => {
  return getLocalDateString(dateInput) === getLocalDateString(new Date());
};

export const isYesterday = (dateInput: string | Date | number): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(dateInput) === getLocalDateString(yesterday);
};

export const isThisMonth = (dateInput: string | Date | number): boolean => {
  return getLocalMonthString(dateInput) === getLocalMonthString(new Date());
};

export const formatThaiDate = (dateInput: string | Date | number, includeTime: boolean = false): string => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
  };
  return d.toLocaleDateString('th-TH', options);
};

export const formatThaiTime = (dateInput: string | Date | number): string => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
};
