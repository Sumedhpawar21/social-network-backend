"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDb = void 0;
const client_1 = require("@prisma/client");
const mongoose_1 = __importDefault(require("mongoose"));
const prisma = new client_1.PrismaClient({
    log: ["query", "error"],
});
const connectDb = async () => {
    try {
        const db = await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log("Connected to the database", db.connection.host, db.connection.name);
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
};
exports.connectDb = connectDb;
exports.default = prisma;
