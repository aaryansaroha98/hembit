# HEMBIT

HEMBIT is a full-stack commerce platform built for a modern fashion retail workflow. It combines a customer-facing storefront, authenticated account flows, order lifecycle management, and an administrative control panel in a single codebase.

## Overview

The platform is organized as a monorepo with:

- A **React + Vite** frontend (`client/`) for storefront, account, checkout, and editorial experiences
- An **Express.js** backend (`server/`) for catalog, authentication, orders, content, and administration APIs
- A flexible persistence layer that supports **PostgreSQL** (when `DATABASE_URL` is configured) with a file-seeded fallback for local development

## Core Capabilities

- Curated home experience with dynamic slides, featured products, and category/series navigation
- Product catalog filtering (category, series, search) and detailed product pages
- OTP-based signup verification by email, sign-in, and JWT-protected sessions
- Cart, checkout, order creation, payment confirmation, and order tracking
- Account area with protected customer routes
- Admin dashboard for metrics, content operations, and media upload workflows
- Newsletter subscription and transactional email notifications
- HB Productions content module for editorial storytelling pages

## System Architecture

- **Frontend**: React 18, React Router 6, Vite
- **Backend**: Node.js, Express, JWT auth middleware
- **Data**: PostgreSQL (`pg`) when available; file-backed JSON store for fallback/seeded local mode
- **Media**: Cloudinary upload integration for image/video assets
- **Email**: Brevo SMTP API integration for OTP, welcome, and order communication
- **Deployment**: Render-ready backend (`render.yaml`) and Vercel-ready frontend (`client/vercel.json`)

## Project Structure

```text
HEMBIT98/
├── client/                 # React storefront and admin UI routes
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles.css
│   └── package.json
├── server/                 # Express API and business logic
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── data/
│   └── package.json
├── render.yaml             # Backend deployment config (Render)
└── README.md
```

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables

Create `server/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=replace-with-a-strong-secret

# Optional: PostgreSQL (enables persistent DB mode)
DATABASE_URL=postgres://username:password@host:5432/database

# Optional: Payments
RAZORPAY_KEY_ID=your_razorpay_key

# Optional: Email delivery (Brevo)
BREVO_API_KEY=your_brevo_key
BREVO_SENDER_EMAIL=no-reply@yourdomain.com
BREVO_SENDER_NAME=HEMBIT

# Optional: Cloudinary media uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run the application

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

Application URLs:

- Frontend: `http://localhost:5173`
- API health check: `http://localhost:5000/api/health`

## Default Admin Seed (Local)

During initialization, a default admin account is seeded if missing:

- Email: `admin@hembit.in`
- Password: `Admin@123`

For security, replace this account password immediately in non-development environments.

## API Surface (High-Level)

- `/api/public/*` -> catalog, content, homepage, settings, order tracking, newsletter
- `/api/auth/*` -> signup start/verify, sign-in, account-authenticated actions
- `/api/checkout/*` -> checkout config, order creation, payment confirmation, customer orders
- `/api/admin/*` -> admin dashboard, content/product management, media upload, operations

## Deployment Notes

- Backend deployment is configured for Render via [`render.yaml`](./render.yaml).
- Frontend deployment is configured for Vercel via [`client/vercel.json`](./client/vercel.json).
- Ensure production values are set for `FRONTEND_URL`, `JWT_SECRET`, and all external integrations used in your target environment.

## Operational Notes

- CORS policy is controlled through `FRONTEND_URL` (comma-separated values supported).
- JWT token expiration is currently configured for 7 days.
- In local mode without `DATABASE_URL`, data persists through the JSON store in `server/src/data/data.json`.

## Repository Standards

- Keep environment files out of version control (`.env` is ignored).
- Validate any API changes against both client and server contracts before release.
- Use production secrets management for all third-party service credentials.
