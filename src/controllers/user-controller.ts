import bcrypt from "bcryptjs";
import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ZodError } from "zod";
import prisma from "../config/dbConfig";
import { SendMail } from "../config/nodemailerConfig";
import {
  access_token,
  CookieOptions,
  refresh_token,
} from "../helpers/constants";
import { extractImagePublicId, generateToken } from "../helpers/helper";
import { ErrorHandler } from "../utils/ErrorClass";
import { uploadFilesToCloudinary } from "../utils/uploadToCloudinary";
import { userLoginValidation } from "../validators/userLoginValidation";
import registerSchema from "../validators/userRegisterValidator";
import editProfileSchema from "../validators/editProfileValidator";
import { cloudinary } from "../config/cloudinaryConfig";
import path from "path";
import ejs from "ejs";

const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body;
    const payload = registerSchema.parse(body);
    const avatar = req?.file;

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email: payload.email }, { username: payload.username }],
      },
    });
    if (user) {
      return next(
        new ErrorHandler("User Already Exists with Email or Username", 400)
      );
    }

    let avatar_url;
    if (avatar) {
      avatar_url = await uploadFilesToCloudinary([avatar]);
    }

    const hashedPassword = await bcrypt.hash(payload.password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: payload.email,
        username: payload.username,
        password: hashedPassword,
        ...(avatar_url && { avatarUrl: avatar_url[0] }),
        ...(payload.bio && { bio: payload.bio }),
      },
    });
    const verificationCode = Math.floor(10000 + Math.random() * 90000);

    const otpToken = jwt.sign(
      { email: payload.email, otp: verificationCode },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );
    await SendMail({
      email: payload.email,
      subject: "Verify Your Account!",
      code: verificationCode,
      text: "Verify Your Account",
    });
    return res.status(200).json({
      success: true,
      message: "User Registered Successfully",
      data: {
        otpToken,
      },
    });
  } catch (error) {
    console.error(error);
    if (error instanceof ZodError) {
      return res.status(422).json({
        success: false,
        message: "Invalid Data Inputed",
        error: error.issues.map((e) => ({
          [e.path[0]]: e.message,
        })),
      });
    }
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const verifyUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { verification_code, otpToken } = req.body;

    if (!verification_code || !otpToken) {
      return next(
        new ErrorHandler("Provide both Verification Code and OTP Token", 400)
      );
    }

    let decoded: any;
    try {
      decoded = jwt.verify(otpToken, process.env.JWT_SECRET as string);
    } catch (error) {
      return next(new ErrorHandler("Invalid or Expired OTP Token", 400));
    }
    if (decoded.otp !== verification_code) {
      return next(new ErrorHandler("Invalid Verification Code", 400));
    }
    const user = await prisma.user.findFirst({
      where: {
        email: decoded.email,
      },
    });

    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }
    await prisma.user.update({
      where: {
        email: user.email,
      },
      data: {
        isVerified: true,
      },
    });
    return res.status(200).json({
      success: true,
      message: `${user.username} Verified Successfully`,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body;
    const payload = userLoginValidation.parse(body);
    const user = await prisma.user.findFirst({
      where: {
        username: payload.username,
      },
    });
    if (!user)
      return next(new ErrorHandler("No User Found with this username", 404));
    if (!user.isVerified) {
      await prisma.user.delete({
        where: {
          id: user.id,
        },
      });
      return next(
        new ErrorHandler(
          `${payload.username} is Not Verified,Register Again`,
          400
        )
      );
    }
    const isMatch = await bcrypt.compare(payload.password, user.password!);
    if (!isMatch) return next(new ErrorHandler("Invalid Credentials", 400));
    const refreshToken = generateToken(
      { userId: user.id, email: user.email },
      "30d",
      true
    );
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refresh_token: refreshToken,
      },
    });
    const accesstoken = generateToken(
      {
        userId: user.id,
        email: user.email,
      },
      "7d",
      false
    );

    return res
      .cookie(
        refresh_token,
        refreshToken,
        new CookieOptions({ is_refresh: true })
      )
      .cookie(
        access_token,
        accesstoken,
        new CookieOptions({ is_refresh: false })
      )
      .status(200)
      .json({
        success: true,
        message: `${user.username} Welcome Back`,
        data: {
          userId: user.id,
          email: user.email,
          username: user.username,
        },
      });
  } catch (error) {
    console.log(error);
    if (error instanceof ZodError) {
      return res.status(422).json({
        success: false,
        message: "Invalid Data Inputed",
        error: error.issues.map((e) => ({
          [e.path[0]]: e.message,
        })),
      });
    }
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};
const refreshAccessTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies[refresh_token];

    if (!refreshToken)
      return next(new ErrorHandler("Provide refresh-token", 401));
    const decodedData = jwt.verify(refreshToken, process.env.JWT_SECRET!);

    if (typeof decodedData !== "object" || !decodedData) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const { userId, email } = decodedData as JwtPayload;
    const newAccessToken = generateToken(
      {
        userId: userId as number,
        email: email as string,
      },
      "7d",
      false
    );
    return res
      .cookie(
        access_token,
        newAccessToken,
        new CookieOptions({ is_refresh: false })
      )
      .status(200)
      .json({
        success: true,
        message: "Access Token Generated Successfully",
      });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};
const googleLoginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { credentials } = req.body;

    if (!credentials || !credentials.credential) {
      return next(new ErrorHandler("Invalid credentials provided", 400));
    }

    // Validate Google ID token
    const client = new OAuth2Client(process.env.GOOGLE_ID!);
    const clientData = await client.verifyIdToken({
      idToken: credentials.credential,
      audience: process.env.GOOGLE_ID,
    });

    const payload = clientData.getPayload();
    if (!payload) {
      return next(new ErrorHandler("Invalid Google token payload", 400));
    }

    const { email, name, picture } = payload;

    if (!email || !name) {
      return next(new ErrorHandler("Email or username is missing", 400));
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          username: name,
          isVerified: true,
          avatarUrl: picture,
        },
      });
    }

    const refreshToken = generateToken(
      { userId: user.id, email: user.email },
      "30d",
      true
    );

    const accessToken = generateToken(
      { userId: user.id, email: user.email },
      "7d"
    );
    await prisma.user.update({
      where: { email: user.email },
      data: { refresh_token: refreshToken },
    });

    return res
      .status(200)
      .cookie(
        refresh_token,
        refreshToken,
        new CookieOptions({ is_refresh: true })
      )
      .cookie(access_token, accessToken, new CookieOptions({}))
      .json({
        success: true,
        message: "Login With Google Successfully",
        data: {
          userId: user.id,
          email: user.email,
          username: user.username,
        },
      });
  } catch (error) {
    console.error("Error during Google login:", error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const sendResetPasswordMail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new ErrorHandler("Email Not Provided", 400));
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      return next(new ErrorHandler("User Not Found with Given Email", 400));
    }
    const Otp = Math.floor(10000 + Math.random() * 90000);
    const otpToken = jwt.sign(
      { email: email, otp: Otp },
      process.env.JWT_SECRET as string,
      { expiresIn: "10m" }
    );
    const resetUrl = `${
      process.env.NODE_ENV === "production"
        ? "https://soccial-nettwork.vercel.app"
        : "http://localhost:5173"
    }/reset-password?token=${otpToken}`;
    const templatePath = path.resolve(__dirname, "../mails/ResetPassword.ejs");

    const emailHtml = await ejs.renderFile(templatePath, {
      name: user.username,
      resetUrl: resetUrl,
    });

    await SendMail({
      email,
      subject: "Reset Password",
      text: "Reset Password!",
      html: emailHtml,
    });
    return res.status(200).json({
      status: true,
      message: "Reset Password Mail Sent Successfully",
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { otpToken, new_password } = req.body;

    if (!otpToken || !new_password) {
      return next(new ErrorHandler("Token or Password Not Provided", 400));
    }

    let decodedData: any;
    try {
      decodedData = jwt.verify(otpToken, process.env.JWT_SECRET as string);
    } catch (error) {
      return next(
        new ErrorHandler("Invalid or Expired Reset Password Link", 400)
      );
    }

    if (!decodedData.email) {
      return next(new ErrorHandler("Invalid Token Data", 400));
    }

    const user = await prisma.user.findUnique({
      where: { email: decodedData.email },
    });

    if (!user) {
      return next(new ErrorHandler("User Not Found", 404));
    }

    const newHashPw = await bcrypt.hash(new_password, 10);

    await prisma.user.update({
      where: { email: decodedData.email },
      data: { password: newHashPw },
    });

    return res.status(200).json({
      success: true,
      message: "Password Reset Successfully",
    });
  } catch (error) {
    console.error(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};


const getAllUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search } = req.query;
    const userId = req.user?.userId;

    if (!userId || isNaN(Number(userId))) {
      return next(new ErrorHandler("Invalid or missing userId", 400));
    }

    const parsedUserId = Number(userId);

    const users = await prisma.user.findMany({
      where: {
        AND: {
          id: {
            not: parsedUserId,
          },
        },
        ...(search && {
          OR: [
            {
              email: { contains: String(search), mode: "insensitive" },
            },
            {
              username: { contains: String(search), mode: "insensitive" },
            },
          ],
        }),
      },
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
          select: {
            status: true,
          },
        },
        friendOf: {
          where: {
            OR: [
              { userId: parsedUserId, friendId: { not: parsedUserId } },
              { friendId: parsedUserId, userId: { not: parsedUserId } },
            ],
          },
          select: {
            status: true,
          },
        },
      },
    });

    const usersWithFriendshipStatus = users.map((user) => {
      const friendshipStatus =
        user.friendships.length > 0
          ? user.friendships[0].status
          : user.friendOf.length > 0
          ? user.friendOf[0].status
          : "none";

      const { friendships, friendOf, ...userData } = user;

      return {
        ...userData,
        friendshipStatus,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: usersWithFriendshipStatus,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const getFriendList = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = Number(req.query.userId) || req.user?.userId;
    const { username } = req.query;

    if (!userId) {
      return next(new ErrorHandler("User not authenticated", 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
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
                      members: { some: { userId: Number(userId) } },
                    },
                  },
                  include: {
                    chat: { select: { id: true, last_message: true } },
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
                      members: { some: { userId: Number(userId) } },
                    },
                  },
                  include: {
                    chat: { select: { id: true, last_message: true } },
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
          friendshipId: friendship.id,
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
          friendshipId: friendOf.id,
        };
      }),
    ];

    return res.status(200).json({
      success: true,
      message: `Friends fetched successfully for userId: ${userId}`,
      data: friends,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const getUserDetailsById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.query.userId || req.user?.userId;
    if (!userId) {
      return next(new ErrorHandler("User Not Authenticated", 401));
    }

    const user = await prisma.user.findUnique({
      where: {
        id: Number(userId),
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        email: true,
        bio: true,
        friendships: {
          where: {
            status: "accepted",
          },
          select: {
            id: true,
            userId: true,
            friendId: true,
          },
        },
        friendOf: {
          where: {
            status: "accepted",
          },
          select: {
            id: true,
            userId: true,
            friendId: true,
          },
        },
        posts: {
          select: {
            _count: true,
          },
        },
      },
    });

    if (!user) {
      return next(new ErrorHandler("User Not Found", 404));
    }

    const allFriendships = [
      ...user.friendships.map((f) => ({
        id: f.id,
        friendId: f.friendId,
      })),
      ...user.friendOf.map((f) => ({
        id: f.id,
        friendId: f.userId,
      })),
    ];

    return res.status(200).json({
      success: true,
      message: "User Details Fetched Successfully",
      data: {
        ...user,
        friendships: allFriendships,
      },
    });
  } catch (error) {
    console.error(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return next(new ErrorHandler("UserId Not Provided", 404));
    }

    const logoutUser = await prisma.user.updateMany({
      data: { refresh_token: null },
      where: { id: typeof userId === "number" ? userId : Number(userId) },
    });

    if (logoutUser.count === 0) {
      return next(new ErrorHandler("User not found", 404));
    }

    return res
      .status(200)
      .cookie(refresh_token, "", new CookieOptions({ logout: true }))
      .cookie(access_token, "", new CookieOptions({ logout: true }))
      .json({
        success: true,
        message: "Logout Successfully",
      });
  } catch (error) {
    console.error(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const validateAccessTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = req.cookies[access_token];
    if (!accessToken)
      return next(new ErrorHandler("auth Token Not Found", 401));

    return res.status(200).json({
      success: true,
      message: "Token is Valid",
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const getUserPostByUserId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return next(new ErrorHandler("User Not Provided", 404));
    }
    const posts = await prisma.post.findMany({
      where: {
        user_id: parseInt(userId),
      },
      select: {
        id: true,
        content: true,
        description: true,
        createdAt: true,
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                avatarUrl: true,
                username: true,
              },
            },
          },
        },
        likes: {
          select: {
            id: true,
            user: {
              select: {
                username: true,
                id: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    if (posts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Posts Fetched Successfully",
        data: [],
      });
    }
    return res.status(200).json({
      success: true,
      message: "Posts Fetched Successfully",
      data: posts,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

const updateUserData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body;
    const payload = editProfileSchema.parse(body);
    const avatar = req.file;
    const userId = req.user?.userId;

    if (!userId) {
      return next(new ErrorHandler("Unauthorized access", 401));
    }

    const updateData: Record<string, any> = {};

    if (payload.email) updateData.email = String(payload.email);
    if (payload.username) updateData.username = String(payload.username);
    if (payload.bio) updateData.bio = String(payload.bio);

    if (avatar) {
      const prevAvatar = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { avatarUrl: true },
      });

      if (
        prevAvatar?.avatarUrl &&
        prevAvatar.avatarUrl.includes("res.cloudinary.com")
      ) {
        const deleteResult = await cloudinary.uploader.destroy(
          extractImagePublicId(prevAvatar.avatarUrl)
        );
        if (deleteResult.result !== "ok") {
          return next(new ErrorHandler("Error updating Avatar", 400));
        }
      }

      const [newAvatarUrl] = await uploadFilesToCloudinary([avatar]);
      updateData.avatarUrl = String(newAvatarUrl);
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "No changes detected" });
    }

    await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData,
    });

    return res.status(200).json({
      status: true,
      message: "User Data Updated Successfully",
    });
  } catch (error) {
    console.error(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};
const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { current_password, new_password, isGoogleSignedIn } = req.body;
    const userId = req.user?.userId;

    if (!new_password) {
      return next(new ErrorHandler("New Password Not Provided", 400));
    }

    if (!isGoogleSignedIn && !current_password) {
      return next(new ErrorHandler("Current Password Not Provided", 400));
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { password: true },
    });
    if (!user)
      return next(new ErrorHandler("No User Found with Provided Id", 400));

    if (!user.password) {
      const hashedPw = await bcrypt.hash(new_password, 10);
      const updatedUser = await prisma.user.update({
        where: { id: Number(userId) },
        data: { password: hashedPw },
      });
      if (!updatedUser) {
        return next(new ErrorHandler("Error Changing Password", 400));
      }
      return res.status(200).json({
        success: true,
        message: "Password Changed Successfully",
      });
    }

    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return next(new ErrorHandler("Incorrect Current Password", 400));
    }

    if (await bcrypt.compare(new_password, user.password)) {
      return next(
        new ErrorHandler(
          "New password cannot be the same as the current password",
          400
        )
      );
    }

    const newHashPw = await bcrypt.hash(new_password, 10);
    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: { password: newHashPw },
    });
    if (!updatedUser) {
      return next(new ErrorHandler("Error while Changing Password", 400));
    }
    return res.status(200).json({
      success: true,
      message: "Password Changed Successfully",
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Internal Server Error", 500));
  }
};

export {
  getAllUsersController,
  getFriendList,
  getUserDetailsById,
  getUserPostByUserId,
  googleLoginController,
  loginController,
  logoutController,
  refreshAccessTokenController,
  registerController,
  validateAccessTokenController,
  verifyUserController,
  updateUserData,
  changePassword,
  sendResetPasswordMail,
  resetPassword,
};
