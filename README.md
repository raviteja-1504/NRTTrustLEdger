# School CRM

A modern, full-featured **Customer Relationship Management (CRM) system** built specifically for schools. It covers admissions pipeline management, fee tracking, student information, parent communications, and an at-a-glance admin dashboard — all in a single, beautifully designed web application.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Pages & Features](#pages--features)
- [Planned Improvements](#planned-improvements)
- [Getting Started](#getting-started)
- [Build & Deployment](#build--deployment)

---

## Tech Stack

| Category | Technology |
|---|---|
| **Framework** | [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Routing** | [React Router v7](https://reactrouter.com/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) |
| **Icons** | [Lucide React](https://lucide.dev/), [MUI Icons](https://mui.com/material-ui/material-icons/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Animations** | [Motion (Framer Motion)](https://motion.dev/) |
| **Drag & Drop** | [React DnD](https://react-dnd.github.io/react-dnd/) |
| **Forms** | [React Hook Form](https://react-hook-form.com/) |
| **Date Utilities** | [date-fns](https://date-fns.org/) |
| **Notifications** | [Sonner](https://sonner.emilkowal.ski/) |

---

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── BentoCard.tsx        # Reusable card container
│   │   ├── Layout.tsx           # App shell with collapsible sidebar
│   │   └── ui/                  # shadcn/ui component library
│   ├── pages/
│   │   ├── Dashboard.tsx        # Admin overview with charts & quick actions
│   │   ├── Admissions.tsx       # Kanban-style admissions pipeline
│   │   ├── Fees.tsx             # Fee collection & payment management
│   │   ├── Students.tsx         # Grade-based student directory
│   │   ├── StudentRoster.tsx    # Class-level student list
│   │   ├── StudentProfile.tsx   # Individual student profile
│   │   ├── Communications.tsx   # Parent & staff broadcast messaging
│   │   └── Settings.tsx         # School & system settings
│   ├── App.tsx
│   └── routes.tsx
├── styles/
└── main.tsx
```

---

## Pages & Features

### Dashboard
- **Revenue Overview** — line chart comparing expected vs. collected fees over 6 months
- **Admissions Pipeline** — at-a-glance funnel counts (Inquiries → Visits → Enrolled) with conversion rate
- **Quick Actions** — one-click buttons for Add Student, Collect Fee, Send Circular, View Reports
- **Recent Activity** — real-time feed of payments, inquiries, and reminders

### Admissions Management
- **Kanban Board** with 5 pipeline stages: Inquiry → Application → Campus Visit → Entrance Test → Enrolled
- **Drag-and-drop** lead cards between stages (powered by React DnD)
- **AI "Follow Up" suggestions** highlighted on leads that need attention
- **WhatsApp integration** — direct message link on each lead card
- **Lead strength rating** (1–5 stars) and last-contact tracking
- **Grade filter** to focus on specific intake years

### Fees & Finance
- **Summary cards** — Total Expected, Total Collected, Outstanding, and Overdue count
- **Student fee table** with inline payment progress bars
- **Collect Payment modal** supporting Card, Bank Transfer, and Cash payment methods
- **Overdue SMS broadcast** — send reminders to all defaulters in one click
- **Export** fee data for external reporting

### Student Information System
- **Grade grid** (Grades 1–12) with section breakdown and total count
- **Class Roster** drill-down with per-student listing
- **Student Profile** with full academic and personal details

### Communications
- **Broadcast campaigns** — SMS, email, and in-app notifications
- **Message templates** library
- **Delivery analytics** — sent count, open rate, failure count
- **Search & filter** across sent communications

### Settings
- School profile, academic year, notification preferences, and user roles

---

## Planned Improvements

The following high-impact features are roadmapped for future development:

### Academic & Operations
1. **Attendance Module** — Class-wise daily attendance with monthly trend charts and auto-alerts for low-attendance students
2. **Timetable / Schedule Manager** — Visual drag-and-drop period builder per grade and section
3. **Exam & Grades Module** — Enter marks, generate report cards, and track performance over terms
4. **Library Management** — Book inventory, issue/return tracking, and overdue notices

### Finance
5. **Fee Structure Builder** — Define and manage fee heads (tuition, transport, hostel) per grade
6. **Receipt Generation** — Printable/downloadable PDF receipts after each payment
7. **Scholarship & Concession Tracker** — Manage discount approvals and track impact on collections
8. **Expense Tracking** — School expenditure categories with monthly budget vs. actual charts

### Communication & Engagement
9. **Parent Portal Login** — Self-service portal for parents to view fees, notices, and report cards
10. **Staff Directory & HR Module** — Teacher profiles, leave requests, and payroll summaries
11. **Event & Calendar Module** — School events, parent-teacher meetings, and holiday calendar
12. **Notice Board** — Publish circulars and attach PDFs with read-receipt tracking

### Data & Insights
13. **Advanced Analytics Dashboard** — Year-over-year enrollment trends, grade-wise performance heatmaps
14. **Custom Report Builder** — Drag-and-drop report generator exportable to Excel/PDF
15. **Predictive Admission Scoring** — AI-based likelihood score for lead conversion

### Technical
16. **Backend Integration** — Connect to a REST/GraphQL API (Node.js + PostgreSQL recommended)
17. **Authentication & Roles** — Role-based access control (Admin, Teacher, Accountant, Parent)
18. **Dark Mode** — System-aware theme switching using `next-themes`
19. **Progressive Web App (PWA)** — Offline support and installable on mobile devices
20. **Audit Logs** — Track who changed what and when across all modules

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm, pnpm, or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SchoolCRM

# Install dependencies
npm install
# or
pnpm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output is generated in the `dist/` folder.

---

## Build & Deployment

This is a **static React SPA** (Single Page Application) — no server required. The built `dist/` folder can be deployed directly to:

| Platform | Command / Method |
|---|---|
| **Vercel** | `vercel deploy` or connect GitHub repo |
| **Netlify** | Drag-and-drop `dist/` or connect GitHub with `npm run build` |
| **GitHub Pages** | Use `vite-plugin-gh-pages` or manual `dist/` push |
| **AWS S3 + CloudFront** | Upload `dist/` to S3, enable static website hosting |
| **Docker / Nginx** | Serve `dist/` with a simple Nginx config |

> **Important:** Because this is a client-side router (React Router), configure your hosting provider to redirect all routes to `index.html`. On Netlify, add a `public/_redirects` file with `/* /index.html 200`.

---

## Color Palette

| Role | Color |
|---|---|
| Primary (Navy) | `#1A237E` |
| Accent (Teal) | `#00897B` |
| Success (Green) | `#4CAF50` |
| Warning (Orange) | `#FF9800` |
| Danger (Red) | `#EF5350` |
| Background | `#FAFAFA` |

---

## License

This project is private and proprietary. All rights reserved.