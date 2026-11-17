import React, { useMemo, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

/**
 * Reusable Interactive Auditorium Seat Map Component.
 * Visual color indicators (Strictly matching specification):
 * - Green (.available): AVAILABLE
 * - Blue (.selected / .held-self): Selected by current attendee or held by current attendee
 * - Orange (.held): Temporarily HELD by another attendee
 * - Red (.booked): BOOKED
 */
export default function SeatGrid({
  seats = [],
  selectedSeatIds = [],
  onToggleSeat,
  interactive = true,
  hasActiveHold = false,
  highlightStatus = 'ALL'
}) {
  const [zoom, setZoom] = useState(1);

  const rowsMap = useMemo(() => {
    const grouped = new Map();
    for (const seat of seats) {
      if (!grouped.has(seat.rowLabel)) {
        grouped.set(seat.rowLabel, []);
      }
      grouped.get(seat.rowLabel).push(seat);
    }
    for (const list of grouped.values()) {
      list.sort((a, b) => a.seatNumber - b.seatNumber);
    }
    return Array.from(grouped.entries());
  }, [seats]);

  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);

  return (
    <div>
      <div className="auditorium-stage-wrap">
        <div className="stage-arc" aria-hidden="true" />
        <div className="stage-banner" aria-label="Stage front indicator">
          STAGE / AUDITORIUM PROJECTION SCREEN
        </div>
      </div>

      <div className="seat-legend" aria-label="Seat status legend">
        <span className="legend-item">
          <span className="legend-swatch swatch-available" />
          Available (Green)
        </span>
        <span className="legend-item">
          <span className="legend-swatch swatch-selected" />
          Selected / Your Hold (Blue)
        </span>
        <span className="legend-item">
          <span className="legend-swatch swatch-held" />
          Temporarily Held (Orange)
        </span>
        <span className="legend-item">
          <span className="legend-swatch swatch-booked" />
          Booked (Red)
        </span>

        {seats.length > 24 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.25rem 0.5rem' }}
              onClick={() => setZoom((z) => Math.max(0.75, +(z - 0.1).toFixed(2)))}
              title="Zoom out auditorium"
              aria-label="Zoom out auditorium"
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: '38px', textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.25rem 0.5rem' }}
              onClick={() => setZoom((z) => Math.min(1.25, +(z + 0.1).toFixed(2)))}
              title="Zoom in auditorium"
              aria-label="Zoom in auditorium"
            >
              <ZoomIn size={13} />
            </button>
            {zoom !== 1 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.5rem' }}
                onClick={() => setZoom(1)}
                title="Reset zoom"
                aria-label="Reset zoom"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </span>
        )}
      </div>

      <div className="seat-rows-scroll">
        <div
          className="seat-rows-container"
          role="group"
          aria-label="Interactive seat map"
          style={zoom !== 1 ? { transform: `scale(${zoom})`, marginBottom: `${(zoom - 1) * 180}px` } : undefined}
        >
          {rowsMap.map(([rowLabel, rowSeats]) => {
            const aisleAfterIndex = rowSeats.length >= 8 ? Math.floor(rowSeats.length / 2) - 1 : -1;

            return (
              <div key={rowLabel} className="seat-row">
                <span className="row-label-tag" aria-hidden="true">
                  {rowLabel}
                </span>
                {rowSeats.map((seat, idx) => {
                  const isSelected = selectedSet.has(seat.id);
                  const isHeldBySelf = Boolean(seat.heldByCurrentUser);
                  const isAvailable = seat.status === 'AVAILABLE';
                  const isBooked = seat.status === 'BOOKED';
                  const isHeldOther = seat.status === 'HELD' && !isHeldBySelf;

                  let stateClass = 'available';
                  if (isSelected) stateClass = 'selected';
                  else if (isHeldBySelf) stateClass = 'selected';
                  else if (isHeldOther) stateClass = 'held';
                  else if (isBooked) stateClass = 'booked';

                  const disabled = !interactive || hasActiveHold || !isAvailable;

                  const dimmed =
                    highlightStatus !== 'ALL' &&
                    !(
                      (highlightStatus === 'AVAILABLE' && isAvailable) ||
                      (highlightStatus === 'HELD' && (isHeldOther || isHeldBySelf)) ||
                      (highlightStatus === 'BOOKED' && isBooked)
                    );

                  const statusDescription = isSelected
                    ? 'Selected by you'
                    : isHeldBySelf
                    ? 'Temporarily held by you'
                    : isHeldOther
                    ? 'Temporarily held by another attendee'
                    : isBooked
                    ? 'Booked'
                    : 'Available';

                  return (
                    <React.Fragment key={seat.id}>
                      <button
                        type="button"
                        data-testid={`seat-${seat.seatCode}`}
                        className={`seat-btn ${stateClass}`}
                        style={dimmed ? { opacity: 0.28 } : undefined}
                        disabled={disabled}
                        onClick={() => {
                          if (!disabled && onToggleSeat) {
                            onToggleSeat(seat);
                          }
                        }}
                        aria-label={`Seat ${seat.seatCode}, Row ${seat.rowLabel} Seat ${seat.seatNumber} — ${statusDescription}`}
                        aria-pressed={isSelected || isHeldBySelf}
                        title={`${seat.seatCode} • Row ${seat.rowLabel}, Seat ${seat.seatNumber} • ${statusDescription}`}
                      >
                        {seat.seatCode}
                      </button>
                      {idx === aisleAfterIndex && (
                        <span className="seat-aisle-spacer" aria-hidden="true" />
                      )}
                    </React.Fragment>
                  );
                })}
                <span className="row-label-tag" aria-hidden="true">
                  {rowLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
