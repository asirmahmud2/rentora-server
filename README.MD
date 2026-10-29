# RENTORA — Backend API

This repository contains the Express and MongoDB API for **RENTORA**, a property rental and booking platform. It manages property listings, administrative moderation, user roles, favorites, and the booking/transaction creation step used by the Stripe Checkout flow.

## Live services

- **Frontend:** [rentora-frontend-seven.vercel.app](https://rentora-frontend-seven.vercel.app)
- **Backend API:** [rentora-server-nine.vercel.app](https://rentora-server-nine.vercel.app)

## Technology stack

- **Node.js** — JavaScript runtime (CommonJS modules)
- **Express 5** — HTTP routes and middleware
- **MongoDB Node.js driver** — database access
- **dotenv** — environment-variable loading
- **cors** — cross-origin request handling
- **Vercel** — deployment configuration

The API uses the same MongoDB deployment as the frontend's authentication setup, with marketplace data in the `RENTORA` database. Authentication is integrated with Better Auth: the API looks up the bearer session token in MongoDB and resolves the associated user and role.

## Capabilities

- Create, read, update, delete, and moderate rental property listings.
- Filter property queries by ID, status, location, and property type; sort by rent.
- Return a featured collection of approved properties.
- Restrict property management to authorized Owners and Admins, including owner-ownership checks for supported operations.
- Allow Admins to retrieve users and change user roles.
- Allow Tenants to create, list, check, and remove favorites.
- Create or reuse a booking after successful Stripe Checkout verification, and create or reuse its transaction record.

## Getting started

### Requirements

- Node.js compatible with the installed dependencies (Node.js **20.19+** is recommended)
- npm
- A MongoDB connection string

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the backend repository root:

```dotenv
MONGO_URI="mongodb+srv://<username>:<password>@<cluster>/<options>"
PORT=5000
```

Replace the placeholders with your own MongoDB connection details. The backend connects to the `RENTORA` database. Do not commit `.env` or credentials to version control.

### 3. Start the backend

```bash
npm start
```

The configured fallback port is `5000`, so the expected local base URL is `http://localhost:5000` when the application is bound to that port.

> **Local startup note:** In the reviewed `index.js`, an explicit `app.listen()` call was not visible. If `npm start` does not open a local listener, verify the Express entry point and the way the application is invoked before troubleshooting frontend requests. The repository includes Vercel deployment configuration.

## API reference

The following routes were visible in the reviewed `index.js` source.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/` | Public | Basic response / deployment check. |
| `POST` | `/api/properties` | Owner | Create a property listing. |
| `GET` | `/api/properties` | Authenticated | Query properties with supported filters. |
| `GET` | `/api/properties/public` | Public | Public property search and filtering. |
| `GET` | `/api/properties/featured` | Public | Return up to six approved properties. |
| `PATCH` | `/api/properties/:id` | Owner / Admin | Update a property; owner updates are restricted. |
| `DELETE` | `/api/properties/:id` | Owner / Admin | Delete a property, with ownership checks for Owners. |
| `PATCH` | `/api/properties/approve/:id` | Admin | Approve a listing. |
| `PATCH` | `/api/properties/reject/:id` | Admin | Reject a listing and store feedback. |
| `GET` | `/api/users` | Admin | Retrieve users. |
| `PATCH` | `/api/users/change-role` | Admin | Change a user's role. |
| `POST` | `/api/favorite` | Tenant | Save a favorite property. |
| `GET` | `/api/favorite` | Tenant | List the authenticated tenant's favorites. |
| `GET` | `/api/favorite/:propertyId` | Tenant | Check whether a property is favorited. |
| `DELETE` | `/api/favorite/:propertyId` | Tenant | Remove a favorite. |
| `POST` | `/api/bookings` | Tenant | Create or reuse a booking and corresponding transaction. |

The property search route supports filters for fields such as `status`, `propertyType`, `id`, owner, and location, plus rent sorting. For public browsing, the frontend should request approved listings explicitly, for example:

```text
GET /api/properties/public?status=Approved
```

### Authentication and authorization

Protected requests use an `Authorization: Bearer <session-token>` header. The API resolves the session token against Better Auth's MongoDB session records and uses the associated user's role to authorize protected operations. Supported roles are `Tenant`, `Owner`, and `Admin`.

- **Tenant:** favorite operations and booking creation.
- **Owner:** property creation and management of owned listings.
- **Admin:** user management and property moderation.

Keep authorization checks in the API even when the frontend also hides or disables actions based on role.

## Data collections

The backend uses the `RENTORA` MongoDB database. The reviewed code reads or writes these collections:

| Collection | Purpose |
|---|---|
| `properties` | Listing details, location, rent, images, amenities, owner information, status, and rejection feedback. |
| `user` | User identity and role records managed alongside Better Auth. |
| `session` | Better Auth session records used to validate bearer tokens. |
| `favorites` | Tenant favorites, including property references and a property-data snapshot. |
| `bookings` | Paid booking records associated with a property, tenant, owner, and Stripe Checkout session. |
| `transactions` | Payment transaction details associated with a booking, property, tenant, and owner. |

A unique index on `transactions.transactionId` helps prevent duplicate transaction records for the same transaction ID.

## Environment configuration

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string. |
| `PORT` | No | Port for local hosting; the configured fallback is `5000`. |

The frontend must use `NEXT_PUBLIC_SERVER_URL` pointing to this API's base URL. For the deployed frontend, that value is `https://rentora-server-nine.vercel.app`.

## Known integration notes

- In the reviewed source snapshot, `index.js` exposes booking creation but does not show booking-list (`GET /api/bookings`) or booking-status update (`PATCH /api/bookings`) routes, nor a transaction-history (`GET /api/transactions`) route.
- The reviewed source snapshot also does not show `GET /api/reviews`, `POST /api/reviews`, or `GET /api/reviews/top`, although frontend views call these endpoints. Verify the deployed code or implement these routes before relying on booking history, booking management, transaction history, or reviews.
- `/api/properties/public` is publicly accessible and can return records matching the supplied query. Ensure the API enforces `status=Approved` for public listing access rather than relying only on the frontend to send that filter.
- Stripe Checkout creation is handled by the frontend's Next.js API route; this Express repository does not create the Checkout session itself.

## Deployment

The repository includes `vercel.json` for deployment configuration. Set `MONGO_URI` in the backend hosting provider's environment settings and ensure the frontend's `NEXT_PUBLIC_SERVER_URL` matches the deployed API origin. Never expose database credentials or session tokens in client code or logs.
