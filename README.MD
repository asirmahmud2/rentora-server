# RENTORA - Property Rental & Booking Platform (Backend)

REST API for RENTORA, a rental marketplace where owners list properties, admins approve them, and tenants search, save favorites, book, pay and review.

This repository is the **Express and MongoDB backend**. It serves the [RENTORA frontend](https://github.com/asirmahmud2/rentora-frontend).

| | |
|---|---|
| **API base URL** | https://rentora-server-nine.vercel.app |
| **Live site** | https://rentora-frontend-seven.vercel.app |
| **Backend repository** | https://github.com/asirmahmud2/rentora-server |
| **Frontend repository** | https://github.com/asirmahmud2/rentora-frontend |

To check that the API is running, open `/api/properties/featured` on the base URL. It returns up to six approved properties as JSON.

## Key Features

- Role-based access control for **Tenant**, **Owner** and **Admin**
- Property listing with backend search by location, filter by property type and sort by rent
- Admin approval and rejection of properties, with rejection feedback
- Owners can edit and delete only their own properties
- Favorites for tenants
- Bookings created after a successful payment, with the statuses Pending, Approved and Rejected
- Payment transactions saved once per payment, protected by a unique index
- Tenant reviews with a rating from 1 to 5 and a comment, plus a public endpoint for top reviews
- Admin tools to list users and change roles

## Tech Stack

| Area | Technology |
|---|---|
| Runtime | Node.js 20.19 or newer (CommonJS) |
| Framework | Express 5 |
| Database | MongoDB (database name `RENTORA`) with the official driver |
| Hosting | Vercel (`vercel.json` included) |

### npm packages

| Package | Version | Used for |
|---|---|---|
| `express` | `^5.2.1` | HTTP server and routing |
| `mongodb` | `^7.6.0` | Database access and indexes |
| `cors` | `^2.8.6` | Cross-origin requests from the frontend |
| `dotenv` | `^18.0.4` | Loading environment variables |

## Authentication and Authorization

The frontend uses Better Auth, which stores login sessions in the MongoDB `session` collection. This API does not issue tokens itself. For every protected route it:

1. Reads `Authorization: Bearer <session token>` from the request
2. Finds that token in the `session` collection
3. Loads the matching document from the `user` collection and attaches it to the request
4. Checks the user's role with `verifyUserRole`, then applies ownership rules, for example an owner can change only their own property

A missing or unknown token returns `401`, and a role that is not allowed returns `403`.

## API Reference

Routes marked "Logged in", "Tenant", "Owner" or "Admin" need the `Authorization` header described above.

### Properties

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/properties/featured` | Public | Up to 6 approved properties |
| `GET` | `/api/properties/public` | Public | Properties filtered by optional `status`, `location`, `propertyType` and `sort`. Pass `status=Approved` to list only approved properties. |
| `GET` | `/api/properties` | Logged in | Same filters, plus `id` and `ownerId` |
| `POST` | `/api/properties` | Owner | Create a property |
| `PATCH` | `/api/properties/:id` | Owner, Admin | Update a property. Owners cannot change the status, owner information or rejection feedback. |
| `DELETE` | `/api/properties/:id` | Owner, Admin | Delete a property. Owners can delete only their own. |
| `PATCH` | `/api/properties/approve/:id` | Admin | Approve a property |
| `PATCH` | `/api/properties/reject/:id` | Admin | Reject a property and save `rejectionFeedback` |

Query options: `location` (searches area, city and country, case-insensitive), `propertyType`, `status`, and `sort` (`price-asc` or `price-desc`).

### Users

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List all users |
| `PATCH` | `/api/users/change-role` | Admin | Change a user's role. Body: `userId`, `role` |

### Favorites

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/favorite` | Tenant | Save a favorite |
| `GET` | `/api/favorite?userId=` | Tenant | List the tenant's favorites |
| `GET` | `/api/favorite/:propertyId?userId=` | Tenant | Check one property |
| `DELETE` | `/api/favorite/:propertyId?userId=` | Tenant | Remove a favorite |

The `userId` must match the logged-in user.

### Bookings and transactions

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/bookings` | Tenant | Create a booking and its transaction after payment. Repeating the same payment does not create duplicates. |
| `GET` | `/api/bookings?status=` | Logged in | Tenants get their own bookings, owners get requests for their properties, admins get all. `status` filters by Pending, Approved or Rejected. |
| `PATCH` | `/api/bookings` | Logged in | Set a booking to `Approved` or `Rejected`. Only the property's owner can change it. Body: `bookingId`, `bookingStatus` |
| `GET` | `/api/transactions?status=` | Admin | Transaction history |

### Reviews

| Method | Path | Access | Description |
|---|---|---|---|
| `POST` | `/api/reviews` | Tenant | Add a review. Body: `propertyId`, `rating` (1 to 5), `comment` (10 to 500 characters). One review per tenant per property. |
| `GET` | `/api/reviews?propertyId=` | Logged in | Reviews of one property, newest first |
| `GET` | `/api/reviews/top` | Public | Four best reviews (rating 4 or more), highest rating first and newest first within a rating |

## Database

Database name: `RENTORA`

| Collection | Purpose | Main fields |
|---|---|---|
| `user` | Accounts (managed by Better Auth) | `name`, `email`, `image`, `role` |
| `session` | Login sessions (managed by Better Auth) | `token`, `userId` |
| `properties` | Listings | `title`, `description`, `location`, `propertyType`, `rent`, `rentType`, `bedrooms`, `bathrooms`, `propertySize`, `amenities`, `images`, `extraFeatures`, `ownerInformation`, `status`, `rejectionFeedback` |
| `favorites` | Saved properties | `userId`, `propertyId`, a copy of the property data, `createdAt` |
| `bookings` | Reservations | `sessionId`, `propertyId`, `TenantUserId`, `OwnerUserId`, `bookingStatus`, `moveInDate`, `moveOutDate`, `contactNumber`, `notes`, `totalAmount`, `status`, `createdAt` |
| `transactions` | Payment records | `transactionId` (unique), `bookingId`, `propertyId`, `propertyName`, `tenantId`, `tenantName`, `ownerId`, `ownerName`, `amount`, `currency`, `status`, `date` |
| `reviews` | Tenant reviews | `propertyId`, `propertyTitle`, `tenantId`, `tenantName`, `tenantPhoto`, `rating`, `comment`, `createdAt` |

Tenant and owner names are copied into transactions and reviews when they are created, so old records keep the names they had at the time.

## Environment Variables

Create a `.env` file in the project root. Never commit it.

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string. It must point to the same database as the frontend's `MONGODB_URI`, because both apps share the `user` and `session` collections. |
| `PORT` | No | Local port. Defaults to `5000`. |

```env
MONGO_URI=
PORT=5000
```

## Getting Started

**Requirements:** Node.js 20.19 or newer, npm and a MongoDB database.

```bash
git clone https://github.com/asirmahmud2/rentora-server.git
cd rentora-server
npm install

# Create your .env file (see above), then:
npm start
```

The server runs at http://localhost:5000. On startup it connects to MongoDB and creates the unique index on `transactions.transactionId`. The server listens on a port only when it is not running on Vercel, because Vercel runs the exported app itself.

To use it with the frontend locally, set `NEXT_PUBLIC_SERVER_URL=http://localhost:5000` in the frontend's `.env.local`.

## Project Structure

```text
rentora-server/
├── index.js        Express app, middleware, database access and all routes
├── vercel.json     Vercel deployment configuration
├── package.json    Dependencies and scripts
└── .env            Local environment values (not committed)
```

## Deployment

The API is deployed on Vercel.

1. Import the repository in Vercel
2. Add `MONGO_URI` under Settings, Environment Variables, then redeploy
3. In MongoDB Atlas, open Network Access and allow connections from Vercel. Vercel does not use fixed IP addresses, so use `0.0.0.0/0`.
4. Set the frontend's `NEXT_PUBLIC_SERVER_URL` to the deployed API address

## Known Limitations

- **No availability check.** Creating a booking does not look for overlapping dates on the same property.
- **Reviews are not tied to a stay.** Any tenant can review a property once, and there is no route to edit or delete a review.
- **CORS is open.** All origins are allowed, which is convenient for development but can be restricted to the frontend URL.
- **No notifications.** Booking status changes are saved, but no email or message is sent.
- **No caching or rate limiting.** Each protected request does two database lookups (the session, then the user).

## Author

Built by **asirmahmud2** - [GitHub](https://github.com/asirmahmud2)