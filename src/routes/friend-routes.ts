import { Router } from "express";
import {
  addFriendController,
  handleFriendRequest,
  getRecommendedFriends,
} from "../controllers/friend-controller";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.use(authMiddleware);
router.post("/add-friend", addFriendController);
router.post("/handle-friend-request", handleFriendRequest);
router.get('/get-recommended-friends',getRecommendedFriends)

export default router;
