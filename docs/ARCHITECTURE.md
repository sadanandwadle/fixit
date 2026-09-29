# Architecture & Database Planning

## 1. Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, React Router, Axios
- **Backend**: Node.js, Express, JWT, bcrypt
- **Database**: MongoDB, Mongoose
- **Maps**: Leaflet, OpenStreetMap, MongoDB GeoJSON (2dsphere geospatial indexing)
- **Deployment**: GitHub Pages (Frontend), Render (Backend), MongoDB Atlas (Database)

## 2. Directory Structure
A clean separation of concerns must be maintained:

```
FIXIT/
├── client/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── context/
│       ├── hooks/
│       ├── services/
│       ├── utils/
│       ├── App.jsx
│       └── main.jsx
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── docs/
├── .gitignore
├── README.md
└── package.json
```

## 3. Database Entities & Relationships

### 3.1. User
- **Purpose**: Core authentication and basic profile entity for customers and admins.
- **Important Fields**: name, email, password (hashed), role (customer, admin), phone, createdAt.
- **Indexes**: Unique index on email.
- **Validation**: Email format validation, password strength constraints.
- **Security**: Never expose hashed passwords or sensitive PII in API responses.

### 3.2. Provider
- **Purpose**: Extended profile for service providers.
- **Important Fields**: user_id (ref User), services (array of Service refs), location (GeoJSON Point), serviceRadius (number), availability (schedule object), rating, isVerified.
- **Indexes**: `2dsphere` index on location for nearby searches.
- **Validation**: Ensure GeoJSON is correctly formatted (Longitude, Latitude).
- **Security**: Only the specific provider or admin can edit these details.

### 3.3. Service
- **Purpose**: The dynamic, centralized catalog of service types.
- **Important Fields**: name, description, icon/image, isActive.
- **Indexes**: Unique index on name.
- **Security**: Read-only for customers/providers. Admin only can mutate.

### 3.4. Booking
- **Purpose**: The transactional record connecting a customer to a provider for a service.
- **Important Fields**: customer_id (ref User), provider_id (ref Provider), service_id (ref Service), status (enum), date, location (GeoJSON Point), otpHash, otpExpiry, price.
- **Indexes**: Index on customer_id and provider_id for rapid querying of active/past bookings.
- **Validation**: Strict enforcement of the booking state machine on status updates.
- **Security**: Both customer and provider can read. Status updates must be authorized based on role and current state.

### 3.5. Review
- **Purpose**: Feedback left by a customer for a provider.
- **Important Fields**: booking_id (ref Booking), customer_id (ref User), provider_id (ref Provider), rating (1-5), comment, createdAt.
- **Indexes**: Index on provider_id for aggregating ratings.
- **Validation**: Ensure rating is between 1 and 5. Ensure a booking is completed before a review can be submitted.

### 3.6. Payment
- **Purpose**: Simulated ledger entry for demo payment processing.
- **Important Fields**: booking_id (ref Booking), amount, status (enum: pending, completed), transactionType (demo).
- **Security**: Must be strictly validated to ensure it is only created after booking completion.

### 3.7. Notification
- **Purpose**: Asynchronous alerts for users.
- **Important Fields**: recipient_id (ref User), type, message, isRead.
- **Indexes**: Index on recipient_id.

### 3.8. AuditLog
- **Purpose**: Admin-facing security and state transition log.
- **Important Fields**: action, actor_id (ref User), resource, details, timestamp.
- **Security**: Append-only. Admin read-only.

## 4. Security Requirements
- **Authentication**: JWT authentication required for all protected routes.
- **Authorization**: Strict Role-Based Access Control (RBAC). Admin routes must be heavily protected.
- **Ownership**: Users can only mutate their own resources (e.g., editing profile, cancelling their own booking).
- **Hashing**: Passwords must be hashed using bcrypt.
- **OTP Security**: OTPs must be hashed in the database, have a short expiry time, and have attempt limits to prevent brute-forcing. OTPs must never be returned in plaintext over an API except to the customer during generation.
- **Validation**: All incoming data must be sanitized and validated before database interaction.
- **State Machine Protection**: Prevent unauthorized booking manipulation by strictly checking the `status` enum transitions within controllers.
- **Environment**: Sensitive keys (JWT secret, DB URI) must use secure `.env` variables.
- **CORS**: Enforce strict CORS policies allowing only the designated frontend client.
