/*
  Warnings:

  - You are about to drop the `_UserFriends` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_UserFriends" DROP CONSTRAINT "_UserFriends_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserFriends" DROP CONSTRAINT "_UserFriends_B_fkey";

-- DropTable
DROP TABLE "_UserFriends";

-- CreateTable
CREATE TABLE "UserFriends" (
    "userId" INTEGER NOT NULL,
    "friendId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFriends_pkey" PRIMARY KEY ("userId","friendId")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserFriends_userId_friendId_key" ON "UserFriends"("userId", "friendId");

-- AddForeignKey
ALTER TABLE "UserFriends" ADD CONSTRAINT "UserFriends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFriends" ADD CONSTRAINT "UserFriends_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
