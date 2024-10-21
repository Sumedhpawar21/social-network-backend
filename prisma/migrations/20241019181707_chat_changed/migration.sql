/*
  Warnings:

  - You are about to drop the column `userId` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the `ChatMember` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMember" DROP CONSTRAINT "ChatMember_chatId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMember" DROP CONSTRAINT "ChatMember_userId_fkey";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "userId",
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "chatId" INTEGER;

-- DropTable
DROP TABLE "ChatMember";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
