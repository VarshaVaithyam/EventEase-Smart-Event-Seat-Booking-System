export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatShortDate(isoString) {
  if (!isoString) return { month: 'TBD', day: '--', weekday: '' };
  const date = new Date(isoString);
  return {
    month: date.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
    day: date.toLocaleString('en-IN', { day: '2-digit' }),
    weekday: date.toLocaleString('en-IN', { weekday: 'short' })
  };
}

export function formatCurrency(amount) {
  const num = Number(amount || 0);
  if (num === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

export function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function buildIcsCalendarFile(event, seats = [], bookingRef = '') {
  if (!event || !event.eventDate) return '';
  const start = new Date(event.eventDate);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const toIcsUtc = (d) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');

  const seatNote = seats.length > 0 ? ` | Seats: ${seats.join(', ')}` : '';
  const refNote = bookingRef ? `Booking Reference: ${bookingRef}\\n` : '';
  const cleanDesc = (event.description || 'EventEase Reservation')
    .replace(/\r?\n/g, '\\n')
    .slice(0, 400);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventEase//Smart Event Seat Booking//EN',
    'BEGIN:VEVENT',
    `UID:${bookingRef || `event-${event.id || Date.now()}`}@eventease.dev`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${event.name || event.eventName}${seatNote}`,
    `LOCATION:${event.venue || ''}`,
    `DESCRIPTION:${refNote}${cleanDesc}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Smart Best-Together Seat Finder:
 * Scans auditorium rows from front-center outward to find `count` adjacent AVAILABLE seats
 * in the same row, falling back to the closest available cluster near center stage.
 */
export function findBestAvailableSeats(seats = [], count = 2) {
  const available = seats.filter((s) => s.status === 'AVAILABLE');
  if (available.length === 0 || count <= 0) return [];
  const target = Math.min(count, available.length);

  // Group all seats by row so we know the exact center seat number of each row
  const rowsMap = new Map();
  for (const s of seats) {
    if (!rowsMap.has(s.rowLabel)) rowsMap.set(s.rowLabel, []);
    rowsMap.get(s.rowLabel).push(s);
  }
  const rowEntries = Array.from(rowsMap.entries());

  let bestBlock = null;
  let bestScore = Infinity;

  rowEntries.forEach(([, rowSeats], rowIdx) => {
    const sorted = [...rowSeats].sort((a, b) => a.seatNumber - b.seatNumber);
    const maxNum = sorted[sorted.length - 1]?.seatNumber || 1;
    const center = (maxNum + 1) / 2;

    // Prefer rows slightly back from extreme front (row index 1..3 ideal) then front-to-back
    const idealRowPenalty = Math.abs(rowIdx - Math.min(2, Math.floor(rowEntries.length / 3))) * 1.35;

    for (let i = 0; i <= sorted.length - target; i++) {
      const slice = sorted.slice(i, i + target);
      const allAvail = slice.every((s) => s.status === 'AVAILABLE');
      if (!allAvail) continue;

      // Check strict adjacency (consecutive seat numbers)
      let consecutive = true;
      for (let k = 1; k < slice.length; k++) {
        if (slice[k].seatNumber !== slice[k - 1].seatNumber + 1) {
          consecutive = false;
          break;
        }
      }
      if (!consecutive) continue;

      const sliceCenter =
        slice.reduce((acc, s) => acc + s.seatNumber, 0) / slice.length;
      const centerDist = Math.abs(sliceCenter - center);
      const score = idealRowPenalty + centerDist * 0.85;

      if (score < bestScore) {
        bestScore = score;
        bestBlock = slice;
      }
    }
  });

  if (bestBlock) {
    return bestBlock.map((s) => s.id);
  }

  // Fallback if no strictly consecutive block of size `target` exists: pick best individual seats
  const scoredSingles = available.map((s) => {
    const rowIdx = rowEntries.findIndex(([r]) => r === s.rowLabel);
    const rowSeats = rowsMap.get(s.rowLabel) || [s];
    const center = (rowSeats.length + 1) / 2;
    return {
      id: s.id,
      score: Math.abs(rowIdx - 2) * 1.5 + Math.abs(s.seatNumber - center)
    };
  });
  scoredSingles.sort((a, b) => a.score - b.score);
  return scoredSingles.slice(0, target).map((x) => x.id);
}
