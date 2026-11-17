import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import SeatGrid from '../components/SeatGrid';
import ProtectedRoute from '../components/ProtectedRoute';
import { findBestAvailableSeats } from '../utils/formatters';

const memoryMock = new Map();
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(() => Promise.reject(new Error('unauthenticated'))),
    post: vi.fn()
  },
  safeStorage: {
    getItem: (k) => memoryMock.get(k) ?? null,
    setItem: (k, v) => memoryMock.set(k, String(v)),
    removeItem: (k) => memoryMock.delete(k)
  },
  extractErrorMessage: (e) => e?.message || 'error'
}));

import { AuthProvider } from '../context/AuthContext';

const sampleSeats = [
  {
    id: 1,
    eventId: 10,
    rowLabel: 'A',
    seatNumber: 1,
    seatCode: 'A1',
    status: 'AVAILABLE',
    heldByCurrentUser: false
  },
  {
    id: 2,
    eventId: 10,
    rowLabel: 'A',
    seatNumber: 2,
    seatCode: 'A2',
    status: 'HELD',
    heldByCurrentUser: false
  },
  {
    id: 3,
    eventId: 10,
    rowLabel: 'A',
    seatNumber: 3,
    seatCode: 'A3',
    status: 'BOOKED',
    heldByCurrentUser: false
  }
];

describe('SeatGrid Interactive Auditorium Component', () => {
  it('renders available, held, and booked seats with proper visual classes and disabled states', () => {
    render(<SeatGrid seats={sampleSeats} selectedSeatIds={[]} onToggleSeat={() => {}} />);

    const seatA1 = screen.getByTestId('seat-A1');
    const seatA2 = screen.getByTestId('seat-A2');
    const seatA3 = screen.getByTestId('seat-A3');

    expect(seatA1).toHaveClass('available');
    expect(seatA1).not.toBeDisabled();

    expect(seatA2).toHaveClass('held');
    expect(seatA2).toBeDisabled();

    expect(seatA3).toHaveClass('booked');
    expect(seatA3).toBeDisabled();
  });

  it('allows clicking an available seat and marks selected seats in blue', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    const { rerender } = render(
      <SeatGrid seats={sampleSeats} selectedSeatIds={[]} onToggleSeat={onToggle} />
    );

    await user.click(screen.getByTestId('seat-A1'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(sampleSeats[0]);

    rerender(<SeatGrid seats={sampleSeats} selectedSeatIds={[1]} onToggleSeat={onToggle} />);
    expect(screen.getByTestId('seat-A1')).toHaveClass('selected');
  });

  it('prevents selecting seats that are held by another attendee or already booked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(<SeatGrid seats={sampleSeats} selectedSeatIds={[]} onToggleSeat={onToggle} />);

    await user.click(screen.getByTestId('seat-A2'));
    await user.click(screen.getByTestId('seat-A3'));

    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('ProtectedRoute Role Guard', () => {
  it('redirects unauthenticated users away from protected routes to login', () => {
    localStorage.clear();
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/organizer/dashboard']}>
          <Routes>
            <Route path="/login" element={<div>Login Screen</div>} />
            <Route
              path="/organizer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ORGANIZER']}>
                  <div>Secret Organizer Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.queryByText('Secret Organizer Content')).not.toBeInTheDocument();
    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });
});

describe('Smart Best-Together Seat Recommender', () => {
  it('picks adjacent available center seats in the same row', () => {
    const rowSeats = [
      { id: 101, rowLabel: 'B', seatNumber: 1, seatCode: 'B1', status: 'BOOKED' },
      { id: 102, rowLabel: 'B', seatNumber: 2, seatCode: 'B2', status: 'AVAILABLE' },
      { id: 103, rowLabel: 'B', seatNumber: 3, seatCode: 'B3', status: 'AVAILABLE' },
      { id: 104, rowLabel: 'B', seatNumber: 4, seatCode: 'B4', status: 'AVAILABLE' },
      { id: 105, rowLabel: 'B', seatNumber: 5, seatCode: 'B5', status: 'HELD' }
    ];
    const picked = findBestAvailableSeats(rowSeats, 2);
    expect(picked).toHaveLength(2);
    expect(picked).toEqual([102, 103]);
  });
});
