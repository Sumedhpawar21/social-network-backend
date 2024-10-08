-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "friendshipId" INTEGER;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_friendshipId_fkey" FOREIGN KEY ("friendshipId") REFERENCES "Friendship"("id") ON DELETE SET NULL ON UPDATE CASCADE;
