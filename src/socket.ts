import { Server } from "socket.io";
import { socketEvents } from "./helpers/constants";
import { socketAuthMiddleware } from "./middlewares/authMiddleware";
import { v4 as uuid } from "uuid";
import { getSockets } from "./helpers/helper";
import Message from "./models/messageSchema";

export const userSocketIDs = new Map();
const onlineUsers = new Set();

const setupSocket = async (io: Server) => {
  try {
    io.use(socketAuthMiddleware);

    // On connection
    io.on("connection", (socket) => {
      const user = socket.data.user;

      if (user) {
        console.log(
          `User connected: ${user.userId} with socket ID: ${socket.id}`
        );

        userSocketIDs.set(user.userId, socket.id);
        onlineUsers.add(user.userId);

        io.emit(socketEvents.JOINED, Array.from(onlineUsers));
      }

      socket.on(
        socketEvents.NEW_MESSAGE,
        async ({
          chatId,
          memberIds,
          message,
        }: {
          chatId: string;
          memberIds: number[];
          message: string;
        }) => {
          try {
            if (!chatId || !memberIds || !message) {
              return console.error("Invalid message payload received");
            }

            const messageForRealTime = {
              content: message,
              id: uuid(),
              sender: {
                id: user.userId,
                username: user.email,
              },
              chatId,
              createdAt: new Date().toISOString(),
            };

            const memberSockets = getSockets({ users: memberIds });

            memberSockets.forEach((memberSocket) => {
              io.to(memberSocket).emit(socketEvents.NEW_MESSAGE, {
                chatId,
                messageForRealTime,
              });
            });

            const filteredMemberSockets = memberSockets.filter(
              (sockets) => sockets !== socket.id
            );

            filteredMemberSockets.forEach((memberSocket) => {
              io.to(memberSocket).emit(socketEvents.NEW_MESSAGE_ALERT, {
                chatId,
                message,
              });
            });

            await Message.create({
              chatId,
              message,
              senderId: user.userId,
            });
          } catch (error: any) {
            console.error(`Error processing new message: ${error.message}`);
          }
        }
      );

      socket.on("disconnect", () => {
        if (user) {
          onlineUsers.delete(user.userId);
          userSocketIDs.delete(user.userId);

          io.emit(socketEvents.EXITED, Array.from(onlineUsers));
          console.log(`User disconnected: ${user.userId}`);
        }
      });
    });
  } catch (error: any) {
    console.error(`Socket setup error: ${error.message}`);
  }
};

export { setupSocket };
