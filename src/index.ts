import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import { createServer, Server as httpServer } from "http";
import morgan from "morgan";
import { Server } from "socket.io";
import { connectDb } from "./config/dbConfig.js";

import { errorMiddleware } from "./middlewares/ErrorMiddleware.js";
import chatRoutes from "./routes/chat-routes.js";
import friendRoutes from "./routes/friend-routes";
import notificationRoutes from "./routes/notification-routes.js";
import postRoutes from "./routes/post-routes.js";
import authRoutes from "./routes/user-routes.js";
import storyRoutes from "./routes/story-routes.js";
import { setupSocket } from "./socket.js";
import { frontend_urls } from "./helpers/constants.js";
import { ShutDown } from "./utils/gracefullShutdown.js";

// PORT
const PORT = process.env.PORT || 3000;
connectDb();

const app: Application = express();
const server: httpServer = createServer(app);

const io = new Server(server, {
  cors: {
    origin: [frontend_urls.development!, frontend_urls.production!],
    credentials: true,
  },
});
app.set("io", io);
setupSocket(io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [frontend_urls.development!, frontend_urls.production!],
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
        frontend_urls.development!,
        frontend_urls.production!,
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
app.use("/api/story", storyRoutes);

app.use(errorMiddleware);
server.listen(PORT, () => console.log(`PORT Running ON PORT ${PORT}`));

process.on("SIGTERM", () => ShutDown(server, io));
process.on("SIGINT", () => ShutDown(server, io));
