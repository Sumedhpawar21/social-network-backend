import { NextFunction, Request, Response } from "express";
import { ErrorHandler } from "../utils/ErrorClass";
import prisma from "../config/dbConfig";
import { NotificationQueue } from "../queues/friendRequestQueue";

export const addFriendController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { friendId } = req.body;
    let userId = Number(req.user?.userId);

    if (!userId || !friendId) {
      return next(new ErrorHandler("UserId or FriendId not provided", 400));
    }

    if (userId === friendId) {
      return next(
        new ErrorHandler("Cannot send friend request to yourself", 400)
      );
    }

    const existingRequest = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: userId, friendId: friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existingRequest) {
      return next(new ErrorHandler("Friend request already exists", 400));
    }

    const friendRequest = await prisma.friendship.create({
      data: {
        userId,
        friendId,
        status: "pending",
      },
    });

    if (!friendRequest) {
      return next(new ErrorHandler("Error sending friend request", 400));
    }

    await NotificationQueue.add("sendFriendRequestNotification", {
      userId,
      friendId,
      friendshipId: friendRequest.id,
    });

    return res.status(201).json({
      success: true,
      message: "Friend request sent successfully",
    });
  } catch (error) {
    console.error(error);
    return next(new ErrorHandler("Internal server error", 500));
  }
};

export const handleFriendRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { friendShipId, action } = req.body;
    const friendship = await prisma.friendship.update({
      where: {
        id: Number(friendShipId),
      },
      data: {
        status:
          action === "Accept"
            ? "accepted"
            : action === "Decline"
            ? "rejected"
            : "blocked",
      },
    });
    await NotificationQueue.add("sendFriendRequestAccepted", {
      userId: friendship.userId,
      friendId: friendship.friendId,
      friendshipId: friendship.id,
      notificationType: "FriendRequestAccepted",
    });
    return res.status(200).json({
      success: true,
      message: `Friend Request ${action} Successfully`,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

export const getRecommendedFriends = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(new ErrorHandler("UserId Not Provided", 500));
    const recommendedUsers = await prisma.$queryRaw`
    SELECT 
    u.id, 
    u.username, 
    u."avatarUrl",
    f.status 
  FROM "User" u
  LEFT JOIN "Friendship" f ON 
    (f."userId" = ${userId} AND f."friendId" = u.id)
    OR (f."userId" = u.id AND f."friendId" = ${userId})
  WHERE u.id != ${userId} 
    AND (f.status IS NULL OR f.status != 'accepted') 
  ORDER BY RANDOM()
  LIMIT 5;
    `;
    if (!recommendedUsers) {
      return res.status(200).json({
        success: true,
        message: `Recommended Users Fetched Successfully`,
        data: [],
      });
    }
    return res.status(200).json({
      success: true,
      message: `Recommended Users Fetched Successfully`,
      data: recommendedUsers,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

export const unfriendFriend = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { friendshipId } = req.params;

    if (!friendshipId || isNaN(Number(friendshipId))) {
      return next(new ErrorHandler("Invalid Friendship ID", 400));
    }

    const friendship = await prisma.friendship.findUnique({
      where: { id: Number(friendshipId) },
    });

    if (!friendship) {
      return next(new ErrorHandler("Friendship not found", 404));
    }
    await prisma.friendship.delete({
      where: { id: Number(friendshipId) },
    });

    return res.status(200).json({
      status: true,
      message: "Unfriended Successfully",
    });
  } catch (error) {
    console.error("Error in unfriendFriend:", error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};
