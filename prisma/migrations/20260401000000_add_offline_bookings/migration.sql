-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'OTHER');

-- DropForeignKey (renterId → User) so we can relax NOT NULL and change onDelete
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_renterId_fkey";

-- AlterTable: make renterId nullable and add new columns
ALTER TABLE "Booking"
    ALTER COLUMN "renterId" DROP NOT NULL,
    ADD COLUMN "source" "BookingSource" NOT NULL DEFAULT 'ONLINE',
    ADD COLUMN "offlineCustomerName"  TEXT,
    ADD COLUMN "offlineCustomerPhone" TEXT,
    ADD COLUMN "offlineCustomerEmail" TEXT,
    ADD COLUMN "offlineCustomerNotes" TEXT,
    ADD COLUMN "paymentMethod"   "PaymentMethod",
    ADD COLUMN "amountCollected" DECIMAL(10,2),
    ADD COLUMN "paymentNote"     TEXT;

-- Recreate FK with ON DELETE SET NULL so offline bookings survive renter deletion
ALTER TABLE "Booking"
    ADD CONSTRAINT "Booking_renterId_fkey"
    FOREIGN KEY ("renterId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Booking_source_merchantId_idx" ON "Booking"("source", "merchantId");

-- CreateIndex
CREATE INDEX "Booking_offlineCustomerPhone_idx" ON "Booking"("offlineCustomerPhone");
