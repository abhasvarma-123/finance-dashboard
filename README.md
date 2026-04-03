# FinFlow – Finance Dashboard

A clean, interactive finance dashboard built with **React + Vite**.

## Features

| Feature | Details |
|---|---|
| **Dashboard Overview** | Summary cards (Balance, Income, Expenses, Savings Rate), Balance Trend SVG chart, Spending Breakdown donut chart |
| **Transactions** | Full table with search, filter by type/category/month, sort by any column, CSV export |
| **Insights** | Highest spending category, savings rate, month-over-month comparison, top 5 bar chart, monthly table |
| **Role-Based UI** | Viewer (read-only) vs Admin (add, edit, delete transactions) — toggle via navbar dropdown |
| **Dark Mode** | Full dark/light theme toggle |
| **Data Persistence** | All data saved to `localStorage` |
| **Responsive** | Works on mobile, tablet, and desktop |

## Setup Instructions

### Prerequisites
- Node.js v18+ installed → [Download here](https://nodejs.org)

### Steps

1. **Open the project folder in VS Code**
   ```
   File → Open Folder → select `finance-dashboard`
   ```

2. **Open the integrated terminal**
   ```
   Terminal → New Terminal  (or Ctrl + `)
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## Project Structure

```
finance-dashboard/
├── src/
│   ├── App.jsx        # Everything: data, context, all components, styles
│   └── main.jsx       # Entry point — renders App into #root
├── index.html
├── package.json
├── vite.config.js
└── README.md
````
## Role-Based UI

| Feature | Viewer | Admin |
|---|---|---|
| View dashboard | ✅ | ✅ |
| View transactions | ✅ | ✅ |
| Add transaction | ❌ | ✅ |
| Edit transaction | ❌ | ✅ |
| Delete transaction | ❌ | ✅ |

Switch roles using the dropdown in the top-right of the navbar.

## State Management

Uses **React Context API** (`AppContext`) to manage:
- `transactions` — full list (persisted to localStorage)
- `filters` — search, type, category, month
- `role` — viewer or admin (persisted)
- `darkMode` — theme preference (persisted)
- `activeTab` — current page

## Tech Stack

- React 18
- Vite 5
- Pure CSS 
- Custom SVG charts (no chart library)
- React Context API
- localStorage for persistence
