# MedePaints

Online gallery and shop for MedePaints original paintings and fine art prints.

Visitors browse the work, buy an original or a print as a guest (no account, email optional), pay via M-Pesa, and submit their M-Pesa confirmation code. You verify the payment in the admin dashboard, and the order moves to Paid.

**Stack:** Next.js 16 (App Router, TypeScript), React 19, Tailwind CSS 4, PostgreSQL with Drizzle ORM, Vercel Blob for images, Resend for email (optional). Built for GitHub → Vercel deployment.

---

## Contents

1. [What is included](#1-what-is-included)
2. [Local development](#2-local-development)
3. [GitHub](#3-github)
4. [Vercel](#4-vercel)
5. [Running the shop](#5-running-the-shop)
6. [How purchasing works](#6-how-purchasing-works)
7. [Environment variables](#7-environment-variables)
8. [Changing the database](#8-changing-the-database)
9. [Security notes](#9-security-notes)
10. [Future features](#10-future-features)
11. [Project structure](#11-project-structure)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What is included

**Public site**
- Homepage with hero artwork, the two ways to collect, selected works, the studio, the Collector List and Instagram.
- Originals shop, with filters for all, available and sold. Sold works stay listed with a red dot and cannot be bought.
- Prints shop, with several sizes per painting and prices that update with the chosen size and quantity.
- Product pages for originals and prints, with a full-screen image viewer. Originals show "Certificate of Authenticity included" when set.
- Gallery page showing every published work (available, reserved and sold).
- About and Contact pages. All About text is editable in the admin.
- Cart, guest checkout, M-Pesa payment page, order confirmation, "Find my order" (order number + phone) and unsubscribe page.

**Admin dashboard** (`/admin`)
- Overview of payments to verify and orders to fulfil.
- Orders: see every order, verify or reject M-Pesa codes, record a payment received by phone, move the order through fulfilment statuses, add tracking, keep private notes, cancel orders.
- Artworks & prints: add, edit, delete, upload images, mark available, reserved or sold, manage the certificate number, and create prints with any number of sizes, prices and stock levels.
- Collector List: view emails and join dates, remove an email, export to CSV.
- Messages from the contact form.
- Delivery fees, one per delivery option (for example, Dar es Salaam delivery — TZS 10,000).
- Settings: M-Pesa number and type, business and contact details, Instagram, delivery information, currency, hold time, email settings, homepage and About text.

The seed script adds 8 **placeholder** paintings (generated images in `public/art/`) with **sample prices**: originals TZS 1,600,000–3,200,000; prints A4 TZS 45,000, A3 TZS 75,000, A2 TZS 120,000. Replace or delete them in the admin before launch.

---

## 2. Local development

You need **Node.js 20.9 or newer** (22 recommended), **npm**, and a **PostgreSQL** database.

For the database, either:
- create a free database at [Neon](https://neon.tech) (the same database can later be used by Vercel), or
- run PostgreSQL on your computer.

### 2.1 Install dependencies

```bash
npm install
```

### 2.2 Create `.env.local`

```bash
cp .env.example .env.local
```

`.env.local` is ignored by Git and must never be committed.

### 2.3 Configure the required variables

Open `.env.local` and set:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | Your Postgres connection string. For Neon, use the **pooled** string. For local Postgres, something like `postgres://user:password@localhost:5432/medepaints`. |
| `DATABASE_URL_UNPOOLED` | Neon's **direct** connection string (optional; used for migrations). |
| `ADMIN_EMAIL` | The email you will sign in with. |
| `ADMIN_PASSWORD_HASH` | Generate it (see below). |
| `ADMIN_SESSION_SECRET` | A random string of at least 32 characters. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally. |

Generate the password hash (the plain password is never stored):

```bash
npm run hash-password -- "choose-a-long-password"
```

Copy the printed `ADMIN_PASSWORD_HASH=...` line into `.env.local`.

Generate a session secret:

```bash
openssl rand -base64 48
```

Or, without OpenSSL:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Images, email and cron variables are optional for local development.

### 2.4 Configure the database

Create the tables:

```bash
npm run db:migrate
```

Add delivery options, default settings and the sample artworks:

```bash
npm run db:seed
```

The seed is safe to run again. It only adds sample artworks when the catalogue is empty.

### 2.5 Run the application locally

```bash
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

Without `BLOB_READ_WRITE_TOKEN`, uploaded images are saved in `public/uploads/` (development only; the folder is ignored by Git).

### 2.6 Build the application

```bash
npm run typecheck
npm run build
```

The build does not need a database connection, so it behaves the same on Vercel.

### 2.7 Test the production build

```bash
npm run start
```

Then open http://localhost:3000.

For a full test:
1. Add a print to the cart and check out without an email.
2. On the order page, enter any code such as `9KL3ABCD12`.
3. In `/admin/orders`, open the order and verify the payment.
4. Check that an original in the order now shows **SOLD**.

---

## 3. GitHub

Claude cannot access your GitHub account. You copy the project in and push it yourself.

### 3.1 Create the repository

1. Go to https://github.com/new.
2. Name it, for example `medepaints`.
3. Set it to **Private** (recommended).
4. Do **not** add a README, .gitignore or licence; this project already has them.
5. Click **Create repository**.

### 3.2 Copy the project into the repository

Unzip the project and open a terminal in the `medepaints` folder (the one containing `package.json`). Do **not** copy `node_modules`, `.next` or `.env.local` if you have them locally; `.gitignore` excludes them anyway.

If you cloned the empty repository instead, copy all project files, including hidden files such as `.gitignore` and `.env.example`, into the clone.

### 3.3 Commit the files

```bash
git init            # skip if you cloned the repository
git add .
git status          # check that .env.local is NOT listed
git commit -m "Initial MedePaints site"
```

### 3.4 Push to GitHub

```bash
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/medepaints.git   # skip if cloned
git push -u origin main
```

**Future changes:** replace the changed files in your local folder, then run:

```bash
git add .
git commit -m "Describe the change"
git push
```

---

## 4. Vercel

### 4.1 Import the GitHub repository

1. Go to https://vercel.com/new and sign in with GitHub.
2. Import the `medepaints` repository.
3. Vercel detects **Next.js**. Keep the defaults:
   - Build command: `next build`
   - Install command: `npm install`
   - Output: automatic
4. Before the first deploy, add storage and environment variables (4.2 and 4.3). If you already clicked Deploy, that is fine; add them and redeploy.

### 4.2 Add a database and image storage

In the Vercel project, open **Storage**.

**Database**
1. Choose **Neon** (Postgres) from the Marketplace and create a database. Pick a region close to your users.
2. Connect it to the project for Production, Preview and Development.
3. Vercel adds `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` automatically.
4. If you use another provider (Supabase, etc.), add `DATABASE_URL` yourself using its pooled / transaction connection string.

**Images**
1. Choose **Blob** and create a store with **Public** access.
2. Connect it to the project.
3. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.

### 4.3 Configure environment variables

Go to **Settings → Environment Variables** and add the variables below for **Production** (and Preview if you use preview deployments). Use placeholders from `.env.example` as a guide. Never paste secrets into code.

| Variable | Required | Value |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | `https://your-domain.com` (or the `.vercel.app` URL at first) |
| `DATABASE_URL` | Yes | Added by Neon, or your provider's pooled string |
| `DATABASE_URL_UNPOOLED` | Recommended | Added by Neon |
| `ADMIN_EMAIL` | Yes | Your admin email |
| `ADMIN_PASSWORD_HASH` | Yes | From `npm run hash-password` |
| `ADMIN_SESSION_SECRET` | Yes | Random, 32+ characters (use a different value from local) |
| `BLOB_READ_WRITE_TOKEN` | Yes | Added by Vercel Blob |
| `CRON_SECRET` | Yes | Random string. Vercel sends it to the daily clean-up job |
| `RESEND_API_KEY` | Optional | From https://resend.com for order emails |
| `EMAIL_FROM` | Optional | A sender on a domain verified in Resend, e.g. `orders@medepaints.com` |
| `PAYMENT_PROVIDER` | Optional | `mpesa_manual` (default) |

### 4.4 Create the production tables

Migrations are run by you, not during the Vercel build, so a failed build can never damage live data.

1. Copy the production `DATABASE_URL_UNPOOLED` (or `DATABASE_URL`) from Vercel → Storage → your database → `.env.local` tab.
2. Run the migration and seed against it from your computer:

   ```bash
   DATABASE_URL="postgres://...production..." npm run db:migrate
   DATABASE_URL="postgres://...production..." npm run db:seed
   ```

   On Windows PowerShell, set the variable first, then run the commands:

   ```powershell
   $env:DATABASE_URL="postgres://..."
   npm run db:migrate
   ```

3. Skip `db:seed` if you do not want the sample artworks. Delivery options and settings can be added in the admin instead.

### 4.5 Deploy

Click **Deploy**, or go to **Deployments → ⋯ → Redeploy** after adding variables. Environment variable changes only take effect after a redeploy.

Then:
1. Open `https://your-project.vercel.app/admin` and sign in.
2. Go to **Settings** and set your **M-Pesa number**, the account name and the payment type. Until this is set, customers are told you will call them with payment details.
3. Set up **Delivery fees**.
4. Replace the sample artworks.

### 4.6 Configure the production domain

1. Go to Vercel → **Settings → Domains → Add** and enter, for example, `medepaints.com` and `www.medepaints.com`.
2. At your domain registrar, create the DNS records Vercel shows (usually an `A` record for the root and a `CNAME` for `www`). HTTPS is issued automatically.
3. Update `NEXT_PUBLIC_SITE_URL` to `https://medepaints.com`.
4. Redeploy.
5. If you use email, verify the same domain in Resend and set `EMAIL_FROM` to an address on it.

### 4.7 Redeploy after future GitHub changes

Every `git push` to `main` triggers a production deployment automatically. Pushes to other branches create preview deployments.

If a change includes a **database migration** (a new file in `drizzle/`), run `npm run db:migrate` against the production database **before or right after** pushing, as in 4.4. Each change note will say when this is needed.

---

## 5. Running the shop

**Adding a painting**
1. In the admin, go to **Artworks & prints → Add artwork**.
2. Fill in the title, medium, height and width in cm, year, price in whole TZS (e.g. `2400000`) and the certificate number.
3. Save, then upload photos. The first photo is the main image. Use large, sharp photos (up to 25 MB); the site resizes them for each screen.
4. Under **Prints**, click **Create prints for this painting**, then add sizes. The quick form adds A4, A3 and A2 at the prices you enter.
5. Leave **Stock** empty for unlimited, printed-on-demand sizes. For limited editions, enter how many are left.

**Paintings not for sale:** leave the price empty. The work appears in the Gallery as "Private collection", and prints can still be sold.

**Reserved:** set Availability to Reserved to hold a work manually, for example for a collector who is visiting the studio.

**Verifying a payment**
1. When a customer submits a code, it appears under **Overview → Payments to verify**.
2. Check the code and amount in your M-Pesa statement or SMS.
3. Click **Verify payment**. The order becomes Paid, originals in the order become SOLD, and the customer is emailed if they gave an email.
4. If the code does not match, click **Reject**. The customer can submit another code and the hold is extended.

**Fulfilment:** move the order through Processing → Ready for Delivery → Shipped / Delivered → Completed.

**Payment by phone:** if a customer sends you the code by WhatsApp or phone, open the order and use **Record a payment you received**.

**Collector List:** export the CSV from **Collector List → Export CSV**. It contains only subscribed people. Every marketing email you send must include an unsubscribe option; the export includes each person's status, and people can unsubscribe at `/unsubscribe`.

---

## 6. How purchasing works

| Rule | How it is enforced |
|---|---|
| No account, email optional, Collector List optional | The checkout has no sign-up. Email and the (unticked) Collector List box are optional. Joining requires an email. |
| Unique order number | Format `MP-YYMMDD-XXXXX`, unique in the database. |
| Customer can always see the order | The confirmation page uses a secret link. "Find my order" works with order number + phone. |
| Sold originals cannot be bought | The server re-checks availability; the buttons are also removed on the page. |
| Two customers cannot buy the same original | Checkout reserves an original with a single conditional database update (`… WHERE status = 'available'`). Only one order can succeed; the other gets a clear message. Tested with 6 simultaneous orders. |
| Originals have quantity 1 | Each original is one row with a status; the cart never allows more than 1. |
| When stock is reduced | At order creation, originals are **reserved** and print stock is **reduced**. This holds items while the customer pays (default 24 hours, set in Settings). |
| Unpaid orders | If no M-Pesa code arrives before the hold ends, the order is cancelled automatically and the items return to stock. This runs on page visits and in a daily Vercel Cron job. |
| Automatic SOLD | Verifying payment marks every original in that order SOLD. |
| Prints outlive originals | Prints stay on sale after the original is sold. |
| M-Pesa code recorded | Stored in the `payments` table against the order. The same code cannot be used twice. |
| Cancel | Cancelling returns reserved originals and print stock exactly once. Refunds are made by you through M-Pesa. |
| Prices | Always taken from the database on the server; the browser only sends item ids and quantities. |

**Order statuses:** Pending Payment → Payment Verification → Paid → Processing → Ready for Delivery → Shipped / Delivered → Completed, or Cancelled.

Payment status is shown to customers separately, for example "Payment Pending / Verification Required".

---

## 7. Environment variables

See `.env.example` for the full list with comments. Secrets are only read on the server; only `NEXT_PUBLIC_SITE_URL` is visible in the browser.

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Links in emails |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DATABASE_POOL_MAX` | Database |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` | Admin sign-in |
| `BLOB_READ_WRITE_TOKEN` | Image uploads |
| `RESEND_API_KEY`, `EMAIL_FROM` | Order, payment, admin-alert and welcome emails |
| `CRON_SECRET` | Protects `/api/cron/release-holds` |
| `PAYMENT_PROVIDER` | Which payment provider new orders use |
| `MPESA_*` | Reserved for future automatic M-Pesa. Leave empty. |

**Changing the admin password:** run `npm run hash-password`, replace `ADMIN_PASSWORD_HASH` in Vercel, and redeploy. Changing `ADMIN_SESSION_SECRET` signs everyone out.

---

## 8. Changing the database

The schema is in `src/db/schema.ts`. Migrations are SQL files in `drizzle/`.

1. Edit `src/db/schema.ts`.
2. Generate a migration:

   ```bash
   npm run db:generate
   ```

3. Apply it locally:

   ```bash
   npm run db:migrate
   ```

4. Commit the new `drizzle/` files.
5. Apply it to production (see 4.4), then push.

Settings are stored as one JSON document, so new settings fields need **no** migration; add them with a default in `src/lib/settings.ts`.

`npm run db:studio` opens a browser view of the database.

---

## 9. Security notes

**Admin access**
- Everything under `/admin` and `/api/admin` requires a signed, httpOnly, 12-hour session cookie.
- This is checked in `src/proxy.ts` and again inside every admin page, action and route.
- Sign-in is limited to 5 failed attempts per IP address per 15 minutes.

**Customers**
- No customer passwords exist.
- Order pages require a random 32-character key in the link.
- Order lookup, code submission and the contact form are rate-limited.

**Payments**
- The site never asks for, stores or transmits M-Pesa PINs or card data. Only the confirmation code is stored.

**Other protections**
- All input is validated on the server with Zod. Prices are recomputed on the server.
- Collector CSV exports neutralise spreadsheet formulas.
- Security headers are set in `next.config.ts`. Admin and order pages are marked `noindex` and `no-store`.

**Your responsibilities**
- Keep the repository private.
- Keep secrets only in Vercel and `.env.local`.
- Use a long admin password.

---

## 10. Future features

The code is structured so these can be added without rebuilding:

**Payment methods**
- `src/lib/payments/` defines a `PaymentProvider` interface. Payments live in their own table keyed by provider.
- `/api/payments/webhook/[provider]` and `confirmAutomaticPayment()` already exist for gateways that confirm payments automatically.
- `mpesa-api.ts` is a documented placeholder for automatic M-Pesa verification through the Vodacom Tanzania M-Pesa API.
- Airtel Money, Mixx by Yas (Tigo Pesa) or card payments are added the same way.

**WhatsApp notifications and email marketing:** add a sender next to `src/lib/email.ts`. The collector table already stores consent wording, date and unsubscribe tokens.

**Collector accounts (optional):** add a `customers` table and a nullable `customer_id` on orders. Guest checkout keeps working.

**Limited-edition numbered prints:** `edition_type`, `edition_size` and per-size stock exist; add an `edition_numbers` table to assign numbers.

**Discount codes and gift cards:** orders already store `discount_code` and `discount_total`, and the total formula includes them.

**Shipping tracking:** `tracking_carrier` and `tracking_number` exist and show on the customer's order page.

**Multiple currencies and international orders:** every price and order stores a currency code, and delivery options and orders store a country code.

---

## 11. Project structure

```
drizzle/                  SQL migrations (commit these)
public/art/               Placeholder artwork images used by the seed
scripts/                  migrate, seed, hash-password
src/
  proxy.ts                Protects /admin and /api/admin
  db/schema.ts            Database tables
  db/index.ts             Database connection
  lib/
    orders.ts             Checkout, stock reservation, payment verification, cancellation
    catalog.ts            Product queries
    cart-resolve.ts       Server-side cart pricing
    settings.ts           Admin-editable settings and defaults
    payments/             Payment providers (M-Pesa manual + future)
    email.ts              Transactional email (Resend)
    auth.ts, session.ts   Admin authentication
    storage.ts            Image storage
    validation.ts         Input validation
  app/
    (site)/               Public pages
    admin/                Admin login, dashboard pages and server actions
    api/                  Cart, orders, payment codes, contact, lookup, cron, uploads, CSV export
  components/             Site, shop and admin components
```

**Design notes**
- Colours: gallery wall `#F5F5F2`, plinth `#E9E7E1`, graphite text `#2A2926`, and one accent, the gallery "sold" red dot `#B3261E`.
- Type: Bodoni Moda for display, with artwork titles in italic like museum wall labels; Hanken Grotesk for text.
- Fonts are self-hosted through npm packages, so no external font requests are made.
- The only automatic animation is the homepage artwork being unveiled on load, and it is disabled for visitors who prefer reduced motion.

---

## 12. Troubleshooting

| Problem | Fix |
|---|---|
| Admin says "Admin sign-in is not configured" | Set `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET`, then redeploy. |
| Correct password rejected | Regenerate the hash with `npm run hash-password` and paste the whole value. The email is not case-sensitive. |
| "relation … does not exist" | Run `npm run db:migrate` against that database. |
| Image upload fails on Vercel | Connect a **Public** Blob store so `BLOB_READ_WRITE_TOKEN` exists, then redeploy. |
| Images uploaded locally don't show with `npm run start` | Local uploads without Blob only display under `npm run dev`. Use Blob for production. |
| No emails | Set `RESEND_API_KEY` and `EMAIL_FROM` (verified domain), and check **Settings → Email** is ticked. Orders work without email. |
| Customers see "we will call you with payment details" | Set the M-Pesa number in **Admin → Settings**. |
| Too many database connections | Use the pooled connection string, or lower `DATABASE_POOL_MAX`. |
