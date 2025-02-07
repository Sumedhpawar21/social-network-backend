"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const redisConfig_js_1 = require("./config/redisConfig.js");
const ErrorMiddleware_js_1 = require("./middlewares/ErrorMiddleware.js");
const friend_routes_1 = __importDefault(require("./routes/friend-routes"));
const post_routes_js_1 = __importDefault(require("./routes/post-routes.js"));
const user_routes_js_1 = __importDefault(require("./routes/user-routes.js"));
const notification_routes_js_1 = __importDefault(
  require("./routes/notification-routes.js")
);
const chat_routes_js_1 = __importDefault(require("./routes/chat-routes.js"));
const dbConfig_js_1 = require("./config/dbConfig.js");
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const socket_js_1 = require("./socket.js");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const node_cron_1 = __importDefault(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
const friendRequestQueue_js_1 = require("./queues/friendRequestQueue.js");
// PORT
const PORT = process.env.PORT || 3000;
(0, dbConfig_js_1.connectDb)();
(0, redisConfig_js_1.connectRedis)();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://soccial-nettwork.vercel.app",
      "http://localhost:5173",
      "https://6fc0-103-203-230-55.ngrok-free.app",
      "https://social-nettwork-frontend.vercel.app",
    ],
    credentials: true,
  },
});
app.set("io", io);
(0, socket_js_1.setupSocket)(io);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(
  (0, cors_1.default)({
    origin: [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://soccial-nettwork.vercel.app",
      "https://social-nettwork-frontend.vercel.app",
    ],
    credentials: true,
  })
);
app.use((0, morgan_1.default)("dev"));
app.use((0, cookie_parser_1.default)());
app.use(
  helmet_1.default.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'",
        "http://localhost:8080",
        "https://social-nettwork-frontend.vercel.app",
        "https://soccial-nettwork.vercel.app",
      ],
    },
  })
);
app.use(
  (0, compression_1.default)({
    filter: (req, res) => {
      if (req.path === "/sse") return false;
      return compression_1.default.filter(req, res);
    },
  })
);
app.get("/", (req, res) => {
  res.send("Hello World!");
});
app.use("/api/user", user_routes_js_1.default);
app.use("/api/notification", notification_routes_js_1.default);
app.use("/api/post", post_routes_js_1.default);
app.use("/api/friends", friend_routes_1.default);
app.use("/api/chat", chat_routes_js_1.default);
app.get("/send", async (req, res) => {
  const { id } = req.query;
  await friendRequestQueue_js_1.NotificationQueue.add(
    "sendFriendRequestNotification",
    {
      userId: 1,
      friendId: 2,
      friendshipId: 18,
      notificationType: "FriendRequestAccepted",
    }
  );
  // const userId = Number(id);
  // if (isNaN(userId)) {
  //   return res.status(400).send("Invalid or missing user ID");
  // }
  // sendSseNotification(userId, "WORKING!");
  res.status(200).send("Message sent successfully");
});
node_cron_1.default.schedule("*/10 * * * *", async () => {
  try {
    await axios_1.default.get(
      "https://social-network-backend-5rrl.onrender.com"
    );
    console.log("Server is up and running");
  } catch (error) {
    console.error("Error pinging server:", error.message);
  }
});
app.use(ErrorMiddleware_js_1.errorMiddleware);
server.listen(PORT, () => console.log(`PORT Running ON PORT ${PORT}`));
