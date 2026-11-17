import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import CommandPalette from './components/CommandPalette';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UpcomingEventsPage from './pages/UpcomingEventsPage';
import EventDetailsPage from './pages/EventDetailsPage';
import ProfilePage from './pages/ProfilePage';

import AttendeeDashboardPage from './pages/attendee/AttendeeDashboardPage';
import SeatSelectionPage from './pages/attendee/SeatSelectionPage';
import BookingConfirmationPage from './pages/attendee/BookingConfirmationPage';
import MyBookingsPage from './pages/attendee/MyBookingsPage';
import BookingDetailsPage from './pages/attendee/BookingDetailsPage';

import OrganizerDashboardPage from './pages/organizer/OrganizerDashboardPage';
import CreateEventPage from './pages/organizer/CreateEventPage';
import ManageEventsPage from './pages/organizer/ManageEventsPage';
import EventBookingDetailsPage from './pages/organizer/EventBookingDetailsPage';
import EventAnalyticsPage from './pages/organizer/EventAnalyticsPage';
import BookingSettingsPage from './pages/organizer/BookingSettingsPage';
import TicketCheckInPage from './pages/organizer/TicketCheckInPage';

function AppShellWithPalette() {
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = () => setCmdOpen(true);
    window.addEventListener('eventease:open-cmd', handler);
    return () => window.removeEventListener('eventease:open-cmd', handler);
  }, []);

  return (
    <>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <Routes>
        {/* Public Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/events" element={<UpcomingEventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />

        {/* Shared Protected Profile Page */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['ATTENDEE', 'ORGANIZER']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Attendee Protected Pages */}
        <Route
          path="/attendee/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ATTENDEE']}>
              <AttendeeDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/book"
          element={
            <ProtectedRoute allowedRoles={['ATTENDEE']}>
              <SeatSelectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendee/bookings/:id/confirmation"
          element={
            <ProtectedRoute allowedRoles={['ATTENDEE']}>
              <BookingConfirmationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendee/bookings"
          element={
            <ProtectedRoute allowedRoles={['ATTENDEE']}>
              <MyBookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendee/bookings/:id"
          element={
            <ProtectedRoute allowedRoles={['ATTENDEE', 'ORGANIZER']}>
              <BookingDetailsPage />
            </ProtectedRoute>
          }
        />

        {/* Organizer Protected Pages */}
        <Route
          path="/organizer/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <OrganizerDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/new"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <CreateEventPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <ManageEventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/events/:id/bookings"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <EventBookingDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/check-in"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <TicketCheckInPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/analytics"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <EventAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organizer/settings"
          element={
            <ProtectedRoute allowedRoles={['ORGANIZER']}>
              <BookingSettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppShellWithPalette />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
