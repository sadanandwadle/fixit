# UI/UX Specification

## 1. Design Source of Truth
The entire visual identity for the FIXIT application is dictated by the **Google Stitch** designs (Project ID: 8603728313967975914). 

**IMPORTANT:** No visual designs (colors, fonts, layouts) are to be invented during development. The frontend implementation must derive its Tailwind configurations, padding, margins, and component structures directly from the Stitch output.

## 2. Stitch Design Reference
The Stitch screens map to the FIXIT application as follows:

| Stitch Screen              | Existing FIXIT Page           | Implementation Purpose |
| -------------------------- | ----------------------------- | ---------------------- |
| FIXIT Logo                 | Global branding               | Logo/header/favicon    |
| FIXIT Home                 | Home/Landing page             | -> future customer landing/home page |
| Services & Discovery       | Providers/Services page       | -> future service discovery/provider listing page |
| Provider Profile & Booking | Provider details/booking flow | -> future provider profile + booking page |

*Note: Explicit Login/Register designs are not explicitly provided by Stitch. We will reuse actual Stitch visual patterns, typography, and clean layout derived from the Stitch design system.*

## 3. Component Expectations
The application will utilize a component-driven architecture (React). Expected reusable components derived from Stitch include:
- **Navigation/Header**: Consistent across all views.
- **Service/Provider Cards**: Uniform display of catalog items and provider summaries.
- **Booking Interface**: Date/Time pickers, location input, and clear CTA buttons.
- **Status Badges**: Distinct visual indicators for the booking state machine (`pending`, `accepted`, `in-progress`, etc.).
- **Forms & Inputs**: Standardized borders, focus states, and validation feedback.
