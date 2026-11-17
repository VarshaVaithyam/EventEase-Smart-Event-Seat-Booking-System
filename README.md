# EventEase – Smart Event Seat Booking System

**EventEase** is a full-stack event seat booking application that allows users to explore events, select seats, and book tickets easily. It prevents double bookings using database-level locking and temporary seat reservations.

## Features

- **User Roles:** Separate access for Organizers and Attendees.
- **Event Management:** Organizers can create and manage events.
- **Interactive Seat Selection:** View available, held, and booked seats.
- **Temporary Seat Hold:** Selected seats are held for 5 minutes.
- **Double-Booking Prevention:** Prevents multiple users from booking the same seat.
- **Automatic Seat Release:** Expired seat holds are automatically released.
- **Booking Management:** View booking history and cancel tickets.
- **QR Code Tickets:** Generate and verify digital tickets.
- **AI Event Description:** Generate event descriptions using Google Gemini AI.
- **Analytics Dashboard:** View event bookings and revenue statistics.

## Tech Stack

**Frontend:** React 18, Vite 5, JavaScript, Axios

**Backend:** Java 21, Spring Boot 3.4, Spring Security, JWT

**Database:** PostgreSQL 16, Spring Data JPA, Hibernate

**Additional Tools:** Google Gemini AI, Recharts, ZXing, JUnit, Mockito

## Project Structure

```text
EventEase/
├── frontend/       # React application
├── backend/        # Spring Boot application
├── database/       # Database schema
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Java 21
- Maven 3.9+
- Node.js 18+
- PostgreSQL 16

### 1. Clone the Repository

```bash
git clone <your-github-repository-url>
cd EventEase
```

### 2. Start the Backend

Configure the required database credentials and environment variables before starting.

```bash
cd backend
mvn spring-boot:run
```

Backend runs at: `http://localhost:8080`

### 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

## Sample Data

When `SEED_ENABLED=true`, the application provides:

- 2 sample events (120 seats and 60 seats)
- 32 sample bookings
- Demo Organizer and Attendee accounts

Seed data is enabled by default for testing and project demonstrations.

## Production Configuration

Before deploying EventEase for real-world usage, configure the following environment variables in the backend hosting platform.

| Environment Variable | Requirement | Purpose |
|---|---|---|
| `DB_URL` | Required | Supabase PostgreSQL connection URL |
| `DB_USERNAME` | Required | Supabase database username |
| `DB_PASSWORD` | Required | Supabase database password |
| `JWT_SECRET` | Required | Secure secret key for authentication |
| `SEED_ENABLED` | Required | Set to `false` for real deployment |
| `GEMINI_API_KEY` | Optional | Enables AI event description generation |

### 1. Supabase Database Setup

For real implementation and deployment, provide your Supabase PostgreSQL database connection details.

Configure:
- Database URL
- Database username
- Database password

These credentials allow the Spring Boot backend to connect to the hosted PostgreSQL database.

### 2. Seed Data Configuration

Currently, `SEED_ENABLED=true` is configured for testing and demonstration purposes.

- **Testing/Demo:** Keep `SEED_ENABLED=true` to load sample events and bookings.
- **Real Deployment:** Change it to `SEED_ENABLED=false` to prevent demo data from being inserted.

### 3. Gemini AI Configuration

To enable AI-powered event description generation:

1. Generate an API key from [Google AI Studio](https://aistudio.google.com/).
2. Add it as `GEMINI_API_KEY` in the backend environment variables.
3. The AI description generator will use the Gemini API.

If no API key is configured, the application uses its built-in fallback description generator.

### 4. JWT Authentication Secret

Generate a strong, random secret key for secure JWT authentication.

You can generate one using:

```bash
openssl rand -base64 48
```

Add the generated value as `JWT_SECRET` in the backend environment variables.

**Security Note:** Never commit database credentials, JWT secrets or Gemini API keys to GitHub. Configure them securely in your deployment platform.

## Testing

**Backend:**

```bash
cd backend
mvn test
```

**Frontend:**

```bash
cd frontend
npm test -- --run
```

Tests cover booking operations, concurrent seat requests, and automatic hold expiration.

## Future Enhancement

- Online payments using Razorpay.
- Email notifications for booking confirmations.

---

**EventEase – Book Smart. Reserve Securely. Experience Seamlessly.**

## Important Note – Demo Implementation

Currently, EventEase is developed and configured for **demo and assessment purposes only**. The application uses sample seed data to demonstrate event creation, seat booking, and double-booking prevention.

For real-world implementation and production deployment, the following configurations are required:

- **Supabase Configuration:** Connect a Supabase PostgreSQL database using the actual database URL, username, and password.
- **JWT Authentication:** Generate and configure a secure JWT secret key for authentication.
- **Seed Data:** Change `SEED_ENABLED=true` to `SEED_ENABLED=false` to disable demo data in the production environment.
- **Gemini AI:** Configure a valid `GEMINI_API_KEY` to enable AI-powered event description generation.

**Note:** These configurations are required before using EventEase as a real-world application. The current setup is intended for demonstration and evaluation.