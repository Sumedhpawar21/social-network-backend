import { Request, Response } from "express";

const sseClients: Map<number, Response> = new Map();

export const sendSseNotification = (userId: number, data: any) => {
  const client = sseClients.get(userId);

  if (client) {
    console.log(`Notification sent to ${userId}`, data);

    client.write(`data: ${JSON.stringify(data)}\n\n`);
  } else {
    console.log(`No client found for user ${userId}`);
  }
};

export const sseHandler = (req: Request, res: Response) => {
  const userId = Number(req.query.user_id);

  if (!userId) {
    res.status(400).send("User ID is required for SSE connection");
    return;
  }

  if (sseClients.has(userId)) {
    // Close the existing connection
    const existingClient = sseClients.get(userId);
    if (existingClient) existingClient.end();
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  sseClients.set(userId, res);

  req.on("close", () => {
    console.log(`Client disconnected: ${userId}`);
    sseClients.delete(userId);
    res.end();
  });
};
