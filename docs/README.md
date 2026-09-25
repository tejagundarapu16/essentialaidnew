# EssentialAid Documentation

Welcome to the EssentialAid technical and architectural documentation.

## 📚 Table of Contents

- [🏛️ System Architecture](./SYSTEM_ARCHITECTURE.md): Comprehensive system architecture document covering the high-level diagrams, technology stack, role-based portal sub-architectures, matching algorithms, real-time Google Maps GIS tracking, and ER diagrams.
- [🔐 Authentication & OTP Verification](./SYSTEM_ARCHITECTURE.md#54-passwordless-otp-authentication-subsystem-libserver): Passwordless email OTP verification via Nodemailer SMTP with HMAC-SHA256 salted tokens and rate-limiting.
- [🗺️ Google Maps & Real-Time Tracking](./SYSTEM_ARCHITECTURE.md#53-real-time-geographic--tracking-engine-libgeots): Turn-by-turn routing, live courier GPS simulation, and responsive canvas vector fallback.
- [🤝 6-Stage Donation Lifecycle](./SYSTEM_ARCHITECTURE.md#51-the-6-stage-donation-lifecycle-state-machine): Flow from listing to verification, matching, pickup, transit, delivery, and recipient feedback.

---

## 🛠️ Quick Start

```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Run linter checks
npm run lint

# Build production bundle
npm run build
```
