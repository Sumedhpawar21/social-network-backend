import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../config/dbConfig";
import { ErrorHandler } from "../utils/ErrorClass";
import { uploadFilesToCloudinary } from "../utils/uploadToCloudinary";
import { validateRequest } from "../validators/addPostValidation";

const addPostController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body, file } = validateRequest(req);
    let content_url;
    if (file) {
      content_url = await uploadFilesToCloudinary([file]);

      if (!content_url || content_url.length === 0) {
        return next(new Error("Error while uploading content"));
      }
    }

    const newPost = await prisma.post.create({
      data: {
        user_id: Number(req.user?.userId),
        ...(body.description && { description: body.description }),
        ...(content_url && { content: content_url[0] }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Posted successfully",
      data: newPost,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(422).json({
        success: false,
        message: "Invalid data input",
        errors: error.issues.map((e) => ({
          [e.path[0]]: e.message,
        })),
      });
    }
    console.log(error);

    return next(new ErrorHandler("Internal Server Error", 500));
  }
};
const getPostsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page, limit } = req.query;
    const user_id = req.user?.userId;
    const pageNumber = Number(page);
    const pageSize = Number(limit);
    const skip = (pageNumber - 1) * pageSize;
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: "desc",
      },

      where: {
        OR: [
          {
            user: {
              friendships: {
                some: {
                  friendId: Number(user_id),
                  status: "accepted",
                },
              },
            },
          },
          {
            user: {
              friendOf: {
                some: {
                  userId: Number(user_id),
                  status: "accepted",
                },
              },
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        comments: {
          select: {
            id: true,
            content: true,
            post: true,
            user: {
              select: {
                avatarUrl: true,
                username: true,
              },
            },
          },
        },
        likes: {
          select: {
            user_id: true,
          },
        },
      },
      skip,
      take: pageSize,
    });
    const totalPosts = await prisma.post.count({
      where: {
        OR: [
          {
            user: {
              friendships: {
                some: {
                  friendId: Number(user_id),
                  status: "accepted",
                },
              },
            },
          },
          {
            user: {
              friendOf: {
                some: {
                  userId: Number(user_id),
                  status: "accepted",
                },
              },
            },
          },
        ],
      },
    });
    console.log(posts);

    return res.status(200).json({
      success: true,
      message: "Posts fetched Successfully",
      data: {
        posts,
        totalPages: Math.ceil(totalPosts / pageSize),
        currentPage: pageNumber,
      },
    });
  } catch (error) {
    console.error(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const likePostController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { post_id } = req.body;
    const user_id = req.user?.userId;
    if (!user_id || !post_id) {
      return next(new ErrorHandler("UserId or postId not Provided", 404));
    }

    const post = await prisma.post.findUnique({
      where: { id: post_id },
      include: {
        likes: {
          select: { user_id: true },
        },
      },
    });

    const checkLikedPost = post?.likes.find(
      (like) => like.user_id === Number(user_id)
    );

    if (checkLikedPost) {
      await prisma.like.deleteMany({
        where: {
          post_id: Number(post_id),
          user_id: Number(user_id),
        },
      });
    } else {
      await prisma.like.create({
        data: {
          post_id: Number(post_id),
          user_id: Number(user_id),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: `Like Updated for post ${post_id}`,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};
const addCommentController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { comment, postId } = req.body;
    const userId = req.user?.userId;

    if (!comment || !userId || !postId) {
      return next(
        new ErrorHandler("Comment, User ID, or Post ID is missing", 400)
      );
    }

    if (comment.length > 300) {
      return next(new ErrorHandler("Comment is too long", 400));
    }

    const newComment = await prisma.comment.create({
      data: {
        content: comment,
        post_id: postId,
        user_id: Number(userId),
      },
    });

    return res.status(201).json({
      success: true,
      message: `Comment added to Post ${postId}`,
    });
  } catch (error) {
    console.error("Error while adding comment:", error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

export {
  addCommentController,
  addPostController,
  getPostsController,
  likePostController,
};
