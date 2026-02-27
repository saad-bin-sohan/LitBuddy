export function toApiReadingStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'reading' || normalized === 'currently-reading') {
    return 'currently-reading';
  }
  if (normalized === 'completed') {
    return 'completed';
  }
  if (normalized === 'dnf') {
    return 'dnf';
  }

  return 'want-to-read';
}

export function toReadableReadingStatus(status) {
  return String(status || '').trim().toLowerCase().replace(/-/g, ' ');
}
