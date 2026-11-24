# Dar Zitoun — Authentic Tunisian Gastronomy & Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL_Mode-003B57?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)
[![Security](https://img.shields.io/badge/Security-OWASP_Hardened-green?style=for-the-badge&logo=shield)](docs/audit)

**Dar Zitoun** is a modern, production-grade web application and administrative management platform designed for authentic Tunisian Mediterranean cuisine. Built with **Next.js 16 App Router**, **TypeScript**, **Tailwind CSS**, and **SQLite (WAL Mode)** with PostgreSQL compatibility.

---

## 🌟 Key Features

### 🏛️ Public Experience
- **Multilingual Support (i18n):** Native multilingual interface in **Français (FR)**, **العربية (AR)** with full RTL bidirectional layout, and **English (EN)** powered by `next-intl`.
- **Dynamic Digital Menu:** Categorized food showcase featuring dietary tags (vegetarian, spicy), allergens, preparation times, and promotional pricing.
- **Real-Time Reservation Engine:** Automated table booking system calculating operating hours, service capacity, real-time availability slots, and automatic conflict detection.
- **Online Takeaway & Delivery:** Dynamic order placement with instant server-calculated totals.
- **Heritage & Storytelling:** Mediterranean aesthetic with high-definition curated photography, smooth entrance reveals, and authentic cultural typography.

### ⚙️ Back-Office & Administration (`/admin`)
- **Executive Dashboard:** Live operational metrics, daily reservation tallies, revenue stats, and quick actions.
- **Menu & Category Management:** Create, edit, reorder, and toggle active availability of dishes and menu categories.
- **Table & Reservation Management:** View reservations by date, status (`confirmed`, `seated`, `cancelled`, `no_show`), and manage live customer waitlists.
- **Content Management System (CMS):** Edit homepage hero titles, restaurant story copy, images, and operating schedules without code changes.
- **Trash & Soft Deletion:** Resilient soft-delete architecture allowing instant restoration of categories and dishes.
- **Role-Based Access Control (RBAC):** Granular permissions for `super_admin`, `admin`, `manager`, and `staff`.

---

## 🔒 Defensive Security Architecture

The application has undergone a comprehensive defensive security audit and hardening:

| Security Vector | Implementation Details |
| :--- | :--- |
| **Server-Side Price Integrity** | Strict database verification of dish availability and pricing; client-side price tampering is completely rejected with `400 Bad Request`. |
| **SQL Injection Prevention** | Whitelisting of allowed columns (`ALLOWED_*_COLUMNS`) and strict regex filtering (`/^[a-zA-Z0-9_]+$/`) on dynamic update queries. |
| **Resource Rate Limiting** | Isolated per-endpoint sliding-window rate limiters for logins (`5/15m`), public reservations (`10/10m`), and orders (`10/10m`). |
| **Anti-CSRF Protection** | Cookie-to-header token verification (`X-CSRF-Token`) on all mutating admin API operations (`POST`, `PUT`, `DELETE`). |
| **Cron Job Authentication** | Constant-time token verification (`crypto.timingSafeEqual`) preventing timing side-channel attacks; closed failover if `CRON_SECRET` is unset. |
| **Content Security Policy (CSP)** | Nonce-based script execution, strict frame ancestors (`'none'`), nosniff, and dev-only `'unsafe-eval'`. |
| **Secure File Handling** | Magic byte binary validation (JPEG, PNG, WebP, AVIF), automated EXIF metadata stripping, and random UUID storage outside the web root. |

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict type safety, 0 compile errors)
- **Styling & Tokens:** [Tailwind CSS v4](https://tailwindcss.com/) with unified semantic design tokens
- **Internationalization:** [next-intl](https://next-intl-docs.vercel.app/)
- **Database:** SQLite with WAL mode (`data/restaurant.sqlite`) + PostgreSQL migration bridge
- **Icons & Motion:** Lucide Icons & CSS animations
- **Testing & Verification:** [Playwright](https://playwright.dev/) E2E & custom automated security suites

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** 20.x or higher
- **npm** 10.x or higher

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/alidebbich/Restaurant.git
cd Restaurant

# Install dependencies
npm install
```

### 3. Environment Setup
Copy the environment template:
```bash
cp .env.example .env
```

Configure your secrets in `.env`:
```env
SITE_URL=http://localhost:3000
ADMIN_BOOTSTRAP_SECRET=your-random-32-char-bootstrap-key
CRON_SECRET=your-random-32-char-cron-secret
```
> [!NOTE]
> `.env` is permanently protected in `.gitignore` and is never tracked in source control.

### 4. Running the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Public Site:** [http://localhost:3000/fr](http://localhost:3000/fr)
- **Admin Dashboard:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🧪 Verification & Quality Assurance

Run the automated test suites to verify integrity and security:

```bash
# Verify TypeScript compilation (0 errors)
npx tsc --noEmit

# Run automated defensive security verification (9/9 checks)
node scripts/verify-security.mjs

# Run secret leak scanner (verifies no credentials exist in codebase)
node scripts/scan-secrets.mjs
```

---

## 📂 Project Structure

```
restaurant/
├── data/                  # SQLite WAL database & secure uploads (git-ignored)
├── docs/                  # Architecture & verification documentation
├── public/                # Static assets, branding & restaurant images
├── scripts/               # Migration, audit & automated security verification
├── src/
│   ├── app/
│   │   ├── [locale]/      # Multilingual public routes (FR / AR / EN)
│   │   ├── admin/         # Secure Back-Office & dashboard pages
│   │   └── api/           # Hardened REST endpoints & webhooks
│   ├── components/
│   │   ├── admin/         # High-contrast Admin UI design system
│   │   ├── sections/      # Public landing, menu, reservation sections
│   │   └── ui/            # Shared brand buttons, cards & inputs
│   ├── config/            # Site metadata & navigation configuration
│   ├── lib/
│   │   ├── db/            # SQLite queries, schema & PostgreSQL bridge
│   │   ├── auth.ts        # Scrypt password hashing & session management
│   │   └── rate-limit.ts  # Isolated multi-tenant rate limiters
│   └── proxy.ts           # CSP headers, HSTS & internationalization proxy
├── .env.example           # Safe configuration template (placeholders only)
└── .gitignore             # Hardened rules preventing secret/DB leaks
```

---

## 📄 License

This project is proprietary and confidential. All rights reserved by **Dar Zitoun**.
