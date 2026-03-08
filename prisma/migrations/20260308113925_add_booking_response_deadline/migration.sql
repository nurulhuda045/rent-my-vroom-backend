-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "responseDeadline" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Booking_responseDeadline_idx" ON "Booking"("responseDeadline");
