-- Integer PKs -> UUID v4 (pre-production cutover; existing data is discarded)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop dependent tables first (FK order)
DROP TABLE IF EXISTS "Message" CASCADE;
DROP TABLE IF EXISTS "Review" CASCADE;
DROP TABLE IF EXISTS "Booking" CASCADE;
DROP TABLE IF EXISTS "Vehicle" CASCADE;
DROP TABLE IF EXISTS "RefreshToken" CASCADE;
DROP TABLE IF EXISTS "KYC" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- User
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'RENTER',
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "registrationStep" "RegistrationStep",
    "licenseUrl" TEXT,
    "licenseStatus" "LicenseStatus" NOT NULL DEFAULT 'PENDING',
    "licenseApprovedAt" TIMESTAMP(3),
    "businessName" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_phone_idx" ON "User"("phone");
CREATE INDEX "User_role_idx" ON "User"("role");

-- RefreshToken
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vehicle
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchantId" UUID NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "pricePerHour" DECIMAL(10,2) NOT NULL,
    "pricePerDay" DECIMAL(10,2) NOT NULL,
    "seats" INTEGER NOT NULL,
    "fuelType" TEXT NOT NULL,
    "transmission" TEXT NOT NULL,
    "mileage" INTEGER,
    "description" TEXT,
    "features" TEXT[],
    "images" TEXT[],
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");
CREATE INDEX "Vehicle_merchantId_idx" ON "Vehicle"("merchantId");
CREATE INDEX "Vehicle_isAvailable_idx" ON "Vehicle"("isAvailable");

ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Booking
CREATE TABLE "Booking" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" "BookingSource" NOT NULL DEFAULT 'ONLINE',
    "renterId" UUID,
    "merchantId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "offlineCustomerName" TEXT,
    "offlineCustomerPhone" TEXT,
    "offlineCustomerEmail" TEXT,
    "offlineCustomerNotes" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "renterNotes" TEXT,
    "merchantNotes" TEXT,
    "responseDeadline" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "paymentMethod" "PaymentMethod",
    "amountCollected" DECIMAL(10,2),
    "paymentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Booking_renterId_idx" ON "Booking"("renterId");
CREATE INDEX "Booking_merchantId_idx" ON "Booking"("merchantId");
CREATE INDEX "Booking_vehicleId_idx" ON "Booking"("vehicleId");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_startDate_endDate_idx" ON "Booking"("startDate", "endDate");
CREATE INDEX "Booking_responseDeadline_idx" ON "Booking"("responseDeadline");
CREATE INDEX "Booking_source_merchantId_idx" ON "Booking"("source", "merchantId");
CREATE INDEX "Booking_offlineCustomerPhone_idx" ON "Booking"("offlineCustomerPhone");

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Message
CREATE TABLE "Message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bookingId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "receiverId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_bookingId_idx" ON "Message"("bookingId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_receiverId_idx" ON "Message"("receiverId");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

ALTER TABLE "Message" ADD CONSTRAINT "Message_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Review
CREATE TABLE "Review" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bookingId" UUID NOT NULL,
    "reviewerId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");
CREATE INDEX "Review_reviewerId_idx" ON "Review"("reviewerId");
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- KYC
CREATE TABLE "KYC" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "licenseImageUrl" TEXT NOT NULL,
    "holderPhotoUrl" TEXT,
    "licenseExpiryDate" TIMESTAMP(3) NOT NULL,
    "status" "KYCStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KYC_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KYC_userId_key" ON "KYC"("userId");
CREATE INDEX "KYC_userId_idx" ON "KYC"("userId");
CREATE INDEX "KYC_status_idx" ON "KYC"("status");

ALTER TABLE "KYC" ADD CONSTRAINT "KYC_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
