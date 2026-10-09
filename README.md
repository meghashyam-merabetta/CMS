# Merabetta CRM Frontend Clone

A pixel-perfect, clean, standalone frontend clone of the Merabetta Admin CRM Dashboard (`https://dev.admin.merabetta.com/admin/dashboard`), Login Page (`https://dev.admin.merabetta.com/login`), and core management modules:
- **Admin Management** (`/admin/admins`, `/admin/admins/createAdmin`)
- **User Management** (`/admin/users`)
- **Product Management** (`/admin/products`, `/admin/products/add`)
- **Category Management** (`/admin/categories`)
- **Order Management** (`/admin/orders`)

Built completely from scratch in the `crm/` directory without touching any existing code of `merabeta`.

---

## 🔐 Credentials

### 1. Admin
- **Email**: `admin@merabetta.com`
- **Password**: `Admin@123` (or `admin123`)
- **Role**: `ADMIN`
- **Name**: `Admin User`

### 2. Super Admin
- **Email**: `superadmin@merabetta.com`
- **Password**: `SuperAdmin@123` (or `superadmin123`)
- **Role**: `SUPER_ADMIN`
- **Name**: `Super Admin`

> 💡 *Tip: The login page includes interactive 1-click credential demo cards to instantly pre-fill either account.*

---

## 🚀 Quick Start

To run the cloned CRM frontend:

```bash
cd crm
npm run dev
```

1. Open `http://localhost:3001` in your browser.
2. It automatically opens the **Login Page** (`/login`).
3. Enter or click either demo credential (Admin or Super Admin).
4. Click **Login** to enter the **Admin Dashboard** (`/admin/dashboard`).
5. Use the sidebar to explore:
   - **Admin Management** -> **Admin List** (`/admin/admins`) & **Create Admin** (`/admin/admins/createAdmin`)
   - **User Management** (`/admin/users`)
   - **Product Management** (`/admin/products`) & **Add Product** (`/admin/products/add`)
   - **Category Management** (`/admin/categories`)
   - **Order Management** (`/admin/orders`)

To build for production:

```bash
cd crm
npm run build
npm start
```

---

## 📁 File Structure

```text
crm/
├── package.json               # Standalone dependencies (Next.js, React 19, Tailwind CSS, Lucide icons)
├── tsconfig.json              # TypeScript configuration
├── next.config.ts             # Next.js configuration
├── postcss.config.mjs         # Tailwind CSS PostCSS plugin
├── public/
│   ├── Images/
│   │   ├── Banner.png         # High-resolution login hero banner image
│   │   ├── logo.svg           # Merabetta brand logo
│   │   └── panel.svg          # Collapse/expand sidebar arrow icon
│   └── icon.svg               # Merabetta browser favicon
├── src/
│   ├── contexts/
│   │   └── AuthContext.tsx    # User authentication state & preset accounts
│   ├── app/
│   │   ├── globals.css        # Tailwind CSS imports & custom scrollbars
│   │   ├── layout.tsx         # Root layout with AuthProvider & metadata
│   │   ├── page.tsx           # Redirects '/' to '/login'
│   │   ├── login/             # Login Page (2-column layout matching screenshot)
│   │   │   └── page.tsx
│   │   └── admin/
│   │       ├── layout.tsx     # Admin Layout (Sidebar + Header + Content)
│   │       ├── dashboard/     # Cloned Dashboard page
│   │       │   └── page.tsx
│   │       ├── admins/        # Admin List with filters, search & pagination
│   │       │   ├── page.tsx
│   │       │   └── createAdmin/
│   │       │       └── page.tsx
│   │       ├── users/         # User Management with approval alert & table
│   │       │   └── page.tsx
│   │       ├── products/      # Product Management with bulk upload banner & catalog table
│   │       │   ├── page.tsx
│   │       │   └── add/
│   │       │       └── page.tsx
│   │       ├── categories/    # Category Management
│   │       │   └── page.tsx
│   │       ├── orders/        # Order Management
│   │       │   └── page.tsx
│   │       └── [other routes]/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx    # Collapsible sidebar (278px / 86px) with expandable submenus
│   │   │   ├── Header.tsx     # Top navbar with dynamic titles, reports button, notifications
│   │   │   └── LogoutModal.tsx# Logout confirmation dialog
│   │   └── dashboard/
│   │       ├── SummaryCards.tsx          # 8 KPI summary cards
│   │       ├── UsersProductsSection.tsx  # Total Users & Products chart & subcards
│   │       ├── OrdersCancelledSection.tsx# Total Orders & Cancelled chart & subcards
│   │       ├── MetricComparisonCard.tsx  # Subcards with trend pills & icons
│   │       ├── BarChartComponent.tsx     # 12-month dual-bar SVG chart with hover tooltips
│   │       ├── DateRangePicker.tsx       # Date range selector modal/popover
│   │       └── ErrorAlert.tsx            # Error message banner with retry button
│   ├── types/
│   │   └── dashboard.ts       # Full TypeScript type definitions
│   └── data/
│       └── mockData.ts        # Comprehensive mock data & sidebar navigation tree
```
