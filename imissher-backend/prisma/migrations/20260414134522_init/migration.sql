-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fcmToken" TEXT
);

-- CreateTable
CREATE TABLE "MedicationSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "timeToTake" DATETIME NOT NULL,
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "isExpiredNotified" BOOLEAN NOT NULL DEFAULT false,
    "isTaken" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MedicationSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "MedicationSchedule_timeToTake_isNotified_idx" ON "MedicationSchedule"("timeToTake", "isNotified");
