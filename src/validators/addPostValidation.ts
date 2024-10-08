import { Request } from "express";
import { z } from "zod";

const ACCEPTED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/mpeg",
];

export const addPostSchema = z.object({
  description: z.string({ message: "description is required" }).optional(),
});

export const validateRequest = (req: Request) => {
  try {
    const body = addPostSchema.parse(req.body);

    const file = req.file;

    if (file && !ACCEPTED_FILE_TYPES.includes(file.mimetype)) {
      throw new Error("File type Not Supported");
    }

    return { body, file };
  } catch (error) {
    console.log(error);

    throw error;
  }
};
