import jwt from "jsonwebtoken";
import { userSocketIDs } from "../socket";
export function generateToken(
  payload: { userId: number; email: string },
  ttl = "30d",
  isRefresh = true
) {
  const token = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: ttl,
  });
  return token;
}

export function getSockets({ users }: { users: number[] }) {
  const sockets = users.map((user: number) => userSocketIDs.get(user));
  return sockets;
}
