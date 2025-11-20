# COCCINELLE.AI SAAS - COMPREHENSIVE APPLICATION MAP

## EXECUTIVE SUMMARY

Coccinelle.AI is a comprehensive SaaS platform for real estate businesses that combines:
- AI Voice Agent (Sara) for automated phone calls
- Knowledge Base with RAG (Retrieval-Augmented Generation)
- Appointment/Calendar Management
- Property Catalog Management
- Advanced Analytics & Reporting
- Multi-tenant Support

**Total Pages**: 21 unique pages + dynamic detail pages
**Total Components**: 15+ specialized dashboard/settings components
**Entry Points**: 5 (/, /login, /signup, /onboarding, /book/[tenantId])
**Protected Routes**: 9 dashboard modules + 1 settings page
**API Endpoints**: 15+ integrated endpoints

---

## QUICK REFERENCE - ALL PAGES

### PUBLIC PAGES (No Auth Required)
1. **Landing Page** `/` → Marketing homepage
2. **Login Page** `/login` → User authentication
3. **Signup Page** `/signup` → New user registration
4. **Booking Page** `/book/[tenantId]` → Public appointment booking

### PROTECTED PAGES (Auth Required)
5. **Onboarding** `/onboarding` → 5-step setup wizard for new users
6. **Dashboard Hub** `/dashboard` → Main dashboard with module navigation
7. **Calls List** `/dashboard/appels` → Call history & statistics
8. **Call Details** `/dashboard/appels/[callId]` → Single call transcript & info
9. **Appointments** `/dashboard/rdv` → Appointment management
10. **Appointment Details** `/dashboard/rdv/[appointmentId]` → Single appointment details
11. **Knowledge Base** `/dashboard/knowledge` → RAG management (Auto-Builder, Upload, Test)
12. **Properties** `/dashboard/properties` → Real estate catalog
13. **Analytics** `/dashboard/analytics` → Business intelligence (2 tabs)
14. **Sara Config** `/dashboard/sara` → AI agent customization (4 tabs)
15. **Sara Analytics** `/dashboard/sara-analytics` → Call performance (3 tabs)
16. **Settings** `/dashboard/settings` → Account settings (7 tabs)

---

## CORE MODULES - FUNCTIONALITY BREAKDOWN

### MODULE 1: AGENT VOCAL (CALLS MANAGEMENT)
**Routes**: `/dashboard/appels` + `/dashboard/appels/[callId]`

**List Page Features**:
- Real-time stats: Total calls, RDV created, conversion rate, avg duration
- Advanced filters: Status, date range, duration, cost, prospect search, RDV filter
- Paginated table (20 items/page) with Excel export
- Click-to-view details for each call

**Detail Page Features**:
- Call metadata (ID, VAPI ID, prospect info, phone, cost)
- Call summary
- Full transcript display
- Back navigation to list

---

### MODULE 2: RENDEZ-VOUS (APPOINTMENTS)
**Routes**: `/dashboard/rdv` + `/dashboard/rdv/[appointmentId]`

**List Page Features**:
- Real-time stats: Total RDV, upcoming, confirmed, attendance rate
- Multi-filter system: Status, agent, date period, name search
- Paginated table with Excel export
- "+ New RDV" modal for creating appointments
- Click-to-view details for each appointment

**Detail Page Features**:
- Appointment date/time information
- Prospect details (name, phone, email)
- Agent assignment details
- Notes section
- Edit modal (date, time, status, notes)
- Delete functionality with confirmation

---

### MODULE 3: KNOWLEDGE BASE
**Route**: `/dashboard/knowledge`

**Tab 1: Auto-Builder**
- AI-powered automatic KB generation
- Auto-generates from calls, appointments, documents
- KnowledgeBuilder component

**Tab 2: Upload Documents**
- Crawl Mode: URL-based web scraping (max 3 pages)
- Manual Mode: Direct text/content input
- Status feedback (success/error messages)

**Tab 3: Test RAG**
- Q&A interface for testing KB
- Real-time answer generation
- Source attribution with links
- History tracking (last 3 queries)

---

### MODULE 4: PROPERTIES CATALOG
**Route**: `/dashboard/properties`

**Features**:
- 6 statistics cards (total, available, under-offer, sold, avg-price, IA-matches)
- Multi-filter system (search, type, status)
- 3-column grid layout with property cards
- Each card shows: title, location, price, specs, status, IA matches
- Action buttons: View, Edit, Delete
- "+ Add Property" button

---

### MODULE 5: ANALYTICS DASHBOARD
**Route**: `/dashboard/analytics` (2 tabs)

**Tab 1: Traditional Analytics**
- Period selector (7d, 30d, 90d, 1y)
- 6 KPI cards (documents, calls, RDV, conversion rate, cost, duration)
- 4 visualization charts:
  - Line chart: Call evolution over time
  - Bar chart: RDV by weekday distribution
  - Pie chart: RDV status breakdown
  - Area chart: Cumulative VAPI costs
- Top 5 Questions table
- Agent Performance leaderboard
- ROI section (cost per RDV, attendance rate, no-show rate)
- Export PDF functionality

**Tab 2: AI Insights**
- AIInsightsPanel component
- Intelligent analysis of calls, appointments, documents

---

### MODULE 6: SARA CONFIGURATION
**Route**: `/dashboard/sara` (4 tabs)

**Statistics Cards** (4):
- Sara status (Active/Inactive)
- Calls today count
- Qualification rate percentage
- Average call duration

**Tab 1: Voice & Audio**
- 4 voice options dropdown (Denise, Henri, Alain, Celeste)
- Speech speed slider (0.5x - 2.0x)
- Pitch slider (Grave to Aiguë)
- Test voice button

**Tab 2: Personality**
- Tone selector (Professional, Friendly, Expert, Casual)
- Formality level (Formel/Informel)
- Enthusiasm slider (0-100%)

**Tab 3: Scripts**
- Main conversation script textarea
- Template variable help (AGENCY_NAME, PROSPECT_NAME, AGENT_NAME, PROPERTY_TYPE)

**Tab 4: Qualification**
- Criteria checkboxes:
  - Budget
  - Timeline/Deadline
  - Location
  - Property type
  - Urgency level

**Save Configuration Button** (top-right)

---

### MODULE 7: SARA ANALYTICS
**Route**: `/dashboard/sara-analytics` (3 tabs)

**Overall Display**:
- Performance score (0-100) with color-coded badge
- Circular score visualization
- Quick metrics: Handle rate, Conversion rate, RDV created count

**Tab 1: Funnel Analysis**
- Call flow visualization
- Conversion funnel stages

**Tab 2: Performance Metrics**
- Call performance statistics
- Performance indicators

**Tab 3: Recommendations**
- AI-generated insights
- Actionable recommendations
- Issue badge with count

---

### MODULE 8: SETTINGS & ACCOUNT MANAGEMENT
**Route**: `/dashboard/settings`

**Navigation**: Left sidebar (7 tabs)

1. **Disponibilités** - AvailabilitySettings component
   - Schedule management
   - Availability windows

2. **Équipe** - TeamManagement component
   - Team member management
   - Role assignment
   - Permissions

3. **Calendriers** - CalendarIntegration component
   - Google Calendar integration
   - Other calendar services

4. **Profil** - ProfileForm component
   - User profile information
   - Company details
   - Contact information

5. **Clés API** - APIKeysForm component
   - API key generation
   - Key management
   - Usage limits

6. **Notifications** - NotificationsSettings component
   - Email notification preferences
   - SMS notification settings
   - Alert configuration

7. **Sécurité** - SecuritySettings component
   - Password management
   - Two-factor authentication
   - Session management

---

## AUTHENTICATION & SECURITY ARCHITECTURE

### Authentication Flow
```
1. User visits / (landing)
   ↓
2a. Sign Up Path:
    - Fill form (company, name, email, password, phone, sector)
    - POST /api/v1/auth/signup
    - Receive JWT token + user/tenant data
    - Store in localStorage + cookies
    - Redirect to /onboarding
    ↓
2b. Login Path:
    - Email + password
    - POST /api/v1/auth/login
    - Receive JWT token
    - Store in localStorage + cookies
    - Redirect to /dashboard
    ↓
3. Middleware Protection:
   - Read auth_token from cookie
   - Decode JWT payload
   - Check expiration: now < exp
   - Allow/deny route access
   ↓
4. Access Dashboard:
   - All /dashboard/* routes protected
   - /onboarding also protected
   - Live data updates via API
```

### Token Management
- **Storage**: 
  - localStorage: `auth_token`, `user`, `tenant` (JSON objects)
  - Cookies: `auth_token` (HttpOnly, Secure, 7-day expiry, SameSite: strict)
- **Validation**: Client-side JWT decoding without signature verification
- **Expiration**: Checked before route access

---

## NAVIGATION MAP

### User Journeys

**New User Complete Flow**:
```
/ (Landing)
↓
/signup (Register)
│ ├─ Company name, full name, email, password, phone, sector
│ └─ OAuth options (Google, Apple, Twitter/X, Telegram)
↓
/onboarding (5-step wizard)
│ ├─ Step 1: Welcome
│ ├─ Step 2: Business info
│ ├─ Step 3: Sara configuration
│ ├─ Step 4: Knowledge base setup
│ └─ Step 5: Completion
↓
/dashboard (Main hub)
```

**Existing User Flow**:
```
/ (Landing)
↓
/login (Sign in)
│ ├─ Email + password
│ └─ OAuth options
↓
/dashboard (Main hub)
```

**Dashboard Navigation**:
```
/dashboard (Hub)
├─ /appels (Calls)
│  └─ /appels/[callId] (Call details)
├─ /rdv (Appointments)
│  └─ /rdv/[appointmentId] (Appointment details)
├─ /knowledge (Knowledge base)
│  ├─ Auto-builder tab
│  ├─ Upload tab
│  └─ Test RAG tab
├─ /properties (Property catalog)
├─ /analytics (Analytics)
│  ├─ Analytics tab
│  └─ AI Insights tab
├─ /sara (Sara configuration)
│  ├─ Voice & Audio
│  ├─ Personality
│  ├─ Scripts
│  └─ Qualification
├─ /sara-analytics (Call performance)
│  ├─ Funnel
│  ├─ Performance
│  └─ Recommendations
└─ /settings (Account settings)
   ├─ Disponibilités
   ├─ Équipe
   ├─ Calendriers
   ├─ Profil
   ├─ Clés API
   ├─ Notifications
   └─ Sécurité
```

**Public Booking Flow**:
```
/book/[tenantId]
├─ Step 1: Date selection (30-day calendar)
├─ Step 2: Time slot selection
├─ Step 3: Service selection (optional)
├─ Step 4: Contact information form
└─ Step 5: Confirmation
   └─ SMS/Email confirmation
   └─ Sara callback option
```

---

## API INTEGRATION

### Endpoints Used
- **Auth**: `/api/v1/auth/login`, `/api/v1/auth/signup`, `/api/v1/auth/logout`
- **Calls**: `/api/v1/vapi/calls`, `/api/v1/vapi/calls/[id]`, `/api/v1/vapi/stats`
- **Appointments**: `/api/v1/appointments`, `/api/v1/appointments/[id]`
- **Knowledge**: `/api/v1/knowledge/documents`, `/api/v1/knowledge/ask`, `/api/v1/knowledge/crawl`
- **Public**: `/api/v1/public/[tenantId]/info`, `/api/v1/public/[tenantId]/services`, `/api/v1/public/[tenantId]/availability`, `/api/v1/public/[tenantId]/book`

### Data Loading Patterns
- **Initial Load**: Dashboard queries multiple endpoints in parallel
- **Live Updates**: 5-second polling interval via custom `useLiveUpdates()` hook
- **Demo Mode**: Fallback to mock data for localhost development
- **Error Handling**: User-friendly error messages, retry mechanisms

---

## COMPONENT ECOSYSTEM

### Dashboard Components (src/components/dashboard/)
1. **SmartAlerts** - Real-time alerts for calls/appointments
2. **NotificationCenter** - Notification bell with badge count
3. **ToastNotification** - Toast message display system
4. **CallFunnel** - Sales funnel visualization
5. **CallPerformance** - Performance metrics display
6. **CallInsights** - Recommendations and insights
7. **AIInsightsPanel** - AI-generated business insights
8. **KnowledgeBuilder** - Automatic KB generation

### Settings Components (src/components/settings/)
1. **ProfileForm** - User/company profile editing
2. **APIKeysForm** - API key management
3. **NotificationsSettings** - Notification preferences
4. **SecuritySettings** - Password, 2FA, sessions
5. **AvailabilitySettings** - Schedule/availability
6. **TeamManagement** - Team member management
7. **CalendarIntegration** - Calendar service connections

### Shared Components
- **Logo** - Coccinelle branding (used in headers)

---

## STATE MANAGEMENT APPROACH

**No external state management library (Redux, Zustand)**

**React Hooks-based pattern**:
- `useState` for local component state
- `useEffect` for side effects and data loading
- `useRouter` for navigation (next/router)
- `useParams` for dynamic route parameters
- Custom `useLiveUpdates()` hook for polling

**Storage**:
- localStorage: Authentication tokens and user data
- Cookies: Secure JWT token (7-day expiry)
- Component state: Form inputs, filters, pagination, modals

---

## KEY FEATURES SUMMARY TABLE

| Feature | Module | Type | Key Capability |
|---------|--------|------|-----------------|
| Voice Agent | Agent Vocal | Call Mgmt | Auto-dialing, transcript capture |
| Call Analytics | Appels | Analytics | Filter, search, export to Excel |
| Appointment Mgmt | RDV | Calendar | CRUD, status tracking, agent assignment |
| Knowledge Base | Knowledge | RAG | Upload, crawl, Q&A testing, auto-build |
| Property Management | Properties | Inventory | Grid view, filter, IA matching |
| Business Intelligence | Analytics | Reporting | 4 charts, 6 KPIs, PDF export |
| Agent Configuration | Sara | AI Config | Voice, personality, scripts, criteria |
| Performance Analysis | Sara Analytics | AI Metrics | Funnel, score, recommendations |
| Account Management | Settings | Admin | Profile, API keys, team, notifications |

---

## INTEGRATION POINTS WITH BACKEND

### API Base URL Configuration
- **Production**: `https://coccinelle-api.youssef-amrouche.workers.dev`
- **Development**: `localhost:8787` (with demo mode)
- **Environment**: `process.env.NEXT_PUBLIC_API_URL`

### Demo Mode Activation
- **Trigger**: `isDemoMode()` checks for localhost
- **Fallback Data**: Mock calls, appointments, documents, stats
- **Use Case**: Local development without backend

### Real-time Updates
- **Polling Interval**: 5 seconds (configurable)
- **Hook**: `useLiveUpdates(options)`
- **Features**: Auto-fetch, toast notifications, configurable enable/disable

---

## CRITICAL PATHS & DEPENDENCIES

### 1. Authentication Critical Path
```
middleware.ts (token validation)
    ↓
/login or /signup (token generation)
    ↓
localStorage/cookies (token storage)
    ↓
/dashboard (requires valid token)
    ↓
All protected routes gated by token check
```

### 2. Dashboard Data Loading Path
```
/dashboard/page.tsx renders
    ↓
useEffect triggers data fetches (parallel):
├─ GET /api/v1/vapi/calls
├─ GET /api/v1/knowledge/documents
├─ GET /api/v1/appointments
└─ GET /api/v1/vapi/stats
    ↓
useState updates with results
    ↓
useLiveUpdates hook starts polling (5s intervals)
    ↓
Toast notifications on new data
    ↓
Stats cards + Smart Alerts update
```

### 3. Detail Page Access Path
```
Module list page (e.g., /dashboard/appels)
    ↓
User clicks row
    ↓
Navigate to detail page with ID:
/dashboard/appels/[callId]
    ↓
useParams retrieves callId
    ↓
useEffect fetches single record
    ↓
Display details page
    ↓
"Back" link returns to list
```

---

## SECURITY MEASURES

1. **Route Protection**: Middleware validates tokens before access
2. **Token Encryption**: Cookies marked as HttpOnly, Secure, SameSite: strict
3. **Expiration Validation**: JWT exp claim checked before route access
4. **Form Validation**: Client-side validation with error feedback
5. **Password Requirements**: Minimum 8 characters for signup
6. **Session Management**: 7-day token expiry, automatic refresh on login

---

## PERFORMANCE OPTIMIZATIONS

1. **Parallel Data Loading**: Dashboard fetches multiple endpoints simultaneously
2. **Pagination**: Lists use 20 items per page to reduce load
3. **Lazy Loading**: Detail pages load only when accessed
4. **Smart Alerts**: Only displayed after initial data load
5. **Configurable Polling**: Live updates can be enabled/disabled
6. **Local Storage Caching**: User/tenant data stored locally
7. **Excel/PDF Export**: Server-side generation to reduce client load

---

## RESPONSIVE DESIGN

**Breakpoints Used**:
- `sm`: Small devices
- `md`: Medium devices
- `lg`: Large devices

**Key Patterns**:
- Mobile-first grid layouts
- Responsive tables with horizontal scroll
- Collapsible/expandable sections
- Touch-friendly button sizing
- Responsive modal dialogs

---

## DEPLOYMENT CONSIDERATIONS

1. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: Backend API endpoint
   - `NODE_ENV`: Development vs Production

2. **Build Optimization**:
   - Next.js automatic code splitting
   - Asset optimization
   - Image lazy-loading via Lucide React

3. **Production Checklist**:
   - Set secure cookies (HttpOnly, Secure)
   - Update API URL to production endpoint
   - Enable HTTPS everywhere
   - Set proper CORS headers
   - Configure CSP headers

---

## TESTING RECOMMENDATIONS

### Unit Tests
- Form validation logic
- Filter state management
- Token validation functions

### Integration Tests
- Auth flow (signup → onboarding → dashboard)
- Data loading and display
- Module navigation
- Detail page access

### E2E Tests
- Complete user journeys
- Public booking flow
- Multi-step processes (onboarding)
- API error handling

---

## FILE STRUCTURE REFERENCE

```
coccinelle-saas/
├── app/                           (Next.js App Router)
│   ├── page.tsx                   (Landing /)
│   ├── layout.tsx                 (Root layout)
│   ├── login/page.tsx             (Login /login)
│   ├── signup/page.tsx            (Signup /signup)
│   ├── onboarding/page.tsx        (Onboarding /onboarding)
│   ├── book/[tenantId]/page.tsx   (Public booking /book/[tenantId])
│   ├── api/auth/                  (Auth endpoints)
│   │   ├── login/route.ts
│   │   ├── signup/route.ts
│   │   └── logout/route.ts
│   └── dashboard/                 (Protected pages)
│       ├── page.tsx               (Hub /dashboard)
│       ├── layout.tsx
│       ├── appels/                (Calls module)
│       │   ├── page.tsx
│       │   └── [callId]/page.tsx
│       ├── rdv/                   (Appointments module)
│       │   ├── page.tsx
│       │   └── [appointmentId]/page.tsx
│       ├── knowledge/page.tsx      (Knowledge base)
│       ├── properties/page.tsx     (Properties)
│       ├── analytics/page.tsx      (Analytics)
│       ├── sara/page.tsx           (Sara config)
│       ├── sara-analytics/page.tsx (Sara analytics)
│       └── settings/page.tsx       (Settings)
│
├── src/
│   ├── components/
│   │   ├── Logo.tsx
│   │   ├── dashboard/             (Dashboard components)
│   │   │   ├── SmartAlerts.tsx
│   │   │   ├── NotificationCenter.tsx
│   │   │   ├── ToastNotification.tsx
│   │   │   ├── CallFunnel.tsx
│   │   │   ├── CallPerformance.tsx
│   │   │   ├── CallInsights.tsx
│   │   │   ├── AIInsightsPanel.tsx
│   │   │   └── KnowledgeBuilder.tsx
│   │   └── settings/              (Settings components)
│   │       ├── ProfileForm.tsx
│   │       ├── APIKeysForm.tsx
│   │       ├── NotificationsSettings.tsx
│   │       ├── SecuritySettings.tsx
│   │       ├── AvailabilitySettings.tsx
│   │       ├── TeamManagement.tsx
│   │       └── CalendarIntegration.tsx
│   └── constants/
│       └── industries.ts           (Industry options for signup)
│
└── middleware.ts                  (Route protection)
```

---

## SUMMARY

Coccinelle.AI is a sophisticated, multi-module SaaS application with:
- **16 main pages** covering auth, onboarding, and 8 dashboard modules
- **4 detail page templates** for calls and appointments
- **3 public pages** (landing, login, signup)
- **1 public booking page** (customer-facing)
- **8 protected dashboard modules** with specialized functionality
- **Robust authentication** with JWT tokens and middleware protection
- **Real-time capabilities** via 5-second polling
- **Comprehensive analytics** with charts, exports, and AI insights
- **Full AI agent customization** with voice, personality, and script controls
- **Professional UI** with responsive design, consistent patterns, and dark/light modes

The application is production-ready with proper error handling, form validation, loading states, and user-friendly feedback mechanisms.

