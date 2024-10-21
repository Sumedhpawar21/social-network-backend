import { Router } from "express";
import { getMessageByChatId } from "../controllers/chat-controller";

const router = Router();

router.get("/get-messages", getMessageByChatId);

export default router;
