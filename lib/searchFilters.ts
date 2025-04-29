export interface SearchFilter {
  id: string;
  type: 'size' | 'date' | 'type' | 'extension';
  value: string;
  label: string;
}

export const SIZE_RANGES = [
  { id: 'size_tiny', value: '0-1MB', label: '< 1 MB', min: 0, max: 1024 * 1024 },
  { id: 'size_small', value: '1MB-10MB', label: '1-10 MB', min: 1024 * 1024, max: 10 * 1024 * 1024 },
  { id: 'size_medium', value: '10MB-100MB', label: '10-100 MB', min: 10 * 1024 * 1024, max: 100 * 1024 * 1024 },
  { id: 'size_large', value: '100MB+', label: '> 100 MB', min: 100 * 1024 * 1024, max: Infinity }
];

export const DATE_RANGES = [
  { id: 'date_today', value: 'today', label: 'Today', days: 1 },
  { id: 'date_week', value: 'week', label: 'This Week', days: 7 },
  { id: 'date_month', value: 'month', label: 'This Month', days: 30 },
  { id: 'date_year', value: 'year', label: 'This Year', days: 365 }
];

export const isWithinDateRange = (timestamp: number | undefined, days: number): boolean => {
  if (!timestamp) return false;
  const now = new Date();
  const date = new Date(timestamp);
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days;
};

export const isWithinSizeRange = (size: number | undefined, min: number, max: number): boolean => {
  if (!size) return false;
  return size >= min && size < max;
}; 