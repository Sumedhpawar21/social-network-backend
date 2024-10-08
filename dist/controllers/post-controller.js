"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.likePostController = exports.getPostsController = exports.addPostController = exports.addCommentController = void 0;
const zod_1 = require("zod");
const dbConfig_1 = __importDefault(require("../config/dbConfig"));
const ErrorClass_1 = require("../utils/ErrorClass");
const uploadToCloudinary_1 = require("../utils/uploadToCloudinary");
const addPostValidation_1 = require("../validators/addPostValidation");
const addPostController = async (req, res, next) => {
    try {
        const { body, file } = (0, addPostValidation_1.validateRequest)(req);
        let content_url;
        if (file) {
            content_url = await (0, uploadToCloudinary_1.uploadFilesToCloudinary)([file]);
            if (!content_url || content_url.length === 0) {
                return next(new Error("Error while uploading content"));
            }
        }
        const newPost = await dbConfig_1.default.post.create({
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
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            return res.status(422).json({
                success: false,
                message: "Invalid data input",
                errors: error.issues.map((e) => ({
                    [e.path[0]]: e.message,
                })),
            });
        }
        console.log(error);
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.addPostController = addPostController;
const getPostsController = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const user_id = req.user?.userId;
        const pageNumber = Number(page);
        const pageSize = Number(limit);
        const skip = (pageNumber - 1) * pageSize;
        const posts = await dbConfig_1.default.post.findMany({
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
        const totalPosts = await dbConfig_1.default.post.count({
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
    }
    catch (error) {
        console.error(error);
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.getPostsController = getPostsController;
const likePostController = async (req, res, next) => {
    try {
        const { post_id } = req.body;
        const user_id = req.user?.userId;
        if (!user_id || !post_id) {
            return next(new ErrorClass_1.ErrorHandler("UserId or postId not Provided", 404));
        }
        const post = await dbConfig_1.default.post.findUnique({
            where: { id: post_id },
            include: {
                likes: {
                    select: { user_id: true },
                },
            },
        });
        const checkLikedPost = post?.likes.find((like) => like.user_id === Number(user_id));
        if (checkLikedPost) {
            await dbConfig_1.default.like.deleteMany({
                where: {
                    post_id: Number(post_id),
                    user_id: Number(user_id),
                },
            });
        }
        else {
            await dbConfig_1.default.like.create({
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
    }
    catch (error) {
        console.log(error);
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.likePostController = likePostController;
const addCommentController = async (req, res, next) => {
    try {
        const { comment, postId } = req.body;
        const userId = req.user?.userId;
        if (!comment || !userId || !postId) {
            return next(new ErrorClass_1.ErrorHandler("Comment, User ID, or Post ID is missing", 400));
        }
        if (comment.length > 300) {
            return next(new ErrorClass_1.ErrorHandler("Comment is too long", 400));
        }
        const newComment = await dbConfig_1.default.comment.create({
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
    }
    catch (error) {
        console.error("Error while adding comment:", error);
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.addCommentController = addCommentController;
