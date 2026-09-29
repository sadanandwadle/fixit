# Software Requirements Specification (SRS)

## 1. Functional Requirements

### 1.1 Customer Functions
- **Auth**: Secure sign-up, login, and session management.
- **Discovery**: Geospatial queries to find nearby providers based on a 2dsphere index.
- **Booking Management**: Create requests, confirm accepted requests, view active and historical bookings.
- **OTP Generation**: System generates a secure OTP upon booking confirmation for the customer to share with the provider.
- **Feedback**: Ability to rate and review a provider post-completion.

### 1.2 Provider Functions
- **Profile Management**: Define availability schedules, service offerings, prices, and geographical service radius.
- **Booking Queue**: Interface to view pending requests, accept, or reject them.
- **Execution**: Input OTP to transition booking status to "in-progress". Complete the job to transition to "completed".

### 1.3 Admin Functions
- **Catalog Management**: CRUD operations for the global service categories.
- **Moderation**: Ability to ban users, delete inappropriate reviews, and manually resolve booking disputes.
- **Audit**: View logs of critical state changes (e.g., booking transitions, payments).

## 2. Booking State Machine
The backend must strictly enforce valid state transitions. A generic endpoint allowing arbitrary status updates is strictly forbidden.

### 2.1 Primary States & Linear Flow
`pending` -> `accepted` -> `confirmed` -> `in-progress` -> `completed`

### 2.2 Allowed Transitions
- `pending` -> `accepted` (Triggered by Provider)
- `pending` -> `rejected` (Triggered by Provider)
- `pending` -> `cancelled` (Triggered by Customer)
- `accepted` -> `cancelled` (Triggered by Customer or Provider)
- `accepted` -> `confirmed` (Triggered by Customer; generates OTP)
- `confirmed` -> `in-progress` (Triggered by Provider submitting correct OTP)
- `in-progress` -> `completed` (Triggered by Provider)

## 3. Non-Functional Requirements
- **Security**: Passwords and OTPs must be hashed. Proper JWT validation on all protected routes.
- **Scalability**: Database-driven service catalogs.
- **Reliability**: Strict data validation using Mongoose schemas.
- **Simulated External Systems**: Payments are strictly demo/simulated. No real payment gateways will be integrated.
