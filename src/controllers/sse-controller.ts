import { Request, Response } from "express";

export const sseClients: Map<number, Response> = new Map();

export const sendSseNotification = (userId: number, data: any) => {
  const client = sseClients.get(userId);

  if (client) {
    try {
      console.log(`Notification sent to user ${userId}:`, data);
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error(`Failed to send notification to user ${userId}:`, error);
      sseClients.delete(userId);
    }
  } else {
    console.log(`No active SSE connection found for user ${userId}`);
  }
};

export const sseHandler = (req: Request, res: Response) => {
  if (req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const userId = Number(req.query.user_id);

  if (isNaN(userId) || userId <= 0) {
    res.status(400).send("Valid user ID is required for SSE connection");
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-store");
  res.setHeader("Connection", "keep-alive");

  sseClients.set(userId, res);

  console.log(`New SSE connection established for user: ${userId}`);

  res.write(
    `data: ${JSON.stringify({ message: "Connection established" })}\n\n`
  );

  req.on("close", () => {
    console.log(`Client disconnected: ${userId}`);
    sseClients.delete(userId);
    res.end();
  });
};
