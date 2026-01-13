import { Server } from "socket.io";
import prisma from "../config/dbConfig";

export const ShutDown = async (server: any, io: Server) => {
  try {
    console.log("Shutting down gracefully...");
    server.close(() => {
      console.log("HTTP server closed");
    });
    io.close(() => console.log("Socket.io closed"));

    await prisma.$disconnect();
    console.log("Prisma disconnected");

    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown", err);
    process.exit(1);
  }
};
