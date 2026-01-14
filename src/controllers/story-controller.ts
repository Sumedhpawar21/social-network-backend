import { NextFunction, Request, Response } from "express";
import { ErrorHandler } from "../utils/ErrorClass";
import { validateRequest } from "../validators/addPostValidation";
import { uploadFilesToCloudinary } from "../utils/uploadToCloudinary";
import prisma from "../config/dbConfig";

const addStoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.user?.userId);
    const { file } = validateRequest(req);
    let content_url;
    if (file) {
      content_url = await uploadFilesToCloudinary([file]);

      if (!content_url || content_url.length === 0) {
        return next(new Error("Error while uploading content"));
      }
    }
    const newStory = await prisma.story.create({
      data: {
        user_id: userId,
        content: content_url![0],
      },
    });
    return res.status(200).json({
      success: true,
      message: "story added successfully",
      data: newStory,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const getStoriesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.user?.userId);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

     const users = await prisma.user.findMany({
       where: {
         OR: [
           { id: userId },
           {
             friendOf: {
               some: { userId, status: "accepted" },
             },
           },
           {
             friendships: {
               some: { friendId: userId, status: "accepted" },
             },
           },
         ],
       },
       select: {
         id: true,
         username: true,
         avatarUrl: true,
         Story: {
           where: {
             createdAt: { gte: twentyFourHoursAgo },
           },
           orderBy: {
             createdAt: "asc",
           },
           select: {
             id: true,
             content: true,
             createdAt: true,
           },
         },
       },
     });

     const orderedUsers = [
       ...users.filter((u) => u.id === userId),
       ...users.filter((u) => u.id !== userId && u.Story.length > 0),
     ];

     const data = orderedUsers.map((u) => ({
       user: {
         id: u.id,
         username: u.username,
         avatarUrl: u.avatarUrl,
       },
       stories: u.Story,
     }));

     return res.status(200).json({
       success: true,
       message: "Stories fetched successfully",
       data,
     });
  } catch (error) {
    console.error(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

export { addStoryController, getStoriesController };
