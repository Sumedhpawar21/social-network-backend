"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
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
const notification_routes_js_1 = __importDefault(require("./routes/notification-routes.js"));
// PORT
const PORT = process.env.PORT || 3000;
(0, redisConfig_js_1.connectRedis)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({
    origin: ["http://localhost:3000"],
    credentials: true,
}));
app.use((0, morgan_1.default)("dev"));
app.use((0, cookie_parser_1.default)());
app.get("/", (req, res) => {
    res.send("Hello World!");
});
app.use("/api/user", user_routes_js_1.default);
app.use("/api/post", post_routes_js_1.default);
app.use("/api/friends", friend_routes_1.default);
app.use("/api/notification", notification_routes_js_1.default);
app.use(ErrorMiddleware_js_1.errorMiddleware);
app.listen(PORT, () => console.log(`PORT Running ON PORT ${PORT}`));
