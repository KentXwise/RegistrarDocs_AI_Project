# RegistrarDocs AI

> Repository: `RegistrarDocs_AI_Project` (initial heading: `BarangayDocs_AI_Project`)

**RegistrarDocs AI** is a web-based Registrar's Office Document Request and Release Management System designed to make requesting academic documents easier, clarify requirements, and allow requesters to track request progress in one portal.

- **Pilot Institution:** Davao del Norte State College (DNSC)

## Current Milestone Status

**Milestone 4: Authentication, Supabase Integration, and RBAC Foundation (Aligned — Awaiting Supabase Project Credentials)**

Implemented across Milestones 1–4:
- **Milestone 1:** Next.js App Router, React, TypeScript, Tailwind CSS, Lucide React, ESLint foundation, DNSC-inspired forest-green theme, and responsive public landing page
- **Milestone 2:** Registration UI (`/register`) with Full Name, Student ID (digits & dash restriction), DNSC Email, Student ID image upload with local preview, Password/Confirm Password toggles, and Privacy Acknowledgment
- **Milestone 3:** Login UI (`/login`) supporting Email or Student ID + Password, password visibility toggle, and Forgot Password placeholder
- **Milestone 4 (Node.js + Supabase Aligned):**
  - Supabase PostgreSQL schema, RLS policies, and private `student-ids` Storage bucket migration ([0001_profiles_rbac_storage.sql](supabase/migrations/0001_profiles_rbac_storage.sql))
  - Supabase Auth SSR session management (`@supabase/ssr`), server-only Student ID → email resolution, login rate limiting, and logout
  - Connected `/register` (`POST /api/auth/register`) with magic-byte image validation, private Supabase Storage upload, `requester` role, and `pending_approval` status
  - Connected `/login` (`POST /api/auth/login`) with account status enforcement (`pending_approval`, `approved`, `needs_correction`, `rejected`, `invitation_pending`, `active`, `inactive`) and role-based redirects
  - Protected role dashboard placeholders (`/dashboard`, `/dashboard/requester`, `/dashboard/staff`, `/dashboard/admin`) and protected RBAC API routes (`/api/auth/me`, `/api/requester/profile`, `/api/staff/status`, `/api/admin/status`)
  - Development-only, idempotent Admin bootstrap script (`npm run seed:admin`)

## Technology Stack

- **Runtime & Framework:** Node.js + Next.js (App Router)
- **Backend Platform:** Supabase (PostgreSQL, Auth, Private Storage, RLS)
- **UI Library:** React
- **Language:** TypeScript
- **Styling:** Tailwind CSS (`@tailwindcss/postcss`)
- **Icons:** Lucide React
- **Linting:** ESLint (`eslint-config-next`)
- **Package Manager:** npm

## Getting Started

### Prerequisites

- Node.js (LTS / v20+ recommended)
- npm
- A Supabase project (PostgreSQL + Auth + Storage)

### Installation & Supabase Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your Supabase project values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` *(server-only; never expose to the browser)*
3. Apply the SQL migration `supabase/migrations/0001_profiles_rbac_storage.sql` in the Supabase SQL Editor (or via Supabase CLI).
4. Bootstrap the local development Admin account (`Admin@local.test` / `AdminPass123`, `role=admin`, `status=active`):
   ```bash
   npm run seed:admin
   ```
   > **Warning:** Development bootstrap credentials are strictly for local development and must be changed before any real deployment. The script refuses to run when `NODE_ENV=production`.

### Development

Start the local development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Verification Commands

```bash
npm run lint
npm run build
```

## Project Structure

```text
.
├── src/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx          # Temporary Login route placeholder
│   │   ├── register/
│   │   │   └── page.tsx          # Temporary Register route placeholder
│   │   ├── globals.css           # Tailwind CSS theme and base styles
│   │   ├── layout.tsx            # Root layout, fonts, and metadata
│   │   └── page.tsx              # Public landing page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Footer.tsx        # Site footer
│   │   │   └── Navbar.tsx        # Responsive navigation bar & mobile menu
│   │   ├── sections/
│   │   │   ├── BenefitsSection.tsx
│   │   │   ├── DocumentsSection.tsx
│   │   │   ├── FaqSection.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   └── HowItWorksSection.tsx
│   │   └── ui/
│   │       ├── AuthPlaceholderView.tsx
│   │       ├── BrandMark.tsx
│   │       └── FeatureIcon.tsx
│   ├── lib/
│   │   └── landing-data.ts       # Structured landing-page copy and data
│   └── types/
│       └── landing.ts            # Shared TypeScript interfaces
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
└── README.md
```
