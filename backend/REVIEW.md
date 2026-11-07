# Backend Review – Community Points Wallet

## 1. Project Overview

The backend of Community Points Wallet is developed using Node.js, Express.js, PostgreSQL, and Prisma ORM.

It provides REST APIs for user authentication, personal wallet management, money transfers, transaction history, group wallets, contributions, and withdrawal requests.

The backend follows a modular structure, separating routes, controllers, middleware, configuration, and utility functions to keep the code organized and maintainable.

## 2. Implemented Features

### Authentication
- Mobile number-based OTP authentication.
- OTP verification before login.
- JWT-based authentication.
- Protected API routes using authentication middleware.

### Personal Wallet
- View wallet balance, pending amount, and available balance.
- Transfer points to another registered user.
- View transaction history with pagination.
- Idempotency key support for transfer requests to prevent duplicate transactions.

### Group Wallet
- Create groups and view groups associated with the logged-in user.
- Add members to a group.
- Allow members to contribute points to the group wallet.
- Request withdrawals from the group wallet.
- Allow the group leader to approve or reject withdrawal requests.
- Maintain pending withdrawal amounts and handle expired requests.

### Database and Transactions
- PostgreSQL is used for persistent data storage.
- Prisma ORM is used for database operations.
- Database transactions help maintain consistency during wallet operations.
- Ledger entries are maintained for wallet movements.

## 3. Technology Stack

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JSON Web Token (JWT)
- JavaScript

## 4. How to Run the Backend

### Prerequisites
- Node.js 20 or above
- PostgreSQL database
- npm

### Steps

1. Open a terminal and navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the backend directory and configure the required environment variables:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
OTP_FIXED=123456
PENDING_TTL_SECONDS=86400
NOTIFY_URL=your_notification_endpoint
```

Use the actual database connection string and notification endpoint configured for your environment. If notifications are not configured, set up the endpoint according to the application's notification implementation.

4. Apply database migrations:

```bash
npx prisma migrate deploy
```

5. Generate the Prisma Client:

```bash
npx prisma generate
```

6. Start the backend:

```bash
npm start
```

The backend should be available at:

`http://localhost:5000`

You can verify that the server is running by opening:

`http://localhost:5000/health`

## 5. Test Login Credentials

The project uses two test mobile numbers to demonstrate wallet transfers and group wallet functionality.

| User | Mobile Number | Role in Existing Test Group |
|---|---|---|
| Test User 1 | 9000000001 | Group Leader |
| Test User 2 | 9000000002 | Group Member |

**OTP for testing:** `123456`

The OTP is fixed for development and testing through the `OTP_FIXED` environment variable.

### How to Login

1. Start the backend and frontend.
2. Open the frontend application.
3. Enter either test mobile number.
4. Request OTP if prompted.
5. Enter `123456`.
6. Submit the form to log in.

### Testing Group Permissions

- Log in using `9000000001` to test group leader operations, such as adding members and approving or rejecting withdrawal requests.
- Log in using `9000000002` to test member operations, such as contributing to a group wallet and requesting withdrawals.

The two accounts can also be used to test personal wallet transfers.

## 6. API Structure

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a user |
| POST | `/auth/otp/request` | Request OTP |
| POST | `/auth/otp/verify` | Verify OTP and login |
| GET | `/wallet` | Get personal wallet |
| POST | `/transfers` | Transfer points |
| GET | `/transactions` | Get transaction history |
| GET | `/groups` | Get user's groups |
| POST | `/groups` | Create a group |
| POST | `/groups/:groupId/members` | Add a group member |
| POST | `/groups/:groupId/contributions` | Contribute to a group |
| GET | `/groups/:groupId/wallet` | Get group wallet |
| POST | `/groups/:groupId/withdrawals` | Request withdrawal |
| POST | `/groups/:groupId/withdrawals/:withdrawalId/approve` | Approve withdrawal |
| POST | `/groups/:groupId/withdrawals/:withdrawalId/reject` | Reject withdrawal |

## 7. Areas for Further Improvement

- Expand automated test coverage for concurrent transfers and parallel idempotency requests.
- Improve monitoring and logging for production deployments without exposing sensitive information.
- Add a complete notification retry and monitoring mechanism.
- Add more comprehensive API documentation.
- Strengthen deployment configuration and production security checks.

## 8. Conclusion

The backend provides the core functionality required for the Community Points Wallet application. It supports personal and group wallet operations, authenticated access, and database-backed transaction handling. Further automated testing and production hardening can improve its reliability and scalability.
