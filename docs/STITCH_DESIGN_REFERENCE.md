# FIXIT Stitch Design Reference

## Stitch Project Details
- **Project Title:** FIXIT Local Services Marketplace
- **Project ID:** 8603728313967975914

## MCP Retrieval Status
- **Screens Successfully Retrieved:** 4 screens retrieved.
- **Assets Successfully Retrieved:** Screenshots for all 4 screens were retrieved successfully.
- **Design Tokens Discovered:** Colors, Typography, Spacing, Shapes, and Component styling rules were successfully read from the project's design system.

---

## Brand & Style
This design system embodies a clean, professional, and trustworthy aesthetic tailored for a high-end service marketplace. Drawing inspiration from Stripe's precision, Linear's refined minimalism, and Urban Company's structured approach to localized services, the visual identity evokes absolute reliability, clarity, and competence.

The design style combines **Minimalism** with **Low-Contrast Outlines**, relying on crisp typography, generous whitespace, subtle structural borders instead of heavy shadows, and a restrained color palette that instills confidence in both service providers and consumers.

### Colors
The color system is built for legibility, hierarchy, and trust:
- **Primary:** Deep Professional Indigo (`#2563EB`)
- **Active Info:** Vibrant Blue (`#3B82F6`)
- **Neutral Dark (Text):** Charcoal (`#0F172A`)
- **Neutral Muted (Secondary Text):** Slate Gray (`#64748B`)
- **Neutral Background:** Off-White / Light Gray (`#F8FAFC`)
- **Success:** Emerald (`#10B981`)
- **Warning:** Amber (`#F59E0B`)
- **Error:** Red (`#EF4444`)

Additional system colors from tokens:
- **Surface:** `#F7F9FB`
- **Surface (Dim):** `#D8DADC`
- **Surface Container (Lowest/White):** `#FFFFFF`

### Typography
Typography relies exclusively on **Inter**, establishing a systematic, utilitarian hierarchy optimized for dense data tables, booking workflows, and editorial marketplace content.
- `headline-xl`: 36px, Bold (700), -0.025em spacing
- `headline-lg`: 30px, Semi-Bold (600), -0.02em spacing
- `headline-md`: 24px, Semi-Bold (600), -0.015em spacing
- `headline-sm`: 20px, Semi-Bold (600), -0.01em spacing
- `body-lg`: 18px, Regular (400)
- `body-md`: 15px, Regular (400)
- `body-sm`: 14px, Regular (400)
- `label-md`: 13px, Medium (500), 0.01em spacing

### Layout & Spacing
Fluid grid system built on a strict 4px/8px baseline rhythm.
- **Breakpoints:** Mobile (< 640px), Tablet (640px – 1024px), Desktop (> 1024px).
- **Margins:** Scale down to 1rem on mobile, expand up to 3rem on desktop.
- **Spacing Scale:**
  - `space-xs`: 0.25rem
  - `space-sm`: 0.5rem
  - `space-md`: 1rem
  - `space-lg`: 1.5rem
  - `space-xl`: 2.5rem

### Elevation & Depth
Depth is conveyed primarily through **low-contrast outlines** ("ghost borders") and restrained, highly diffused shadows.
- **Borders:** Subtle 1px borders (`#E2E8F0` or `#CBD5E1`) for structural containers, cards, and inputs.
- **Shadows:** Ultra-subtle, low-opacity ambient shadows (`0 1px 3px 0 rgba(0, 0, 0, 0.05)`) for floating elements like dropdowns and modals.

### Shapes
- **Corner Radius:** Medium radius (`rounded-lg` / `0.5rem`) across interactive elements, cards, and containers.

### Reusable UI Patterns (Components)
- **Buttons:**
  - Primary: Solid Indigo (`#2563EB`), white text, `rounded-lg`. Hover shifts 10% shade, 150ms transition.
  - Secondary: White background, 1px slate border, dark charcoal text.
- **Input Fields:** 1px subtle gray border (`#CBD5E1`), off-white or white background, 2px primary focus ring (`#3B82F6` with low opacity). Labels sit cleanly outside the input container.
- **Cards:** White surface against `#F8FAFC` canvas, 1px subtle borders, `rounded-lg` corners, padding scaled to `space-lg`.
- **Chips & Badges:** Compact, pill-like or `rounded-lg` tags. Semantic color pairings with high contrast.
- **Lists & Tables:** Clean rows separated by 1px dividers (`#F1F5F9`), compact spacing for high data density.
- **Controls:** Custom square checkboxes and circular radio buttons with 2px borders, smooth primary color fill on select.

---

## Screens to React Component Mapping

### 1. FIXIT Logo
- **Screen ID:** `2fefe738566046dfa53475a8f7e4efed`
- **React Component:** `<Logo />` in `client/src/components/ui/`
- **Screenshot Path:** `docs/screenshots/stitch/logo/logo.png`

### 2. FIXIT Home
- **Screen ID:** `cac0269442554eaa97295a3ed2830517`
- **React Component:** `client/src/pages/Home.jsx`
- **Screenshot Path:** `docs/screenshots/stitch/home/home.png`
- **Details:** The landing page displaying hero section, service categories, and featured providers.

### 3. FIXIT Services & Discovery
- **Screen ID:** `34beb694979941e4aaa7467e3ff1ef4e`
- **React Component:** `client/src/pages/Services.jsx`
- **Screenshot Path:** `docs/screenshots/stitch/services/services.png`
- **Details:** The primary discovery page featuring service filters, categorized lists, and provider cards with location/pricing details.

### 4. FIXIT Provider Profile & Booking
- **Screen ID:** `d5534b8aad104062a18b9478cca8a5c5`
- **React Component:** `client/src/pages/ProviderProfile.jsx` (and potentially a nested Booking overlay/component).
- **Screenshot Path:** `docs/screenshots/stitch/provider-booking/provider-booking.png`
- **Details:** Detailed view of a specific service provider, including ratings, pricing structures, and booking confirmation workflows.
