import { CookieOptions as ExpressCookieOptions } from "express";
export const refresh_token = "social_refresh_token";
export const access_token = "social_access_token";

export const socketEvents = {
  JOINED: "JOINED",
  EXITED: "EXITED",
  NEW_MESSAGE: "NEW_MESSAGE",
  MAP_MESSAGE: "MAP_MESSAGE",
  FAIL_MESSAGE: "FAIL_MESSAGE",
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

export const frontend_urls = {
  development: process.env.DEV_FRONTEND_URL,
  production: process.env.PROD_FRONTEND_URL,
};

export class CookieOptions implements ExpressCookieOptions {
  maxAge!: number;
  sameSite!: "none" | "lax" | "strict";
  httpOnly!: boolean;
  secure!: boolean;
  domain?: string;
  partitioned?: boolean;

  constructor({
    is_refresh,
    logout = false,
  }: {
    is_refresh?: boolean;
    logout?: boolean;
  } = {}) {
    this.maxAge = logout
      ? 0
      : is_refresh
      ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

    this.sameSite = process.env.NODE_ENV === "production" ? "none" : "lax";
    this.httpOnly = true;
    this.secure = process.env.NODE_ENV === "production";
    this.domain =
      process.env.NODE_ENV === "production"
        ? process.env.COOKIE_DOMAIN
        : undefined;

  }
}
