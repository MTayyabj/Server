# Shop Management Backend

Production-ready Express + MongoDB API for an Accounting and POS Shop Management System.

## Stack

- Express, Mongoose, Zod
- JWT auth with RBAC: `admin`, `manager`, `cashier`
- Helmet, CORS, compression, morgan, cookie-parser
- express-rate-limit, bcrypt, validator, multer, nodemailer, axios, dayjs

## Setup

```bash
cd Backend
copy .env.example .env
npm install
npm run seed
npm start
```

API base URL:

```text
http://localhost:5000/api/v1
```

Health check:

```text
GET http://localhost:5000/health
```

## Important MongoDB Note

Sales, purchases, expenses, ledger postings, cash book, bank transactions, and Roznamcha entries use MongoDB ACID transactions. Use MongoDB Atlas or a local replica set. A standalone local MongoDB server will reject transactions.

## Seed Users

```text
admin@fertilizershop.local / Admin@12345
manager@fertilizershop.local / Manager@12345
cashier@fertilizershop.local / Cashier@12345
```

## Response Shape

```json
{
  "success": true,
  "message": "Resource fetched successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Main Endpoints

- `POST /auth/login`
- `POST /auth/refresh-token`
- `GET /auth/me`
- `GET /dashboard/summary`
- `GET /dashboard/charts`
- `GET|POST /customers`
- `GET|PUT|DELETE /customers/:id`
- `GET|POST /customers/:id/ledger`
- `GET|POST /suppliers`
- `GET|PUT|DELETE /suppliers/:id`
- `GET|POST /suppliers/:id/ledger`
- `GET|POST /products`
- `GET|POST /products/categories`
- `PUT|DELETE /products/:id`
- `PATCH /products/:id/adjust-stock`
- `GET|POST /sales`
- `GET /sales/:id`
- `GET|POST /purchases`
- `GET /purchases/:id`
- `GET|POST /expenses`
- `GET|POST /expenses/categories`
- `GET|POST /cash-book`
- `GET|POST /bank-accounts`
- `POST /bank-accounts/transfer`
- `GET /bank-accounts/:id/ledger`
- `GET /daily-book`
- `GET /reports/sales?format=json|pdf`
- `GET /reports/expenses?format=json|pdf`
- `GET /reports/customer-summary?format=json|pdf`
- `GET /reports/supplier-summary?format=json|pdf`
- `GET /reports/cash-flow?format=json|pdf`
- `GET|PUT /settings`

## Transaction Behavior

Creating a sale atomically:

- decreases product stock
- creates sale and sale items
- posts customer ledger debit/credit
- posts cash or bank receipt
- appends a Daily Book entry

Creating a purchase atomically:

- increases product stock
- creates purchase and purchase items
- posts supplier ledger debit/credit
- posts cash or bank payment
- appends a Daily Book entry

Manual customer/supplier ledger entries and transfers also post corresponding cash, bank, and daily book records inside one database transaction.
