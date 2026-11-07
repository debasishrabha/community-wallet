# Frontend Review – Community Points Wallet

## 1. Project Overview

The frontend of Community Points Wallet is developed using React and Vite. It provides a simple interface for users to access their wallets, transfer points, view transaction history, and manage group wallet activities.

The frontend communicates with the Express.js backend through REST APIs using Axios.

## 2. Implemented Features

### User Authentication
- Mobile number-based login.
- OTP verification.
- JWT token storage for authenticated sessions.
- Automatic token attachment to API requests.
- Protected application routes.

### Personal Wallet Dashboard
- Displays total wallet balance.
- Shows available and pending balances.
- Provides a form to transfer points to another user.
- Displays transaction history.
- Supports pagination with Previous and Next controls.
- Includes logout functionality.

### Group Wallet
- Displays groups associated with the logged-in user.
- Allows users to create a group.
- Supports adding members.
- Allows group members to contribute points.
- Supports withdrawal requests.
- Provides approval and rejection actions for group leaders.
- Displays group wallet balance information.

### User Experience
- Loading and error handling for API requests.
- Input validation for important forms.
- Clear separation between login, personal dashboard, and group wallet pages.

## 3. Technology Stack

- React
- Vite
- JavaScript
- Axios
- React Router
- CSS

## 4. How to Run the Frontend

### Prerequisites
- Node.js 20 or above
- npm
- Backend server running on port 5000

### Steps

1. Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file inside the frontend directory:

```env
VITE_API_URL=http://localhost:5000
```

4. Start the development server:

```bash
npm run dev
```

5. Open the local URL displayed in the terminal, usually:

`http://localhost:5173`

**Important:** Start the backend and frontend in separate terminals.

## 5. Test Login Credentials

Two test accounts are available for demonstrating the application.

| User | Mobile Number | Group Role |
|---|---|---|
| Test User 1 | 9000000001 | Group Leader |
| Test User 2 | 9000000002 | Group Member |

**Development OTP:** `123456`

### Login Instructions

1. Open the frontend application.
2. Enter `9000000001` or `9000000002`.
3. Request the OTP.
4. Enter `123456`.
5. Click the Login button.

After successful verification, the user will be redirected to the dashboard.

### Recommended Testing Flow

**Test User 1 – Group Leader**
- Log in with `9000000001`.
- View personal wallet details.
- Create or view a group.
- Add another user to the group.
- Review withdrawal requests.
- Approve or reject withdrawal requests.

**Test User 2 – Group Member**
- Log in with `9000000002`.
- View personal wallet details.
- Transfer points to another user.
- Contribute points to a group wallet.
- Request a group withdrawal.

These accounts help demonstrate the difference between group leader and group member permissions.

## 6. Backend Integration

The frontend uses Axios for communication with the backend.

The API base URL is configured through the `VITE_API_URL` environment variable.

The authentication token is retrieved from local storage and attached to protected API requests using an Axios request interceptor.

The frontend interacts with the following major API modules:

- Authentication
- Personal wallet
- Transfers
- Transaction history
- Group management
- Group contributions
- Group withdrawals

## 7. Areas for Further Improvement

- Improve responsive design across different screen sizes.
- Add a dedicated list of pending withdrawal requests.
- Improve user feedback with notification messages.
- Add more detailed validation and error messages.
- Expand frontend testing for different user roles and API failure scenarios.

## 8. Conclusion

The frontend provides the main user interface for the Community Points Wallet application. It integrates with the backend to support authentication, personal wallet operations, and group wallet management.

The application demonstrates the core user flows while keeping the interface simple and easy to navigate.
