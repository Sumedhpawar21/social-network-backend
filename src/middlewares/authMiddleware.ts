import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { token_name } from "../helpers/constants";
import { ErrorHandler } from "../utils/ErrorClass";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return next(
      new ErrorHandler("Authentication token is missing or invalid", 401)
    );
  }

  const token = authHeader.split(" ")[1];

  try {
    const decodedData = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    if (!decodedData) {
      return next(new ErrorHandler("Invalid Token", 401));
    }

    const { userId, email } = decodedData;
    req.user = {
      email,
      userId,
    };
    next();
  } catch (error) {
    return next(new ErrorHandler("Invalid Token", 401));
  }
};
