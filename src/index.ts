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
// PORT
const PORT = process.env.PORT || 3000;
connectRedis();
const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(cookieParser());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.use("/api/user", authRoutes);
app.use("/api/post", postRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/notification", notificationRoutes);

app.use(errorMiddleware);
app.listen(PORT, () => console.log(`PORT Running ON PORT ${PORT}`));
