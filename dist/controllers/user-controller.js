"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutController = exports.getFriendList = exports.getAllUsersController = exports.googleLoginController = exports.verifyUserController = exports.registerController = exports.refreshAccessTokenController = exports.loginController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const dbConfig_1 = __importDefault(require("../config/dbConfig"));
const nodemailerConfig_1 = require("../config/nodemailerConfig");
const constants_1 = require("../helpers/constants");
const helper_1 = require("../helpers/helper");
const ErrorClass_1 = require("../utils/ErrorClass");
const uploadToCloudinary_1 = require("../utils/uploadToCloudinary");
const userLoginValidation_1 = require("../validators/userLoginValidation");
const userRegisterValidator_1 = __importDefault(require("../validators/userRegisterValidator"));
const registerController = async (req, res, next) => {
    try {
        const body = req.body;
        const payload = userRegisterValidator_1.default.parse(body);
        const avatar = req?.file;
        let user = await dbConfig_1.default.user.findFirst({
            where: {
                OR: [{ email: payload.email }, { username: payload.username }],
            },
        });
        if (user) {
            return next(new ErrorClass_1.ErrorHandler("User Already Exists with Email or Username", 400));
        }
        let avatar_url;
        if (avatar) {
            avatar_url = await (0, uploadToCloudinary_1.uploadFilesToCloudinary)([avatar]);
        }
        const hashedPassword = await bcryptjs_1.default.hash(payload.password, 10);
        const verificationCode = Math.floor(10000 + Math.random() * 90000); //5 digits
        const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15mins
        const newUser = await dbConfig_1.default.user.create({
            data: {
                email: payload.email,
                username: payload.username,
                password: hashedPassword,
                ...(avatar_url && { avatarUrl: avatar_url[0] }),
                verification_token: verificationCode,
                verification_token_expiry: verificationExpiry,
                ...(payload.bio && { bio: payload.bio }),
            },
        });
        await (0, nodemailerConfig_1.SendMail)(payload.email, "Verify Your Account!", verificationCode, "Verify Your Account");
        return res.status(200).json({
            success: true,
            message: "User Registered Successfully",
            data: newUser,
        });
    }
    catch (error) {
        console.error(error);
        if (error instanceof zod_1.ZodError) {
            return res.status(422).json({
                success: false,
                message: "Invalid Data Inputed",
                error: error.issues.map((e) => ({
                    [e.path[0]]: e.message,
                })),
            });
        }
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.registerController = registerController;
const verifyUserController = async (req, res, next) => {
    try {
        const { verification_code } = req.body;
        if (!verification_code)
            return next(new ErrorClass_1.ErrorHandler("provide Verification Code", 400));
        const user = await dbConfig_1.default.user.findFirst({
            where: {
                verification_token: Number(verification_code),
            },
        });
        if (!user)
            return next(new ErrorClass_1.ErrorHandler("Invalid Verification Code", 400));
        if (!user.verification_token_expiry ||
            user.verification_token_expiry.getTime() < Date.now()) {
            await dbConfig_1.default.user.delete({
                where: {
                    id: user.id,
                },
            });
            return next(new ErrorClass_1.ErrorHandler("Verification Code Expired. Please Register Again.", 400));
        }
        await dbConfig_1.default.user.update({
            where: {
                email: user.email,
            },
            data: {
                isVerified: true,
                verification_token: null,
                verification_token_expiry: null,
            },
        });
        return res.status(200).json({
            success: true,
            message: `${user.username} Verified Sucessfully`,
        });
    }
    catch (error) {
        console.log(error);
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.verifyUserController = verifyUserController;
const loginController = async (req, res, next) => {
    try {
        const body = req.body;
        const payload = userLoginValidation_1.userLoginValidation.parse(body);
        const user = await dbConfig_1.default.user.findUnique({
            where: {
                username: payload.username,
            },
        });
        if (!user)
            return next(new ErrorClass_1.ErrorHandler("No User Found with this username", 404));
        if (!user.isVerified) {
            await dbConfig_1.default.user.delete({
                where: {
                    username: payload.username,
                },
            });
            return next(new ErrorClass_1.ErrorHandler(`${payload.username} is Not Verified,Register Again`, 400));
        }
        const isMatch = await bcryptjs_1.default.compare(payload.password, user.password);
        if (!isMatch)
            return next(new ErrorClass_1.ErrorHandler("Invalid Credentials", 400));
        const refreshToken = (0, helper_1.generateToken)({ userId: user.id, email: user.email }, "30d", true);
        await dbConfig_1.default.user.update({
            where: {
                username: user.username,
            },
            data: {
                refresh_token: refreshToken,
            },
        });
        const accesstoken = (0, helper_1.generateToken)({
            userId: user.id,
            email: user.email,
        }, "7d", false);
        return res
            .cookie(constants_1.token_name, refreshToken, {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: "none",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        })
            .status(200)
            .json({
            success: true,
            message: `${user.username} Welcome Back`,
            data: {
                userId: user.id,
                email: user.email,
                username: user.username,
                access_token: accesstoken,
            },
        });
    }
    catch (error) {
        console.log(error);
        if (error instanceof zod_1.ZodError) {
            return res.status(422).json({
                success: false,
                message: "Invalid Data Inputed",
                error: error.issues.map((e) => ({
                    [e.path[0]]: e.message,
                })),
            });
        }
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.loginController = loginController;
const refreshAccessTokenController = async (req, res, next) => {
    try {
        const refreshToken = req.cookies[constants_1.token_name];
        console.log(refreshToken, 225);
        if (!refreshToken)
            return next(new ErrorClass_1.ErrorHandler("Provide refresh-token", 401));
        const decodedData = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_SECRET);
        if (typeof decodedData !== "object" || !decodedData) {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired refresh token",
            });
        }
        const { userId, email } = decodedData;
        const newAccessToken = (0, helper_1.generateToken)({
            userId: userId,
            email: email,
        }, "7d", false);
        return res.status(200).json({
            success: true,
            message: "Access Token Generated Successfully",
            data: {
                access_token: newAccessToken,
            },
        });
    }
    catch (error) {
        console.log(error);
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.refreshAccessTokenController = refreshAccessTokenController;
const googleLoginController = async (req, res, next) => {
    try {
        const { email, username } = req.body;
        if (!email || !username)
            return next(new ErrorClass_1.ErrorHandler("Email or Username is Missing", 400));
        let user = await dbConfig_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            user = await dbConfig_1.default.user.create({
                data: {
                    email: email,
                    username: username,
                    isVerified: true,
                },
            });
        }
        const refreshToken = (0, helper_1.generateToken)({ userId: user.id, email: user.email }, "30d", true);
        const accessToken = (0, helper_1.generateToken)({ userId: user.id, email: user.email }, "7d");
        await dbConfig_1.default.user.update({
            where: { email: user.email },
            data: { refresh_token: refreshToken },
        });
        return res
            .cookie("refreshToken", refreshToken, {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: "none",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        })
            .status(200)
            .json({
            success: true,
            message: `Welcome ${user.username}`,
            data: {
                userId: user.id,
                email: user.email,
                username: user.username,
                access_token: accessToken,
            },
        });
    }
    catch (error) {
        console.error("Error during Google login:", error);
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.googleLoginController = googleLoginController;
const getAllUsersController = async (req, res, next) => {
    try {
        const { search } = req.query;
        const userId = req.user?.userId;
        if (!userId || isNaN(Number(userId))) {
            return next(new ErrorClass_1.ErrorHandler("Invalid or missing userId", 400));
        }
        const parsedUserId = Number(userId);
        // Start building the query filter for users
        const whereFilter = {
            id: { not: parsedUserId }, // exclude the logged-in user
        };
        // Add search filter if query param 'search' exists
        if (search) {
            whereFilter.OR = [
                { email: { contains: String(search), mode: "insensitive" } },
                { username: { contains: String(search), mode: "insensitive" } },
            ];
        }
        // Fetch users from the database
        const users = await dbConfig_1.default.user.findMany({
            where: whereFilter,
            select: {
                id: true,
                username: true,
                avatarUrl: true,
                friendships: {
                    where: {
                        OR: [
                            { userId: parsedUserId, friendId: { not: parsedUserId } },
                            { friendId: parsedUserId, userId: { not: parsedUserId } },
                        ],
                    },
                    select: { status: true },
                },
                friendOf: {
                    where: {
                        OR: [
                            { userId: parsedUserId, friendId: { not: parsedUserId } },
                            { friendId: parsedUserId, userId: { not: parsedUserId } },
                        ],
                    },
                    select: { status: true },
                },
            },
        });
        // Map the fetched users to include friendship status
        const usersWithFriendshipStatus = users.map((user) => {
            const friendshipStatus = user.friendships.length > 0
                ? user.friendships[0].status
                : user.friendOf.length > 0
                    ? user.friendOf[0].status
                    : "none"; // Default to 'none' if no friendship exists
            // Exclude raw friendship data from the response
            const { friendships, friendOf, ...userData } = user;
            return {
                ...userData,
                friendshipStatus,
            };
        });
        // Respond with the fetched users
        return res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: usersWithFriendshipStatus,
        });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.getAllUsersController = getAllUsersController;
const getFriendList = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        const { username } = req.query;
        if (!userId) {
            return next(new ErrorClass_1.ErrorHandler("User not authenticated", 401));
        }
        const user = await dbConfig_1.default.user.findUnique({
            where: {
                id: Number(userId),
            },
            include: {
                friendships: {
                    where: {
                        status: "accepted",
                        friend: {
                            ...(username && {
                                username: {
                                    contains: String(username),
                                    mode: "insensitive",
                                },
                            }),
                        },
                    },
                    include: {
                        friend: {
                            include: {
                                chatMemberships: {
                                    where: {
                                        chat: {
                                            members: {
                                                some: {
                                                    userId: Number(userId),
                                                },
                                            },
                                        },
                                    },
                                    include: {
                                        chat: {
                                            select: {
                                                id: true,
                                                last_message: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                friendOf: {
                    where: {
                        status: "accepted",
                        user: {
                            ...(username && {
                                username: {
                                    contains: String(username),
                                    mode: "insensitive",
                                },
                            }),
                        },
                    },
                    include: {
                        user: {
                            include: {
                                chatMemberships: {
                                    where: {
                                        chat: {
                                            members: {
                                                some: {
                                                    userId: Number(userId),
                                                },
                                            },
                                        },
                                    },
                                    include: {
                                        chat: {
                                            select: {
                                                id: true,
                                                last_message: true,
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!user) {
            return res.status(200).json({
                success: true,
                message: `Friends fetched successfully for userId: ${userId}`,
                data: [],
            });
        }
        const friends = [
            ...user.friendships.map((friendship) => {
                const chat = friendship.friend.chatMemberships[0]?.chat;
                return {
                    friendId: friendship.friend.id,
                    username: friendship.friend.username,
                    avatarUrl: friendship.friend.avatarUrl,
                    chat: {
                        id: chat?.id ?? null,
                        last_message: chat?.last_message ?? null,
                    },
                };
            }),
            ...user.friendOf.map((friendOf) => {
                const chat = friendOf.user.chatMemberships[0]?.chat;
                return {
                    friendId: friendOf.user.id,
                    username: friendOf.user.username,
                    avatarUrl: friendOf.user.avatarUrl,
                    chat: {
                        id: chat?.id ?? null,
                        last_message: chat?.last_message ?? null,
                    },
                };
            }),
        ];
        return res.status(200).json({
            success: true,
            message: `Friends fetched successfully for userId: ${userId}`,
            data: friends,
        });
    }
    catch (error) {
        console.log(error);
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.getFriendList = getFriendList;
const logoutController = async (req, res, next) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return next(new ErrorClass_1.ErrorHandler("UserId Not Provided", 404));
        }
        const logoutUser = await dbConfig_1.default.user.update({
            data: {
                refresh_token: null,
            },
            where: {
                id: Number(userId),
            },
        });
        if (!logoutUser)
            return next(new ErrorClass_1.ErrorHandler("Error While logging Out User", 400));
        return res
            .status(200)
            .cookie(constants_1.token_name, "", {
            maxAge: 0,
            sameSite: "none",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
        })
            .json({
            success: true,
            message: "Logout Successfully",
        });
    }
    catch (error) {
        console.log(error);
        return next(new ErrorClass_1.ErrorHandler("Internal Server Error", 500));
    }
};
exports.logoutController = logoutController;
