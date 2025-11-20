# Coccinelle.AI Application Structure - Complete Index

This directory contains comprehensive documentation of the Coccinelle.AI SaaS application architecture, pages, components, and user flows.

## Documentation Files

### 1. **APPLICATION_GUIDE.md** - Main Reference Document
Comprehensive guide covering:
- Executive summary of the entire application
- Complete list of all 21 pages
- Detailed breakdown of each dashboard module (8 total)
- Authentication and security architecture
- Navigation flows and user journeys
- API integration details
- Component ecosystem
- State management approach
- Performance optimizations
- Testing recommendations
- Complete file structure reference

**Best for**: Understanding the complete application architecture and finding specific module details.

### 2. **ARCHITECTURE_MAP.md** - Technical Deep Dive
In-depth technical documentation including:
- All pages with file paths
- Page types (public/protected, server/client-rendered)
- Entry point analysis
- Complete authentication flow
- Dashboard structure and layout
- Detailed module descriptions
- Component dependencies
- Navigation patterns
- Data flow and API integration
- Security and authentication mechanisms
- UI/UX patterns
- Critical interdependencies

**Best for**: Technical implementation details and understanding how components interact.

### 3. **VISUAL_ARCHITECTURE.txt** - ASCII Diagrams
Visual representations using ASCII art:
- Entry points and authentication flow diagram
- Dashboard architecture visualization
- Detailed module views (8 modules)
- Data flow between client and server
- Component dependency tree
- Authentication flow steps
- State management architecture
- User flow summaries

**Best for**: Visual learners, presentations, and quick reference.

## Quick Navigation by Use Case

### Finding a Specific Page
1. Check **APPLICATION_GUIDE.md** → "QUICK REFERENCE - ALL PAGES" section (lines 8-24)
2. OR search for route in **ARCHITECTURE_MAP.md** (uses consistent format: ### Page Title (Route))

### Understanding a Module
1. Look up module in **APPLICATION_GUIDE.md** → "CORE MODULES - FUNCTIONALITY BREAKDOWN"
2. Find detailed view in **VISUAL_ARCHITECTURE.txt** → "DETAILED MODULE VIEWS"
3. Check file path in **ARCHITECTURE_MAP.md** → "DASHBOARD MODULES" section

### Tracing User Flows
1. **APPLICATION_GUIDE.md** → "NAVIGATION MAP" section
2. **VISUAL_ARCHITECTURE.txt** → "USER FLOWS SUMMARY" section
3. **ARCHITECTURE_MAP.md** → "NAVIGATION PATTERNS" section

### Understanding Authentication
1. **APPLICATION_GUIDE.md** → "AUTHENTICATION & SECURITY ARCHITECTURE"
2. **VISUAL_ARCHITECTURE.txt** → "AUTHENTICATION FLOW DETAILED"
3. **ARCHITECTURE_MAP.md** → "AUTHENTICATION FLOW" section

### Finding API Endpoints
1. **APPLICATION_GUIDE.md** → "API INTEGRATION" section
2. **ARCHITECTURE_MAP.md** → "API INTEGRATION" section

### Understanding State & Data Flow
1. **APPLICATION_GUIDE.md** → "STATE MANAGEMENT APPROACH"
2. **VISUAL_ARCHITECTURE.txt** → "DATA FLOW & API INTEGRATION"
3. **ARCHITECTURE_MAP.md** → "DATA FLOW & API INTEGRATION"

## Complete Pages List

### Public Pages (No Authentication)
- `/` - Landing page (home)
- `/login` - User login
- `/signup` - User registration
- `/book/[tenantId]` - Public appointment booking

### Protected Pages (Authentication Required)
- `/onboarding` - New user setup wizard (5 steps)
- `/dashboard` - Main dashboard hub
- `/dashboard/appels` - Call history list
- `/dashboard/appels/[callId]` - Call detail page
- `/dashboard/rdv` - Appointments list
- `/dashboard/rdv/[appointmentId]` - Appointment detail page
- `/dashboard/knowledge` - Knowledge base management (3 tabs)
- `/dashboard/properties` - Property catalog
- `/dashboard/analytics` - Analytics dashboard (2 tabs)
- `/dashboard/sara` - Sara AI configuration (4 tabs)
- `/dashboard/sara-analytics` - Sara performance analytics (3 tabs)
- `/dashboard/settings` - Account settings (7 tabs)

**Total: 21 unique pages + dynamic detail routes**

## Dashboard Modules Overview

1. **Agent Vocal / Calls** `/dashboard/appels`
   - Call history, filtering, details, transcripts

2. **Rendez-vous / Appointments** `/dashboard/rdv`
   - Appointment management, CRUD, status tracking

3. **Knowledge Base** `/dashboard/knowledge`
   - RAG auto-builder, document upload, Q&A testing

4. **Properties Catalog** `/dashboard/properties`
   - Real estate inventory management with AI matching

5. **Analytics** `/dashboard/analytics`
   - Business intelligence, charts, KPIs, PDF export

6. **Sara Configuration** `/dashboard/sara`
   - AI agent customization (voice, personality, scripts)

7. **Sara Analytics** `/dashboard/sara-analytics`
   - Call performance analysis and recommendations

8. **Settings** `/dashboard/settings`
   - Account management (7 tabs for different settings)

## Key Components

### Dashboard Components
- SmartAlerts
- NotificationCenter
- ToastNotification
- CallFunnel
- CallPerformance
- CallInsights
- AIInsightsPanel
- KnowledgeBuilder

### Settings Components
- ProfileForm
- APIKeysForm
- NotificationsSettings
- SecuritySettings
- AvailabilitySettings
- TeamManagement
- CalendarIntegration

### Shared Components
- Logo (used across app)

## Important Statistics

- **Total Pages**: 21 unique + dynamic details
- **Components**: 15+ specialized components
- **Entry Points**: 5 distinct entry points
- **Protected Routes**: 10+ dashboard-related routes
- **API Endpoints**: 15+ integrated endpoints
- **Dashboard Modules**: 8 main modules
- **Settings Tabs**: 7 configuration areas
- **Multi-tab Pages**: 4 (knowledge, analytics, sara, sara-analytics)

## File Structure

```
app/
├── Landing & Auth Pages
│   ├── page.tsx
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   └── onboarding/page.tsx
├── Public Pages
│   └── book/[tenantId]/page.tsx
└── dashboard/
    ├── Hub & Layout
    │   ├── page.tsx
    │   └── layout.tsx
    ├── Calls Module
    │   ├── appels/page.tsx
    │   └── appels/[callId]/page.tsx
    ├── Appointments Module
    │   ├── rdv/page.tsx
    │   └── rdv/[appointmentId]/page.tsx
    ├── Feature Modules
    │   ├── knowledge/page.tsx
    │   ├── properties/page.tsx
    │   ├── analytics/page.tsx
    │   ├── sara/page.tsx
    │   ├── sara-analytics/page.tsx
    │   └── settings/page.tsx

src/components/
├── dashboard/ (8 specialized components)
└── settings/ (7 settings components)

middleware.ts (Authentication & Route Protection)
```

## Authentication Flow Summary

1. User lands on `/` (landing page)
2. User goes to `/signup` (new) or `/login` (existing)
3. Credentials validated via API
4. JWT token generated and stored in localStorage + cookies
5. Middleware validates token on each request
6. Protected routes require valid, non-expired token
7. Token checked on: route access, data loading, navigation

## Data Loading Patterns

- **Initial Load**: Parallel API calls on dashboard mount
- **Live Updates**: 5-second polling for real-time data
- **Demo Mode**: Mock data for localhost development
- **Error Handling**: User-friendly error messages and retry logic

## Navigation Pattern

```
/ → /signup or /login
         ↓
    /onboarding (new users only)
         ↓
    /dashboard (hub)
         ↓
    8 Dashboard Modules + Settings
         ↓
    Detail Pages (calls, appointments)
```

## Related Files

The following files in the repository document the application:
- **ARCHITECTURE_MAP.md** - Technical architecture reference
- **VISUAL_ARCHITECTURE.txt** - ASCII diagrams and visualizations
- **APPLICATION_GUIDE.md** - Comprehensive guide with examples
- **APP_STRUCTURE_INDEX.md** - This file

## Quick Facts

- **Framework**: Next.js 13+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **State Management**: React Hooks only (no Redux/Zustand)
- **Auth Method**: JWT tokens with middleware protection
- **Backend**: Cloudflare Workers (API URL configurable)
- **Data Storage**: localStorage + secure cookies
- **Real-time Updates**: 5-second polling via custom hook

## For Developers

When working on the application:
1. Refer to **APPLICATION_GUIDE.md** for feature location
2. Check **ARCHITECTURE_MAP.md** for file paths and structure
3. Use **VISUAL_ARCHITECTURE.txt** for understanding flows
4. Always check middleware.ts for route protection requirements
5. Verify API endpoints in API INTEGRATION section before making requests

## Support & Questions

If you need to find:
- A specific page → See "Complete Pages List" section above
- A specific module → See "Dashboard Modules Overview"
- How something works → Check corresponding documentation file
- Where a file is located → Check "File Structure" section

---

Generated: 2025-11-14
Last Updated: Version 1.0 (Complete)
