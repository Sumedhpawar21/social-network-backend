"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.addPostSchema = void 0;
const zod_1 = require("zod");
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
exports.addPostSchema = zod_1.z.object({
    description: zod_1.z.string({ message: "description is required" }).optional(),
});
const validateRequest = (req) => {
    try {
        const body = exports.addPostSchema.parse(req.body);
        const file = req.file;
        if (file && !ACCEPTED_FILE_TYPES.includes(file.mimetype)) {
            throw new Error("File type Not Supported");
        }
        return { body, file };
    }
    catch (error) {
        console.log(error);
        throw error;
    }
};
exports.validateRequest = validateRequest;
