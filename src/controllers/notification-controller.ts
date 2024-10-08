import { NextFunction, Request, Response } from "express";
import { ErrorHandler } from "../utils/ErrorClass";
import prisma from "../config/dbConfig";

const getNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    let notifications = await prisma.notification.findMany({
      where: {
        recipientId: Number(userId),
      },
      select: {
        sender: {
          select: {
            avatarUrl: true,
            username: true,
            id: true,
          },
        },
        notificationType: true,
        message: true,
        createdAt: true,
        id: true,
        friendship: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    if (notifications.length === 0) {
      return res.status(200).json({
        success: true,
        message: `Notification Fetched Successfully`,
        data: [],
      });
    }
    return res.status(200).json({
      success: true,
      message: `Notification Fetched Successfully`,
      data: notifications,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

export { getNotification };
