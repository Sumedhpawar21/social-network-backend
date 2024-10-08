import { Router } from "express";
import { getNotification } from "../controllers/notification-controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { sseHandler } from "../controllers/sse-controller";

const router: Router = Router();
router.get("/sse", sseHandler);
router.use(authMiddleware);
router.get("/get-notification", getNotification);

export default router;
