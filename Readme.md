# 🚗 RentMyVroom - Vehicle Rental Platform Backend

A production-ready **NestJS REST API** for a vehicle rental marketplace supporting **Merchants** and **Renters**.

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (Merchant / Renter / Admin)
- Secure password hashing with bcrypt
- Token expiration and renewal

### 👤 User Management
- User registration and profile management
- Driving license upload and approval workflow
- Merchant business information
- Role-specific features

### 🚙 Vehicle Management
- Create, read, update, and delete vehicles (Merchants)
- Vehicle photos and specifications
- Availability management
- Public vehicle browsing

### 📅 Booking System
- Create booking requests (Renters)
- Accept/reject bookings (Merchants)
- Booking status tracking
- Automatic price calculation
- License verification before booking

### 💬 Messaging
- Booking-based messaging between renters and merchants
- Real-time message status (read/unread)
- Secure conversation threads

### ⭐ Reviews & Ratings
- Post-rental reviews (Renters)
- 5-star rating system
- Average rating calculation
- Review history per merchant

### ☁️ File Uploads
- Cloudflare R2 integration
- Presigned URL generation
- Secure file uploads
- Support for vehicle images and licenses

### 📧 Email Notifications
- New booking notifications
- Booking acceptance/rejection alerts
- License approval notifications
- Booking completion reminders

## 🛠 Tech Stack

- **Framework:** NestJS 10
- **Database:** PostgreSQL
- **ORM:** Prisma 5
- **Authentication:** Passport + JWT
- **Storage:** Cloudflare R2 (S3-compatible)
- **Email:** Nodemailer (SMTP)
- **Validation:** class-validator
- **Documentation:** Swagger/OpenAPI

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Cloudflare R2 account (or S3-compatible storage)
- SMTP email service

### Setup Steps

1. **Clone and Install**
```bash
git clone <repository-url>
cd rentmyvroom
npm install
```

2. **Environment Configuration**

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rentmyvroom

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Cloudflare R2
R2_ACCESS_KEY=your-r2-access-key
R2_SECRET_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://your-public-url.com

# Email
EMAIL_FROM=noreply@rentmyvroom.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Application
PORT=3000
FRONTEND_URL=http://localhost:3001
```

3. **Database Setup**

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

4. **Start Development Server**

```bash
npm run start:dev
```

The API will be available at:
- **API:** http://localhost:3000
- **Swagger Docs:** http://localhost:3000/api

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Logout user | Yes |
| GET | `/auth/profile` | Get current user | Yes |

### User Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/users/upload-license` | Upload driving license | Renter |
| PATCH | `/users/approve/:userId` | Approve/reject license | Admin |
| GET | `/users/me` | Get profile | Any |
| PATCH | `/users/me` | Update profile | Any |
| GET | `/users/pending-licenses` | Get pending approvals | Admin |

### Vehicle Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/vehicles` | Create vehicle | Merchant |
| GET | `/vehicles` | Get all vehicles | Public |
| GET | `/vehicles/my` | Get my vehicles | Merchant |
| GET | `/vehicles/:id` | Get vehicle details | Public |
| PATCH | `/vehicles/:id` | Update vehicle | Merchant |
| DELETE | `/vehicles/:id` | Delete vehicle | Merchant |

### Booking Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/bookings` | Create booking | Renter |
| GET | `/bookings/renter` | Get my bookings | Renter |
| GET | `/bookings/merchant` | Get received bookings | Merchant |
| PATCH | `/bookings/:id/accept` | Accept booking | Merchant |
| PATCH | `/bookings/:id/reject` | Reject booking | Merchant |
| PATCH | `/bookings/:id/complete` | Complete booking | Merchant |

### Message Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/messages/:bookingId` | Send message | Yes |
| GET | `/messages/:bookingId` | Get messages | Yes |

### Review Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/reviews` | Create review | Renter |
| GET | `/reviews/merchant/:merchantId` | Get merchant reviews | Public |

### Upload Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/uploads/presign` | Get presigned upload URL | Yes |

## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Refresh token rotation
- ✅ Role-based access control
- ✅ Input validation with class-validator
- ✅ Rate limiting on sensitive endpoints
- ✅ CORS configuration
- ✅ Environment-based configuration

## 📊 Database Schema

### Models

- **User** - User accounts with roles
- **RefreshToken** - JWT refresh tokens
- **Vehicle** - Vehicle listings
- **Booking** - Rental bookings
- **Message** - Booking messages
- **Review** - Ratings and reviews

### Relationships

```
User (Merchant) → Vehicles → Bookings → Messages
                                      → Reviews
User (Renter) → Bookings → Messages
                         → Reviews
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 🚀 Production Deployment

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm run start:prod
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "run", "start:prod"]
```

## 📝 Scripts

```bash
npm run start          # Start application
npm run start:dev      # Start with watch mode
npm run start:prod     # Start production build
npm run build          # Build application
npm run format         # Format code with Prettier
npm run lint           # Lint code with ESLint
npm run test           # Run unit tests
npm run test:e2e       # Run E2E tests
npm run prisma:generate # Generate Prisma Client
npm run prisma:migrate  # Run database migrations
npm run prisma:studio   # Open Prisma Studio
```

## 🗺 Project Structure

```
src/
├── auth/                 # Authentication & JWT
│   ├── dto/             # Data transfer objects
│   ├── guards/          # Auth guards
│   ├── strategies/      # Passport strategies
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
├── users/               # User management
├── vehicles/            # Vehicle listings
├── bookings/            # Booking management
├── messages/            # Messaging system
├── reviews/             # Reviews & ratings
├── uploads/             # File uploads (R2)
├── notifications/       # Email notifications
├── prisma/              # Database service
├── common/              # Shared utilities
│   ├── decorators/     # Custom decorators
│   └── guards/         # Custom guards
├── app.module.ts
└── main.ts
```

## 🔄 Typical User Flows

### Renter Flow
1. Register as RENTER
2. Upload driving license
3. Wait for admin approval
4. Browse available vehicles
5. Create booking request
6. Wait for merchant acceptance
7. Message merchant for pickup details
8. Complete rental
9. Leave review

### Merchant Flow
1. Register as MERCHANT
2. Create vehicle listings
3. Upload vehicle photos
4. Receive booking requests (email)
5. Accept/reject bookings
6. Message renter
7. Mark booking as completed

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@rentmyvroom.com or open an issue in the repository.

## 🎯 Roadmap

- [ ] Payment integration (Stripe/PayPal)
- [ ] Real-time chat with WebSockets
- [ ] Advanced search and filters
- [ ] Admin dashboard
- [ ] Mobile app API support
- [ ] Multi-language support
- [ ] Vehicle insurance integration
- [ ] GPS tracking integration

---

Built with ❤️ using NestJS
