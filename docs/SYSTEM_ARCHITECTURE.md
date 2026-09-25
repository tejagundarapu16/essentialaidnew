# EssentialAid — System Architecture Document
**Coordinated Humanitarian Aid, Rapid Disaster Relief & Real-Time Delivery Tracking Platform**

---

## 1. Executive Overview

**EssentialAid** is a full-stack, mission-critical humanitarian aid distribution platform engineered to coordinate crisis relief drives, surplus donor supplies, and urgent recipient requests in real time. 

The system brings together five distinct stakeholder roles—**Donors**, **Recipients**, **Volunteers**, **Logistics Coordinators**, and **Crisis Administrators**—under a unified, responsive web platform equipped with automated AI verification, intelligent proximity matching, and turn-by-turn Google Maps delivery tracking.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph "Client Presentation Layer"
        UI_D["Donor Portal"]
        UI_R["Recipient Portal"]
        UI_V["Volunteer Mission Hub"]
        UI_L["Logistics Portal"]
        UI_A["Admin Crisis Command"]
        DS["Dashboard Shell & Role Switcher"]
    end

    subgraph "State & Reactive Client Core"
        STORE["Central Reactive Store (StoreProvider)"]
        MATCH["Smart Matching Engine (rankMatches)"]
        GEO["Geographic Engine (lib/geo.ts)"]
        MAPS["Google Maps JS API & Canvas Vector Fallback"]
    end

    subgraph "Next.js Serverless API Layer"
        API_AUTH["/api/auth/send-otp<br/>/api/auth/verify-otp<br/>/api/auth/resend-otp"]
        API_STORE["/api/store (Backend Persistence Sync)"]
    end

    subgraph "Backend Services & Security"
        OTP_SRV["OTP Generation & HMAC Token Hashing"]
        EMAIL_SRV["Email Service (Nodemailer SMTP / Gmail TLS)"]
        MEM_STORE["In-Memory & Persistent Storage (backend-store.ts)"]
    end

    subgraph "External Providers & APIs"
        GMAPS_API["Google Maps JavaScript SDK"]
        SMTP_RELAY["Gmail SMTP Gateway / Custom Mail Server"]
    end

    UI_D --> DS
    UI_R --> DS
    UI_V --> DS
    UI_L --> DS
    UI_A --> DS

    DS --> STORE
    STORE --> MATCH
    STORE --> GEO
    GEO --> MAPS

    STORE --> API_STORE
    API_STORE --> MEM_STORE

    DS --> API_AUTH
    API_AUTH --> OTP_SRV
    OTP_SRV --> EMAIL_SRV
    EMAIL_SRV --> SMTP_RELAY
    MAPS --> GMAPS_API
```

---

## 3. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router)** | Modern React server components, fast routing, and serverless API handlers. |
| **Frontend Core** | **React 19 & TypeScript** | Strict type safety across all donation, request, and geo-data models. |
| **Styling & UI** | **Vanilla TailwindCSS & Radix UI Primitives** | Custom high-contrast crisis-ready design system with dark mode support. |
| **Iconography** | **Lucide React** | Consistent, expressive visual language for aid categories and progress states. |
| **Mapping & GIS** | **Google Maps JavaScript API + HTML5 Canvas** | Turn-by-turn road polylines, GPS interpolation, and interactive vector fallback. |
| **Backend & APIs** | **Next.js Serverless Route Handlers** | Lightweight, zero-cold-start REST endpoints for authentication and sync. |
| **Authentication** | **Passwordless Email OTP (HMAC + SMTP)** | Secure, friction-free login without stored passwords; rate-limited and expiring. |
| **Email Delivery** | **Nodemailer + TLS SMTP** | RFC 5322 compliant transaction emails for authentication codes. |

---

## 4. Role-Based Portal Architecture

```mermaid
classDiagram
    class User {
        +String id
        +String name
        +String email
        +String phone
        +Role[] roles
        +String location
        +Coords coords
        +Boolean emailVerified
    }

    class DonorPortal {
        +listDonation()
        +trackActiveDonations()
        +joinEmergencyDrive()
        +viewCommunityNeeds()
    }

    class RecipientPortal {
        +createAidRequest()
        +trackIncomingDelivery()
        +viewLiveAidMap()
        +submitFeedbackReview()
    }

    class VolunteerPortal {
        +viewAvailableMissions()
        +acceptDeliveryTask()
        +advanceDeliveryMilestone()
        +signUpForDriveShifts()
        +trackImpactBadges()
    }

    class LogisticsPortal {
        +viewCityFleetMap()
        +assignPickupMethods()
        +scheduleDeliveryWindows()
        +manageWarehouseHubs()
    }

    class AdminPortal {
        +createEmergencyDrives()
        +verifyDonations()
        +runBatchMatching()
        +monitorCrisisMetrics()
        +viewOperationsMap()
    }

    User --> DonorPortal
    User --> RecipientPortal
    User --> VolunteerPortal
    User --> LogisticsPortal
    User --> AdminPortal
```

### 1. Donor Portal (`components/portals/donor-portal.tsx`)
- **Supply Ingestion**: Multi-category donation submission with photo attachments, condition tags, and quantity specifications.
- **Community Demand Map**: Visualizes open recipient needs across the region; enables 1-click supply matching.
- **Emergency Crisis Pledges**: Allows donors to allocate supplies directly to specific disaster relief funds.

### 2. Recipient Portal (`components/portals/recipient-portal.tsx`)
- **Aid Request Workflow**: Fast request submission categorized by urgency (`Normal`, `High`, `Critical`).
- **Live Request & Supply Tracker**: Real-time Google Map showing donor origin, in-motion courier GPS position, and matching algorithm status.
- **Delivery Confirmation & Review**: 5-star rating system with donor feedback logging upon delivery.

### 3. Volunteer Mission Hub (`components/portals/volunteer-portal.tsx`)
- **Mission Dispatch Map**: Interactive GIS view of open pickups and destination drop-offs with distance and estimated drive duration.
- **Status Stepper Controls**: Field actions (`Confirm Pickup` ➔ `Start Transit` ➔ `Complete Delivery`).
- **Relief Drive Shifts**: Instant sign-up for on-site sorting, warehouse staging, and emergency transport.
- **Impact & Badges**: Gamified recognition metrics (Hours Volunteered, Completed Deliveries, First Responder Honors).

### 4. Logistics Dispatch Portal (`components/portals/logistics-portal.tsx`)
- **Central Fleet Map**: Live visibility of all in-transit community couriers and regional distribution routes.
- **Milestone Advancement**: Dispatcher controls for scheduling time windows and allocating vehicle types.

### 5. Crisis Administrator Portal (`components/portals/admin-portal.tsx`)
- **Regional Operations Center**: Comprehensive map overlaying disaster zones, active drives, and pending supplies.
- **Verification Queue**: Manual and automated validation of donated goods for safety and quality compliance.
- **Automated Match Engine**: Proximity-and-urgency matching matrix.

---

## 5. Core Subsystems & Technical Workflows

### 5.1. The 6-Stage Donation Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Listed: Donor creates listing
    Listed --> Verified: Admin / AI Verification approval
    Listed --> Rejected: Fails verification check
    
    Verified --> Matched: Matched with open Aid Request
    
    Matched --> PickedUp: Volunteer/Courier confirms pickup
    PickedUp --> InTransit: Courier departs donor location
    InTransit --> Delivered: Recipient confirms receipt
    Delivered --> Reviewed: Recipient leaves rating & feedback
    Reviewed --> [*]
```

---

### 5.2. Smart Proximity & Urgency Matching Algorithm (`lib/matching.ts`)

The matching algorithm computes a weighted compatibility score ($S \in [0, 100]$) between every verified donation ($D$) and open aid request ($R$):

$$S = w_{\text{category}} \cdot S_{\text{category}} + w_{\text{urgency}} \cdot S_{\text{urgency}} + w_{\text{distance}} \cdot S_{\text{distance}} + w_{\text{quantity}} \cdot S_{\text{quantity}}$$

- **Category Match ($S_{\text{category}}$)**: Binary indicator ($1.0$ if exact match, $0.0$ otherwise).
- **Urgency Weighting ($S_{\text{urgency}}$)**: Critical ($1.0$), High ($0.8$), Normal ($0.5$).
- **Distance Factor ($S_{\text{distance}}$)**: Haversine distance decay $S_{\text{distance}} = \max(0, 1 - \frac{\text{distance (miles)}}{50})$.
- **Quantity Alignment ($S_{\text{quantity}}$)**: Proportional fulfillment of requested units.

---

### 5.3. Real-Time Geographic & Tracking Engine (`lib/geo.ts`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Donor / Recipient / Volunteer
    participant Tracker as TrackingDialog / RequestTrackingDialog
    participant Geo as lib/geo.ts (Haversine & Interp)
    participant Map as GoogleMapView (JS SDK / Vector)

    User->>Tracker: Click "Track delivery" / "Track Request"
    Tracker->>Geo: getDonationDeliveryPosition(donation, request)
    Geo->>Geo: calculateDistance(donorCoords, recipientCoords)
    Geo->>Geo: interpolatePosition(progress)
    Geo-->>Tracker: Returns { currentCoords, progressPercentage, stageLabel }
    Tracker->>Map: Render Markers (Donor 🟢, Courier 🚚, Recipient 🔵) & Polylines
    Map-->>User: Display Interactive Map with Turn-by-Turn Directions
```

- **Haversine Great-Circle Computation**: Accurate spatial distance calculation in miles and kilometers without external API roundtrips.
- **Route Trajectory Interpolation**: Dynamically computes intermediate GPS coordinates for moving couriers along curved Bezier trajectories based on status progress (`0%` ➔ `35%` ➔ `70%` ➔ `100%`).
- **Resilient Fallback**: Automatically activates a high-resolution canvas vector map when Google Maps API key is not configured, ensuring 100% local development uptime.

---

### 5.4. Passwordless OTP Authentication Subsystem (`lib/server/*`)

```mermaid
sequenceDiagram
    autonumber
    actor Client as User Browser
    participant API as /api/auth/send-otp
    participant Service as OTP Service (lib/server)
    participant SMTP as Nodemailer (Gmail TLS)
    participant VerifyAPI as /api/auth/verify-otp

    Client->>API: POST { identifier: "user@email.com", type: "email" }
    API->>Service: Generate 6-digit cryptographic code & salt
    Service->>Service: Store HMAC-SHA256 hash with 10-min expiration
    Service->>SMTP: Dispatch formatted HTML email with OTP
    SMTP-->>Client: User receives email code in inbox
    Client->>VerifyAPI: POST { identifier, code: "123456" }
    VerifyAPI->>Service: Hash input code with salt & compare
    Service-->>VerifyAPI: Validation Success (Attempts reset)
    VerifyAPI-->>Client: Return User Session & Hydrate Store
```

---

## 6. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USER ||--o{ DONATION : lists
    USER ||--o{ AID_REQUEST : submits
    USER ||--o{ APP_NOTIFICATION : receives
    EMERGENCY_DRIVE ||--o{ DONATION : allocates
    EMERGENCY_DRIVE ||--o{ AID_REQUEST : fulfills
    DONATION ||--o| AID_REQUEST : matches

    USER {
        string id PK
        string name
        string email
        string phone
        string[] roles
        string location
        float lat
        float lng
        boolean emailVerified
    }

    DONATION {
        string id PK
        string donorId FK
        string donorName
        string category
        string title
        int quantity
        string condition
        string pickupLocation
        float lat
        float lng
        string status
        boolean verified
        string driveId FK
        string matchedRequestId FK
        int matchConfidence
        string pickupMethod
        int createdAt
    }

    AID_REQUEST {
        string id PK
        string recipientId FK
        string recipientName
        string category
        int quantity
        string urgency
        string deliveryAddress
        float lat
        float lng
        string status
        string matchedDonationId FK
        string driveId FK
        int rating
        string feedback
        int createdAt
    }

    EMERGENCY_DRIVE {
        string id PK
        string title
        string description
        string location
        string[] categories
        boolean active
        int goal
        int createdAt
    }

    APP_NOTIFICATION {
        string id PK
        string title
        string message
        string type
        boolean urgent
        boolean read
        int createdAt
    }
```

---

## 7. Security, Reliability & Production Readiness

1. **Zero Password Storage**: Eliminates credential theft risks by relying purely on transient, salted HMAC OTP tokens with strict rate-limiting (max 5 attempts per window).
2. **Deterministic Role Segregation**: User sessions maintain distinct role permissions preventing unauthorized data mutations across portals.
3. **Optimized Bundle & Asset Delivery**: Zero heavy map library runtime bloat; Next.js dynamic script injection loads Google Maps asynchronously with client-side caching.
4. **Resilient Offline Architecture**: Client store state hydrations gracefully tolerate API network interruptions and restore operational records seamlessly.
