import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express, { Application, Request, Response } from "express";
import morgan from "morgan";
import { connectRedis } from "./config/redisConfig.js";
import { errorMiddleware } from "./middlewares/ErrorMiddleware.js";
import friendRoutes from "./routes/friend-routes";
import postRoutes from "./routes/post-routes.js";
import authRoutes from "./routes/user-routes.js";
import notificationRoutes from "./routes/notification-routes.js";
import chatRoutes from "./routes/chat-routes.js";
import { connectDb } from "./config/dbConfig.js";
import { createServer, Server as httpServer } from "http";
import { Server } from "socket.io";
import { setupSocket } from "./socket.js";
import helmet from "helmet";
import compression from "compression";
import cron from "node-cron";
import axios from "axios";
import { sendSseNotification } from "./controllers/sse-controller.js";
import { NotificationQueue } from "./queues/friendRequestQueue.js";

// PORT
const PORT = process.env.PORT || 3000;
connectDb();
connectRedis();
const app: Application = express();
const server: httpServer = createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://social-nettwork-frontend.vercel.app",
    ],
    credentials: true,
  },
});
app.set("io", io);
setupSocket(io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://social-nettwork-frontend.vercel.app",
    ],
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(cookieParser());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "http://localhost:8080",
        "https://social-nettwork-frontend.vercel.app",
      ],
    },
  })
);
app.use(
  compression({
    filter: (req, res) => {
      if (req.path === "/sse") return false;
      return compression.filter(req, res);
    },
  })
);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.use("/api/user", authRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/post", postRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/chat", chatRoutes);

app.get("/send", async (req, res) => {
  const { id } = req.query;
  await NotificationQueue.add("sendFriendRequestNotification", {
    userId: 1,
    friendId: 2,
    friendshipId: 18,
    notificationType: "FriendRequestAccepted",
  });
  // const userId = Number(id);
  // if (isNaN(userId)) {
  //   return res.status(400).send("Invalid or missing user ID");
  // }

  // sendSseNotification(userId, "WORKING!");
  res.status(200).send("Message sent successfully");
});

cron.schedule("*/10 * * * *", async () => {
  try {
    await axios.get("https://social-network-backend-5rrl.onrender.com");
    console.log("Server is up and running");
  } catch (error: any) {
    console.error("Error pinging server:", error.message);
  }
});

app.use(errorMiddleware);
server.listen(PORT, () => console.log(`PORT Running ON PORT ${PORT}`));
