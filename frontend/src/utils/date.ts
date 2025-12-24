/**
 * Formats a date string into a human-readable relative time format.
 *
 * @param dateString - ISO date string to format
 * @returns Formatted string like "Today", "Yesterday", "3d ago", "2w ago", or locale date
 */
export const formatRelativeDate = (dateString: string | null): string | null => {
  if (!dateString) return null;

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
};
