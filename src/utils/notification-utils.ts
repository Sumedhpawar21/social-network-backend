import prisma from "../config/dbConfig.js";
import { redis } from "../config/redisConfig";
import { sendSseNotification } from "../controllers/sse-controller";

export const sendFriendRequestNotification = async ({
  userId,
  friendId,
  friendshipId,
}: {
  userId: number;
  friendId: number;
  friendshipId: number;
}) => {
  const notification = await prisma.notification.create({
    data: {
      notificationType: "FRIEND_REQUEST_RECEIVED",
      message: "Received Friend Request",
      recipientId: friendId,
      senderId: userId,
      friendshipId: friendshipId,
    },
  });

  const [user, friend] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true, username: true, id: true },
    }),
    prisma.user.findUnique({
      where: { id: friendId },
      select: { avatarUrl: true, username: true, id: true },
    }),
  ]);

  const notificationPayload = {
    message: "You have a new friend request",
    user,
    friend,
  };

  sendSseNotification(friendId, notificationPayload);
};

export const sendFriendRequestAcceptedNotification = async ({
  userId,
  friendId,
  friendshipId,
}: {
  userId: number;
  friendId: number;
  friendshipId: number;
}) => {
  const [user, friend] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true, username: true, id: true },
    }),
    prisma.user.findUnique({
      where: { id: friendId },
      select: { avatarUrl: true, username: true, id: true },
    }),
  ]);
  const notification = await prisma.notification.create({
    data: {
      notificationType: "FRIEND_REQUEST_ACCEPTED",
      message: `${friend?.username} Accepted Your Friend Request`,
      recipientId: userId,
      senderId: friendId,
      friendshipId,
    },
  });
  console.log("FriendShipId From Utility:", friendshipId);

  const deleteExistingNotification = await prisma.notification.deleteMany({
    where: {
      friendshipId: Number(friendshipId),
      notificationType: "FRIEND_REQUEST_RECEIVED",
    },
  });
  console.log(deleteExistingNotification, 78);

  const notificationPayload = {
    message: `${friend?.username} Accepted Your Friend Request`,
    user,
    friend,
  };

  sendSseNotification(userId, notificationPayload);
};
