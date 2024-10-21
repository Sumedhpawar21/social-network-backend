import { Request, Response, NextFunction } from "express";
import Message from "../models/messageSchema";
import { ErrorHandler } from "../utils/ErrorClass";
import prisma from "../config/dbConfig";

const getMessageByChatId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chatId } = req.query;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: "chatId is required",
      });
    }
    const skip = (page - 1) * limit;

    const messages = await Message.find({ chatId }).skip(skip).limit(limit);

    if (!messages.length) {
      return res.status(200).json({
        success: true,
        message: `No messages found for chatId ${chatId}`,
        data: [],
      });
    }

    const senderPromises = messages.map((msg) =>
      prisma.user.findUnique({
        where: {
          id: Number(msg.senderId),
        },
        select: {
          id: true,
          avatarUrl: true,
          username: true,
        },
      })
    );

    const senderData = await Promise.all(senderPromises);

    const messagesWithSenderData = messages.map((msg, index) => ({
      ...msg.toObject(),
      sender: senderData[index],
    }));

    const totalMessages = await Message.countDocuments({ chatId });

    return res.status(200).json({
      success: true,
      message: `Messages for chatId ${chatId} fetched successfully`,
      data: messagesWithSenderData,
      meta: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
      },
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

export { getMessageByChatId };
