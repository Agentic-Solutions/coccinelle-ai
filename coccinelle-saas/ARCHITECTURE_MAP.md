# Coccinelle.AI SaaS Application - Complete Architecture Map

## 1. ENTRY POINTS & PUBLIC PAGES

### Landing Page (/)
- **File**: `/app/page.tsx`
- **Type**: Public, Server-rendered
- **Purpose**: Marketing/welcome landing page
- **Features**:
  - Feature showcase (Agent Vocal, Knowledge Base, Calendar, Analytics)
  - Hero section with CTA buttons
  - How-it-works section with 3-step flow
  - Navigation to Login/Signup
  - Responsive layout

### Login Page (/login)
- **File**: `/app/login/page.tsx`
- **Type**: Public, Client-side
- **Purpose**: User authentication
- **Features**:
  - Email/password login form
  - OAuth options (Google, Apple, Twitter/X, Telegram)
  - Real-time form validation
  - Token storage in localStorage + cookies
  - Redirect to /dashboard on success
  - Error handling with user feedback
  - Remember me checkbox

### Signup Page (/signup)
- **File**: `/app/signup/page.tsx`
- **Type**: Public, Client-side
- **Purpose**: User registration
- **Features**:
  - Multi-field form (company, name, email, password, phone, sector)
  - Industry selector dropdown (INDUSTRIES constant)
  - Form validation with error messages
  - Token storage (localStorage + cookies)
  - Redirect to /onboarding on success
  - OAuth integration buttons
  - Terms/Privacy policy links

### Onboarding Flow (/onboarding)
- **File**: `/app/onboarding/page.tsx`
- **Type**: Protected, Multi-step form
- **Purpose**: Setup wizard for new users
- **Steps**:
  1. WelcomeStep - Welcome message
  2. BusinessInfoStep - Company details
  3. SaraConfigStep - AI agent configuration
  4. KnowledgeBaseStep - Knowledge base setup
  5. CompletionStep - Final confirmation
- **Features**:
  - Progress bar showing current step
  - Back/Next navigation
  - Data persistence across steps
  - Final redirect to /dashboard

### Public Booking Page (/book/[tenantId])
- **File**: `/app/book/[tenantId]/page.tsx`
- **Type**: Public, Dynamic page
- **Purpose**: Public booking/appointment scheduling interface
- **Features**:
  - Multi-step booking wizard (5 steps)
  - Step 1: Date selection (30-day calendar)
  - Step 2: Time slot selection
  - Step 3: Service selection (if available)
  - Step 4: User contact info form
  - Step 5: Booking confirmation
  - Tenant branding (logo, colors)
  - SMS/Email confirmation flow
  - Integration with Sara phone callback

---

## 2. AUTHENTICATION FLOW

### Auth Routes (/app/api/auth/)
- **Login Route**: `/app/api/auth/login/route.ts`
  - POST endpoint for authentication
  - Credentials validation
  - JWT token generation
  - Response with user + tenant data

- **Signup Route**: `/app/api/auth/signup/route.ts`
  - POST endpoint for registration
  - User creation
  - Initial tenant setup
  - Token generation

- **Logout Route**: `/app/api/auth/logout/route.ts`
  - POST endpoint for session termination
  - Cookie/token cleanup

### Middleware (/middleware.ts)
- **File**: `/middleware.ts`
- **Purpose**: Route protection and auth validation
- **Logic**:
  - Validates JWT tokens from cookies
  - Checks token expiration
  - Routes:
    - Public: `/`, `/login`, `/signup`
    - Protected: `/dashboard/*`, `/onboarding`
  - Auto-redirects logged-in users from login/signup to /dashboard
  - Auto-redirects unauthorized users to /login

### Token Storage
- **localStorage**: `auth_token`, `user`, `tenant`
- **Cookies**: `auth_token` (secure, 7-day expiry)
- **Validation**: Client-side JWT decoding + expiration check

---

## 3. DASHBOARD STRUCTURE

### Dashboard Root (/dashboard)
- **File**: `/app/dashboard/page.tsx`
- **Type**: Protected, Client-side
- **Purpose**: Main hub with KPIs and module navigation
- **Components**:
  - Header with branding and live indicator
  - Notification Center (top-right)
  - Settings link
  - Logout button
  - Statistics cards (3):
    - Appels Sara (Phone icon)
    - Documents KB (FileText icon)
    - Rendez-vous (Calendar icon)
  - Smart Alerts component
  - Module cards (grid layout, 2x4):
    1. Agent Vocal Sara → /dashboard/appels
    2. Knowledge Base → /dashboard/knowledge
    3. Rendez-vous → /dashboard/rdv
    4. Catalogue de biens → /dashboard/properties (blue border)
    5. Analytics → /dashboard/analytics
    6. Configuration Sara → /dashboard/sara (red border)
    7. Sara Analytics → /dashboard/sara-analytics (NEW badge)

### Dashboard Layout
- **File**: `/app/dashboard/layout.tsx`
- **Type**: Layout wrapper
- **Purpose**: Common layout for all dashboard pages
- **Features**: Gray background container

---

## 4. DASHBOARD MODULES

### 4.1 Agent Vocal / Appels (Calls Management)
#### List View (/dashboard/appels)
- **File**: `/app/dashboard/appels/page.tsx`
- **Type**: Protected, Data-heavy table
- **Purpose**: View all calls made by Sara
- **Features**:
  - Statistics cards (4):
    - Total Appels
    - RDV Créés
    - Taux Conversion
    - Durée Moyenne
  - Advanced filtering:
    - Status filter (Tous, Terminé, Échoué)
    - Date range (from/to)
    - Duration range (min/max)
    - Cost range (min/max)
    - Prospect name search
    - RDV created filter (Oui/Non/All)
  - Table columns:
    - ID, Status, Duration, Cost, Prospect, RDV, Date
  - Pagination (20 items/page)
  - Excel export functionality
  - Click row to view details

#### Call Details (/dashboard/appels/[callId])
- **File**: `/app/dashboard/appels/[callId]/page.tsx`
- **Type**: Protected, Detail page
- **Purpose**: View single call details
- **Features**:
  - Call information section:
    - ID (internal), ID VAPI
    - Prospect name
    - Phone number
    - Duration (seconds + formatted)
    - Cost (USD)
    - RDV created status
    - Call date
  - Call summary (if available)
  - Full transcript display
  - Back link to calls list

### 4.2 Rendez-vous (Appointments)
#### List View (/dashboard/rdv)
- **File**: `/app/dashboard/rdv/page.tsx`
- **Type**: Protected, Data-heavy
- **Purpose**: Manage all appointments
- **Features**:
  - Statistics cards (4):
    - Total RDV
    - RDV à venir
    - RDV confirmés
    - Taux présence (%)
  - Filters:
    - Status (Planifié, Confirmé, Terminé, Annulé, Absent)
    - Agent dropdown (from DB)
    - Date period (Toutes, Aujourd'hui, À venir, Passés)
    - Prospect/Agent name search
  - Table with pagination:
    - Date, Heure, Prospect, Agent, Status, Notes
  - Create new appointment modal
  - Excel export
  - Click row for details

#### Appointment Details (/dashboard/rdv/[appointmentId])
- **File**: `/app/dashboard/rdv/[appointmentId]/page.tsx`
- **Type**: Protected, Detail page
- **Purpose**: View/edit appointment details
- **Features**:
  - Left panel: Appointment date/time info
  - Right panels:
    - Prospect info (name, phone, email)
    - Agent info (name, email)
  - Notes display
  - Action buttons:
    - Edit (opens modal)
    - Delete (with confirmation)
  - Edit modal:
    - Date, Time, Status, Notes fields
    - Save/Cancel buttons

### 4.3 Knowledge Base RAG (/dashboard/knowledge)
- **File**: `/app/dashboard/knowledge/page.tsx`
- **Type**: Protected, Multi-feature
- **Purpose**: Manage AI knowledge base
- **Tabs**:
  1. **Auto-Builder** (AI-powered, 💜 gradient button)
     - Components: KnowledgeBuilder
     - Auto-generates KB from calls/appointments/documents
  
  2. **Ajouter des documents** (Upload)
     - Two modes: Crawl URL or Manual text
     - Crawl mode:
       - URL input
       - Auto-crawls up to 3 pages
     - Manual mode:
       - Title input
       - Content textarea
     - Upload status feedback
  
  3. **Tester le RAG** (Test Q&A)
     - Question input field
     - Real-time answer display
     - Source attribution (books icon)
     - External links support
     - History of last 3 questions

### 4.4 Properties Catalog (/dashboard/properties)
- **File**: `/app/dashboard/properties/page.tsx`
- **Type**: Protected, Real estate focused
- **Purpose**: Manage real estate inventory
- **Features**:
  - Statistics cards (6):
    - Total properties
    - Available (green)
    - Under offer (orange)
    - Sold (gray)
    - Average price (blue)
    - IA Matches total (purple gradient)
  - Filters:
    - Search by title/location
    - Type filter (Tous, Apartements, Maisons, Terrains, Commerces)
    - Status filter (Tous, Disponible, Sous offre, Vendu)
  - Add button
  - Grid display (3 columns):
    - Property card with:
      - Image placeholder
      - Title, Location
      - Status badge
      - Type tag
      - IA Matches count (if > 0)
      - Price
      - Specs (bedrooms, bathrooms, surface)
      - Action buttons (View, Edit, Delete)

### 4.5 Analytics (/dashboard/analytics)
- **File**: `/app/dashboard/analytics/page.tsx`
- **Type**: Protected, Multi-tab analytics
- **Purpose**: Comprehensive analytics dashboard
- **Tabs**:
  1. **Analytics** (Default)
     - Period selector (7d, 30d, 90d, 1y)
     - KPI cards (6):
       - Documents indexed
       - Total calls Sara
       - Total RDV created
       - Conversion rate (%)
       - Total VAPI cost ($)
       - Average call duration
     - Charts:
       - Line chart: Call evolution
       - Bar chart: RDV by weekday
       - Pie chart: RDV status distribution
       - Area chart: Cumulative VAPI costs
     - Tables:
       - Top 5 questions
       - Agent performance
     - ROI section:
       - Cost per RDV
       - Attendance rate
       - No-show rate
     - Export PDF button
  
  2. **AI Insights** (Gradient button)
     - Component: AIInsightsPanel
     - Analyzes calls, appointments, documents

### 4.6 Sara Configuration (/dashboard/sara)
- **File**: `/app/dashboard/sara/page.tsx`
- **Type**: Protected, Configuration
- **Purpose**: Customize Sara AI agent
- **Stats** (4 cards):
  - Sara status (Active)
  - Calls today count
  - Qualification rate (%)
  - Average call duration
- **Tabs**:
  1. **Voix & Audio**
     - Voice selection dropdown (Denise, Henri, Alain, Celeste)
     - Speech speed slider (0.5x - 2.0x)
     - Pitch slider (Grave - Aiguë)
     - Voice test button
  
  2. **Personnalité**
     - Tone selector (Professional, Friendly, Expert, Casual)
     - Formality level (Formel/Informel)
     - Enthusiasm slider (0-100%)
  
  3. **Scripts**
     - Main script textarea
     - Template variables help:
       - {AGENCY_NAME}
       - {PROSPECT_NAME}
       - {AGENT_NAME}
       - {PROPERTY_TYPE}
  
  4. **Qualification**
     - Checklist of criteria Sara should collect:
       - Budget
       - Timeline/Deadline
       - Location
       - Property type
       - Urgency level
- **Save button** (top-right)

### 4.7 Sara Analytics (/dashboard/sara-analytics)
- **File**: `/app/dashboard/sara-analytics/page.tsx`
- **Type**: Protected, AI performance analytics
- **Purpose**: Analyze Sara's call performance
- **Features**:
  - Overall score badge (0-100, with color coding)
  - Score interpretation text
  - Quick metrics (3):
    - Handle rate (%)
    - Conversion rate (%)
    - RDV created count
  - Circular score visualization
  - Refresh button
- **Tabs**:
  1. **Funnel d'appels** - Call flow analysis
  2. **Performance** - Performance metrics
  3. **Recommandations** - Recommendations with badge count

---

## 5. SETTINGS PAGES (/dashboard/settings)
- **File**: `/app/dashboard/settings/page.tsx`
- **Type**: Protected, Multi-tab settings
- **Navigation**: Left sidebar with tab list
- **Tabs** (7):
  1. **Disponibilités** - AvailabilitySettings component
  2. **Équipe** - TeamManagement component
  3. **Calendriers** - CalendarIntegration component
  4. **Profil** - ProfileForm component
  5. **Clés API** - APIKeysForm component
  6. **Notifications** - NotificationsSettings component
  7. **Sécurité** - SecuritySettings component

---

## 6. COMPONENT DEPENDENCIES

### Dashboard Components (src/components/dashboard/)
- **SmartAlerts** - Intelligent alerts for calls/appointments
- **NotificationCenter** - Notification management with unread count
- **ToastNotification** - Toast message container
- **CallFunnel** - Sales funnel visualization
- **CallPerformance** - Call metrics display
- **CallInsights** - Insights and recommendations
- **AIInsightsPanel** - AI-generated insights
- **KnowledgeBuilder** - Auto-builder for knowledge base

### Settings Components (src/components/settings/)
- **ProfileForm** - User profile management
- **APIKeysForm** - API key management
- **NotificationsSettings** - Notification preferences
- **SecuritySettings** - Security options
- **AvailabilitySettings** - Schedule/availability
- **TeamManagement** - Team member management
- **CalendarIntegration** - Calendar integrations (Google, etc.)

### UI Components
- **Logo** - Coccinelle branding component
- Used across: dashboard pages, headers, sidebar

---

## 7. NAVIGATION PATTERNS

### User Journey
```
/ (Landing) 
  ↓
  → Login (/login) → Dashboard (/dashboard)
  → Signup (/signup) → Onboarding (/onboarding) → Dashboard (/dashboard)

Dashboard (/dashboard) → 7 Main Modules
  → Appels (/dashboard/appels) → Details (/dashboard/appels/[callId])
  → RDV (/dashboard/rdv) → Details (/dashboard/rdv/[appointmentId])
  → Knowledge (/dashboard/knowledge)
  → Properties (/dashboard/properties)
  → Analytics (/dashboard/analytics)
  → Sara Config (/dashboard/sara)
  → Sara Analytics (/dashboard/sara-analytics)
  → Settings (/dashboard/settings)
```

### Header Navigation
- Dashboard pages have consistent header with:
  - Logo/Title
  - Live indicator (when polling)
  - Notification Center
  - Settings link
  - Logout button

### Cross-module Links
- Dashboard cards link to modules
- Back links in detail pages
- Module links in settings

---

## 8. DATA FLOW & API INTEGRATION

### API Base URL
- Production: `https://coccinelle-api.youssef-amrouche.workers.dev`
- Dev: `process.env.NEXT_PUBLIC_API_URL` (localhost:8787)

### Key API Endpoints Used
- **Auth**: `/api/v1/auth/login`, `/api/v1/auth/signup`
- **Calls**: `/api/v1/vapi/calls`, `/api/v1/vapi/stats`
- **Appointments**: `/api/v1/appointments`
- **Knowledge**: `/api/v1/knowledge/documents`, `/api/v1/knowledge/ask`
- **Properties**: `/api/v1/properties`
- **Public**: `/api/v1/public/[tenantId]/info`, `/api/v1/public/[tenantId]/services`

### Demo Mode
- **isDemoMode()** checks for localhost
- Falls back to mock data:
  - mockCalls, mockAppointments, mockDocuments
  - mockStats, mockProspects, mockAgents
  - mockTenant, mockServices, mockSlots

### Live Updates Hook
- **useLiveUpdates()** - Polls for real-time updates
- Interval: 5 seconds (configurable)
- Toast notifications on new data
- Configurable enable/disable

---

## 9. STATE MANAGEMENT

### Client-side State
- React hooks: useState, useEffect, useContext
- Router integration: useRouter, useParams
- No external state management library (Redux, Zustand)

### Key State Patterns
- Form states (input values, validation)
- Loading states (data fetching)
- Filter states (applied filters in lists)
- Pagination states (current page)
- Modal states (show/hide)
- Tab states (active tab)

---

## 10. SECURITY & AUTHENTICATION

### Protected Routes
- `/dashboard/*` - Requires valid token
- `/onboarding` - Requires authentication
- Public: `/`, `/login`, `/signup`, `/book/[tenantId]`

### Token Validation
- JWT decoding without signature verification
- Expiration check
- 7-day cookie expiry
- SameSite: strict

### Form Validation
- Client-side validation
- Real-time feedback
- Error messages
- Field requirements

---

## 11. UI/UX PATTERNS

### Color Scheme
- Primary: Black/Gray (900 for dark text)
- Accents: Blue, Green, Orange, Purple, Red
- Backgrounds: Gray-50 for pages, White for cards
- Borders: Gray-200

### Components Layout
- Header: White bg, gray border-bottom
- Cards: White bg, rounded-lg, shadow-sm, border gray-200
- Buttons: Consistent padding, hover states
- Tables: Striped rows, hover effects
- Forms: Clean spacing, label above inputs

### Icons
- Lucide React icons (Phone, Calendar, FileText, etc.)
- Consistent sizing (w-4 h-4 to w-6 h-6)
- Semantic icon use

### Responsive Design
- Mobile-first approach
- Grid breakpoints: sm, md, lg
- Flex layouts for horizontal alignment
- Responsive tables with overflow-x

---

## 12. KEY FEATURES SUMMARY

| Module | Purpose | Key Features |
|--------|---------|--------------|
| Agent Vocal | Call management | Filter, export, details, pagination |
| RDV | Appointment mgmt | CRUD, filter, calendar, agents |
| Knowledge | AI knowledge base | Upload, crawl, Q&A testing, auto-build |
| Properties | Real estate catalog | Grid view, filter, status, matches |
| Analytics | Business intelligence | 6 KPIs, 4 charts, tables, PDF export |
| Sara Config | AI customization | Voice, personality, scripts, qualification |
| Sara Analytics | Call performance | Funnel, metrics, insights, recommendations |
| Settings | Account management | Profile, API, notifications, security, team |

---

## 13. FILE STRUCTURE SUMMARY

```
/app
├── page.tsx (Landing)
├── layout.tsx (Root layout)
├── login/page.tsx
├── signup/page.tsx
├── onboarding/page.tsx
├── book/[tenantId]/page.tsx
├── api/auth/
│   ├── login/route.ts
│   ├── signup/route.ts
│   └── logout/route.ts
└── dashboard/
    ├── page.tsx (Hub)
    ├── layout.tsx
    ├── appels/
    │   ├── page.tsx (List)
    │   └── [callId]/page.tsx (Details)
    ├── rdv/
    │   ├── page.tsx (List)
    │   └── [appointmentId]/page.tsx (Details)
    ├── knowledge/page.tsx
    ├── properties/page.tsx
    ├── analytics/page.tsx
    ├── sara/page.tsx
    ├── sara-analytics/page.tsx
    └── settings/page.tsx

/src/components
├── Logo.tsx
├── dashboard/
│   ├── SmartAlerts.tsx
│   ├── NotificationCenter.tsx
│   ├── ToastNotification.tsx
│   ├── CallFunnel.tsx
│   ├── CallPerformance.tsx
│   ├── CallInsights.tsx
│   ├── AIInsightsPanel.tsx
│   └── KnowledgeBuilder.tsx
└── settings/
    ├── ProfileForm.tsx
    ├── APIKeysForm.tsx
    ├── NotificationsSettings.tsx
    ├── SecuritySettings.tsx
    ├── AvailabilitySettings.tsx
    ├── TeamManagement.tsx
    └── CalendarIntegration.tsx

/middleware.ts
```

---

## 14. ENTRY POINT SEQUENCE

### New User Flow
1. Land on `/` (landing page)
2. Click "Commencer gratuitement" → `/signup`
3. Fill registration form
4. Redirect to `/onboarding` (5-step wizard)
5. Complete onboarding
6. Redirect to `/dashboard`

### Existing User Flow
1. Visit `/login`
2. Enter credentials
3. Token stored in localStorage + cookie
4. Redirect to `/dashboard`
5. Access protected routes via middleware auth check

---

## 15. CRITICAL INTERDEPENDENCIES

### Authentication Critical Path
- middleware.ts → Token validation → Route protection
- login/signup → Token storage → Dashboard access
- Any dashboard route → Requires valid token

### Data Flow Critical Path
- Dashboard page → Load stats
- Stats cards → useLiveUpdates hook
- Polling enabled after initial load
- Toast notifications update state

### Navigation Critical Path
- Dashboard → Module cards → Detail pages
- Detail pages → Back links → Module lists
- Settings sidebar → Tab selection → Component rendering

