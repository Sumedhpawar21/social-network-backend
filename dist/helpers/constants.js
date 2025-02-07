"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookieOptions = exports.socketEvents = exports.access_token = exports.refresh_token = void 0;
exports.refresh_token = "social_refresh_token";
exports.access_token = "social_access_token";
exports.socketEvents = {
    JOINED: "JOINED",
    EXITED: "EXITED",
    NEW_MESSAGE: "NEW_MESSAGE",
    NEW_MESSAGE_ALERT: "NEW_MESSAGE_ALERT",
    STARTED_TYPING: "STARTED_TYPING",
    STOPPED_TYPING: "STOPPED_TYPING",
    MESSAGE_SEEN: "MESSAGE_SEEN",
    CALL_USER: "CALL_USER",
    ANSWER_CALL: "ANSWER_CALL",
    ICE_CANDIDATE: "ICE_CANDIDATE",
    END_CALL: "END_CALL",
    CALL_ACCEPTED: "CALL_ACCEPTED",
    INCOMING_CALL: "INCOMING_CALL",
    CALL_ENDED: "CALL_ENDED",
};
class CookieOptions {
    constructor({ is_refresh, logout = false, }) {
        this.maxAge = logout
            ? 0
            : is_refresh
                ? 30 * 24 * 60 * 60 * 1000
                : 7 * 24 * 60 * 60 * 1000;
        this.sameSite = process.env.NODE_ENV === "production" ? "none" : "lax";
        this.httpOnly = true;
        this.secure = process.env.NODE_ENV === "production";
        this.path = "/";
    }
}
exports.CookieOptions = CookieOptions;
