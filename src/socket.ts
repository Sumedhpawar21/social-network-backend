import { Server } from "socket.io";
import { socketEvents } from "./helpers/constants";
import { socketAuthMiddleware } from "./middlewares/authMiddleware";

export const userSocketIDs = new Map();
const onlineUsers = new Set();
const setupSocket = async (io: Server) => {
  try {
    io.use(socketAuthMiddleware);
    io.on("connection", (socket) => {
      const user = socket.data.user;

      if (user) {
        console.log(
          `User connected: ${user.userId} with socket ID: ${socket.id}`
        );
        userSocketIDs.set(user.userId, socket.id);
        onlineUsers.add(user.userId);
      }
      io.emit(socketEvents.JOINED, Array.from(onlineUsers));
      socket.on(socketEvents.NEW_MESSAGE, (data) => {});
      socket.on("disconnect", () => {
        if (user) {
          onlineUsers.delete(user.userId);

          io.emit(socketEvents.EXITED, Array.from(onlineUsers));
        }
      });
    });
  } catch (error) {
    console.log(error);
  }
};

export { setupSocket };
