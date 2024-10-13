import { PrismaClient } from "@prisma/client";
import mongoose from "mongoose";

const prisma = new PrismaClient({
  log: ["query", "error"],
});

export const connectDb = async () => {
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI!);
    console.log(
      "Connected to the database",
      db.connection.host,
      db.connection.name
    );
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export default prisma;
