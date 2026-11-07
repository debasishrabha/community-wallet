# Community Points Wallet

A full-stack wallet application that allows users to manage personal points, transfer points between users, and participate in group wallet activities with leader-approved withdrawals.

## Tech Stack

**Backend:** Node.js, Express.js, Prisma ORM

**Frontend:** React, Vite, Axios

**Database:** PostgreSQL

**Authentication:** OTP verification and JWT

## Features

- Mobile number and OTP-based authentication.
- Personal wallet balance management.
- Point transfers between users.
- Transaction history with pagination.
- Group creation and member management.
- Group wallet contributions.
- Withdrawal requests with leader approval or rejection.
- Pending withdrawal and expiry handling.

## Project Structure

```text
community-wallet/
├── backend/
├── frontend/
├── README.md
├── NOTES.md
├── REVIEW.md
├── .gitignore
└── .env.example
```

## Run Locally

### Backend

```bash
cd backend
npm install
```

Configure the backend environment variables in `backend/.env`, then run:

```bash
npx prisma migrate deploy
npx prisma generate
npm start
```

Backend URL: `http://localhost:5000`

Health check: `http://localhost:5000/health`

### Frontend

Open another terminal:

```bash
cd frontend
npm install
```

Configure `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

Open the URL displayed in the terminal, usually `http://localhost:5173`.

## Test Login Credentials

| User | Mobile Number | OTP |
|---|---|---|
| Test User 1 | 9000000001 | 123456 |
| Test User 2 | 9000000002 | 123456 |

Test User 1 is the leader of the existing test group, and Test User 2 is a group member.

The fixed OTP is intended for development and testing.

## Environment Variables

See `.env.example` for the required environment variable names. Never commit actual `.env` files or secrets.

## Running Tests

Run the tests using the test scripts configured in the respective `package.json` files.

## Deployment

Public frontend and backend URLs will be added after deployment.
