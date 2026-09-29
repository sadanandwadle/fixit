# FIXIT

**FIXIT** is a full-stack local service booking marketplace built from scratch. It connects customers with local service professionals such as electricians, plumbers, and mechanics. 

## Project Overview

- **Customers** can find nearby providers, book services, verify start using OTP, make simulated payments, and leave reviews.
- **Providers** can manage their availability and location, accept/reject bookings, complete services, and manage their profile.
- **Admins** manage users, services, bookings, and system activity.

## Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, React Router, Axios
- **Backend**: Node.js, Express, JWT, bcrypt
- **Database**: MongoDB, Mongoose, Geospatial indexing (2dsphere)
- **Maps**: Leaflet, OpenStreetMap
- **Payment**: Simulated / Demo ONLY

## Directory Structure
```
FIXIT/
├── client/         # React frontend
├── server/         # Node.js backend
├── docs/           # Project documentation
├── .gitignore
├── README.md
└── package.json
```

## Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or accessible via URI)

## Local Setup
1. Clone the repository and install dependencies in the root:
   ```bash
   npm install
   ```
2. The root `package.json` contains a convenient command to install both client and server dependencies:
   ```bash
   npm run install:all
   ```

## Environment Variables
Create `.env` files in both the `client/` and `server/` directories using the provided `.env.example` templates.
- **Backend** (`server/.env`): `PORT`, `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`
- **Frontend** (`client/.env`): `VITE_API_BASE_URL`

## Running the Application
To start both the frontend and backend concurrently in development mode:
```bash
npm run dev
```

Alternatively, to start them separately:
- **Backend:** `cd server && npm run dev` (Runs on `http://localhost:5000`)
- **Frontend:** `cd client && npm run dev` (Runs on `http://localhost:5173`)

## Health Endpoint
You can verify the backend is running by navigating to `http://localhost:5000/api/health`.

## Current Status
We are currently at **Phase 1: Project Foundation**. Basic React UI and Express backend are wired.

