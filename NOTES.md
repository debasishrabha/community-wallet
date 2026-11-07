# Project Notes – Community Points Wallet

## 1. Architecture

The application follows a frontend-backend architecture.

- React with Vite handles the user interface.
- Node.js and Express.js provide REST APIs.
- Prisma ORM handles database operations.
- PostgreSQL stores users, wallets, transactions, groups, and ledger records.
- JWT is used to protect authenticated API routes.

I chose this architecture because it separates frontend and backend responsibilities and makes the application easier to maintain.

## 2. Database Choice

I chose PostgreSQL because wallet applications require reliable and consistent database transactions.

Prisma ORM simplifies database queries, schema management, and migrations.

## 3. Concurrency Strategy

Wallet operations use database transactions to maintain consistency during simultaneous requests. Serializable transaction isolation and retry handling are used for transfer operations. This helps prevent multiple requests from spending the same available balance.

## 4. Idempotency

Transfers use an `Idempotency-Key` supplied in the request header.

The backend associates the key with the authenticated user and request details. Repeated requests using the same key return the original result instead of moving money again.

## 5. Ledger

Wallet balance changes are recorded through ledger entries within database transactions.

A ledger verification utility is included to compare the sum of ledger entries against the current wallet balance.

## 6. Notification Failure

The notification system is intended to ensure that notification failures do not reverse successful wallet operations.

The final notification retry and failure-handling behavior should be verified against the implemented backend before production deployment.

## 7. Deployment

The application is currently being prepared for deployment.

Planned hosting:
- Frontend: Vercel
- Backend: Render
- Database: Hosted PostgreSQL

Public URLs will be added after deployment.

## 8. Tradeoffs

Due to the limited development time, priority was given to the core authentication, wallet, transfer, and group wallet workflows.

Some production-level improvements, such as expanded automated testing, monitoring, and a more complete notification retry mechanism, can be added later.

## 9. Next 1 Day

If given another day, I would focus on:
- Expanding automated tests, especially concurrency and idempotency tests.
- Improving notification failure handling.
- Completing deployment and production configuration.
- Improving frontend responsiveness and error handling.
- Adding more comprehensive API documentation.
