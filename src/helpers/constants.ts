export const refresh_token = "social_refresh_token";
export const access_token = "social_access_token";



export const socketEvents = {
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

export class CookieOptions {
  maxAge: number;
  sameSite: "none" | "lax" | "strict";
  httpOnly: boolean;
  secure: boolean;

  constructor({ is_refresh }: { is_refresh: boolean }) {
    this.maxAge = is_refresh
      ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000; // milliseconds
    this.sameSite = process.env.NODE_ENV === "production" ? "none" : "lax";
    this.httpOnly = true;
    this.secure = process.env.NODE_ENV === "production";
  }
}
