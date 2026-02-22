-- AlterTable: User.password optional (Google-only users), add firebaseUid
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "firebaseUid" TEXT;
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
