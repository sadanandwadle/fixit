# Product Requirements Document (PRD)

## 1. Introduction
FIXIT is a completely new local service booking marketplace. It bridges the gap between local service professionals and customers seeking reliable services.

## 2. User Roles
The platform caters to three distinct user roles:

### 2.1. Customer
- Register and login to the platform.
- Browse the catalog of services.
- Search and filter providers based on various criteria.
- View provider profiles, ratings, and reviews.
- Find nearby providers using location-based search.
- Book appointments for specific services.
- Confirm bookings and generate an OTP for service verification.
- Track the status of active and past bookings.
- Make simulated (demo) payments upon service completion.
- Leave ratings and reviews for providers.
- Receive notifications regarding booking status changes.

### 2.2. Provider
- Register and login.
- Create and edit a detailed provider profile.
- Select supported services from the platform's catalog.
- Set pricing, working hours (availability), and service radius.
- Set geographic location (coordinates) for discovery.
- Receive incoming booking requests.
- Accept or reject bookings.
- Verify customer OTP to securely start a service.
- Mark a service as completed.
- View payment information (simulated).
- Receive and review customer feedback/ratings.
- Receive notifications for incoming requests and updates.

### 2.3. Admin
- Secure login to an administrative dashboard.
- Manage all users (Customers, Providers, and other Admins).
- Verify and approve providers.
- Manage (add/edit/delete) the centralized service catalog.
- Oversee and manage all bookings in the system.
- Moderate user reviews.
- View system-wide payments and audit logs/system activity.

## 3. Core Booking Flow
The essential user journey for securing a service:
1. **Customer** searches for a required service.
2. **Customer** selects a suitable provider from the search results.
3. **Customer** submits a booking appointment request.
4. **Provider** reviews and accepts the booking request.
5. **Customer** confirms the accepted booking, which generates a secure OTP.
6. **Provider** arrives at the location and verifies the OTP with the customer.
7. **Service starts** upon successful OTP verification.
8. **Provider** completes the service in the system.
9. **Customer** executes a simulated payment.
10. **Customer** leaves a review for the provider.

## 4. Services Catalog
The platform utilizes a database-driven service catalog, ensuring scalability and easy addition of future services. Initial categories include:
- Electrician
- Plumber
- AC Technician
- Mechanic
- Cleaner
- Computer Repair

## 5. UI/UX Strategy
The visual design for FIXIT is defined exclusively by the **Google Stitch** project. Implementation of the UI will strictly adhere to the Stitch designs for colors, typography, spacing, components, and responsive behavior. No custom visual designs will be invented outside of the Stitch parameters.
