# FIXIT — Portfolio Case Study & Engineering Architecture

## 1. Executive Summary

**FIXIT** is a production-grade, full-stack on-demand local services platform that connects homeowners and businesses with vetted trade professionals (electricians, plumbers, AC technicians, appliance mechanics, cleaners, and computer specialists). Built with React 18, Node.js, Express, and MongoDB, FIXIT addresses the fragmentation, lack of transparent pricing, and safety concerns inherent in the informal local services marketplace.

---

## 2. Problem Statement

Hiring local trade professionals is historically plagued by several structural inefficiencies:
1. **Unpredictable Availability & Double-Bookings**: Service providers manage schedules informally (phone calls, paper, chat apps), leading to overlapping appointments and missed time slots.
2. **Absence of Real-Time Proximity Awareness**: Customers struggle to locate providers actually servicing their immediate geographical radius, leading to high transit delays and cancellations.
3. **Trust & Verification Gaps**: Service arrival and completion lack an objective audit trail, creating disputes over whether a job was completed or when payment is due.
4. **Lack of Operational Governance**: Platforms without centralized administration suffer from unmoderated fraudulent reviews, stale service catalogs, and unverified provider claims.

---

## 3. The FIXIT Solution

FIXIT introduces an end-to-end digital lifecycle:
* **Location-Aware Discovery**: Interactive Leaflet maps powered by MongoDB `2dsphere` geospatial indexing and real-time Haversine distance filtering.
* **Deterministic Booking State Machine**: Guaranteed state progression (`pending` → `accepted` → `confirmed` → `in-progress` → `completed`), backed by compound slot uniqueness and state validation.
* **Cryptographic Service Verification**: 4-digit One-Time Password (OTP) generated on confirmation, cryptographically hashed using `bcryptjs` and stored securely, masked from provider visibility until physical in-person handoff.
* **In-App Event Notification Hub**: Contextual alert dispatch for all major booking, OTP, service, and payment events with strict cross-tenant data isolation.
* **Comprehensive Admin Control Tower**: Role-based administrative dashboard overseeing system metrics, user/provider auditing, provider verification badges, review moderation with automatic rating recalculation, and service catalog management.

---

## 4. User Personas & Workflows

### A. Customer Persona
1. **Discovery**: Explores service categories or searches by location on an interactive Leaflet map using "Find Providers Near Me".
2. **Booking**: Inspects a provider's profile, rates, weekly availability schedule, and selects an open time slot.
3. **Confirmation & OTP**: Once accepted by the provider, confirms the appointment to receive a unique 4-digit verification OTP.
4. **Service & Payment**: Shares OTP with the technician upon physical arrival; completes simulated/demo checkout upon job completion.
5. **Review**: Submits a 1-to-5 star rating and feedback comment.

### B. Provider Persona
1. **Profile & Location Setup**: Manages business details, hourly rates, service radius (1–100 km), and pinpoints garage/headquarters on an interactive map.
2. **Schedule Management**: Configures weekly operating windows per day of week (Monday through Sunday).
3. **Dispatch & Verification**: Accepts/rejects incoming bookings; enters the customer-provided OTP on-site to transition status to `in-progress`.
4. **Completion & Earnings**: Marks service as completed, triggering customer payment notices and earning review feedback.

### C. Administrator Persona
1. **System Oversight**: Monitors high-level platform health, revenue metrics, booking lifecycle distribution, and user volume.
2. **Provider Vetting**: Verifies trade credentials and toggles official platform verification badges.
3. **Catalog Governance**: Adds, modifies, or retires services with safety guards blocking deletion when active bookings exist.
4. **Review Moderation**: Audits customer feedback, purging fraudulent or abusive reviews with real-time provider rating recalculation.

---

## 5. Key Engineering Challenges & Solutions

### Challenge 1: Geospatial Provider Discovery & Service Radius Filtering
* **Problem**: Customers need to discover only active providers who are physically within coverage distance, sorted by proximity.
* **Implementation**:
  * GeoJSON `Point` geometry `[longitude, latitude]` stored on the Provider document with a MongoDB `2dsphere` index.
  * Geospatial discovery endpoint `GET /api/providers/nearby` runs `$near` queries within a specified search radius.
  * Server calculates exact Haversine distance in kilometers:
    $$\text{distance} = 2 R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lng}}{2}\right)}\right)$$
  * Evaluates provider-specific `serviceRadius` to flag whether the customer is within the provider's active operational boundary.

### Challenge 2: Double-Booking Prevention & Concurrency Protection
* **Problem**: Multiple customers requesting the same provider at the same calendar date and time slot could produce conflicting appointments.
* **Implementation**:
  * MongoDB compound index on `{ providerId: 1, scheduledDate: 1, scheduledTime: 1, status: 1 }`.
  * Pre-booking conflict queries check for existing bookings in active states (`pending`, `accepted`, `confirmed`, `in-progress`).
  * Strict validation rejects overlapping slot submissions with `409 Conflict`.

### Challenge 3: In-Person Service Verification via Hashed OTP
* **Problem**: Establishing undeniable proof of technician physical arrival without risking credential leakage over the wire.
* **Implementation**:
  * When customer confirms booking, backend generates a cryptographically random 4-digit code.
  * Code is hashed using `bcryptjs` (salt rounds: 10) and stored in `booking.otpHash`.
  * The plain OTP is sent **strictly to the customer** in the confirmation response.
  * Provider API responses use Mongoose projection to mask the OTP completely until physical input.
  * When provider submits the OTP via `PUT /api/bookings/:id/verify-otp`, `bcrypt.compare` verifies the hash before advancing status to `in-progress`.

### Challenge 4: Zero-Downtime Review Moderation & Rating Recalculation
* **Problem**: Deleting an abusive or fraudulent review by an administrator must not leave orphaned rating metrics or stale average calculations on the provider profile.
* **Implementation**:
  * When an administrator invokes `DELETE /api/admin/reviews/:id`, the review is removed.
  * The controller automatically runs a MongoDB aggregation pipeline querying all remaining reviews for that `providerId`:
    $$\text{avgRating} = \frac{\sum \text{ratings}}{N}, \quad \text{totalReviews} = N$$
  * Updates the `Provider` document atomically. If all reviews are deleted, gracefully resets rating to `0` and count to `0`.

### Challenge 5: Multi-Tenant Data Isolation & RBAC
* **Problem**: Customers and providers must never access peer private records (notifications, private bookings, receipts, or administrative consoles).
* **Implementation**:
  * JWT authentication middleware (`protect`) extracts identity into `req.user`.
  * Role authorization middleware (`authorize('admin' | 'provider' | 'customer')`) enforces endpoint permissions.
  * Resource ownership checks explicitly match `booking.customerId.toString() === req.user._id.toString()` or `booking.providerId.toString() === req.provider._id.toString()`, rejecting unauthorized cross-tenant requests with `403 Forbidden`.

---

## 6. Technical Stack Summary

| Layer | Technologies | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Axios, Lucide Icons | Ultra-fast build times, responsive utility styling, client-side routing with route guards |
| **Mapping** | Leaflet, React-Leaflet, OpenStreetMap | Production mapping without expensive API keys or vendor lock-in |
| **Backend** | Node.js, Express.js, Morgan, CORS | Scalable, non-blocking asynchronous REST API architecture |
| **Database** | MongoDB, Mongoose ODM | Flexible schema design, geospatial 2dsphere indexing, compound indexing |
| **Security** | JWT (JSON Web Tokens), bcryptjs | Stateless authorization, salted password & OTP hashing |
| **DevOps / QA** | Docker, Docker Compose, Nginx, Chrome DevTools Protocol | Reproducible container builds, automated integration suites, headless browser QA |

---

## 7. Portfolio Showcase Highlights

### Concise Project Description
> **FIXIT** is a full-stack on-demand local services platform connecting customers with verified trade professionals. Built with React, Node.js, Express, and MongoDB, FIXIT features location-aware provider discovery via Leaflet maps and MongoDB `2dsphere` indexes, availability-based scheduling with double-booking prevention, cryptographically hashed OTP service verification, in-app event notifications, demo payments, and a role-based administrative management console.

### Key Resume Bullets
* **Architected full-stack service marketplace** using React 18, Node.js, Express, and MongoDB, supporting 3 distinct role workflows (Customer, Provider, Admin) with end-to-end JWT authentication and RBAC.
* **Engineered location-aware provider discovery** utilizing MongoDB `2dsphere` spatial indexing, `$near` queries, dynamic service-radius filtering, and Leaflet OpenStreetMap integration.
* **Developed deterministic booking state machine** with availability schedule validation, double-booking prevention via compound indexes, and bcrypt-hashed OTP verification for physical service handoff.
* **Implemented real-time in-app notification engine** and an 8-module administrative dashboard with automated rating recalculation pipelines and active-booking deletion guards.
* **Authored comprehensive test suites** covering 270 automated backend integration assertions across 5 regression phases and 21 headless Chromium browser QA tests with 100% pass rates.

### Recommended 2-Minute Demo Flow
1. **Home Page**: Introduce problem space and trade categories.
2. **Customer Discovery**: Click "Find Providers", toggle to "Map View", trigger "Find Providers Near Me", and observe dynamic distance in km.
3. **Availability & Booking**: Open provider profile, inspect weekly schedule, select slot, and create booking.
4. **Provider Acceptance**: Switch to Provider Dashboard, accept incoming booking.
5. **Confirmation & OTP Generation**: Customer confirms booking, receiving 4-digit OTP; highlight that provider cannot view code.
6. **On-Site OTP Verification & Completion**: Provider inputs OTP to start service (`in-progress`), then completes job.
7. **Payment & Review**: Customer completes simulated checkout, verifies transaction ID, and posts 5-star review.
8. **Admin Control Console**: Log into `/admin`, review real-time revenue and booking lifecycle distribution, verify a new provider, and inspect audit logs.
