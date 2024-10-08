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
