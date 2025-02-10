import { Router } from "express";
import {
  addFriendController,
  handleFriendRequest,
  getRecommendedFriends,
  unfriendFriend,
} from "../controllers/friend-controller";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.use(authMiddleware);
router.post("/add-friend", addFriendController);
router.post("/handle-friend-request", handleFriendRequest);
router.get("/get-recommended-friends", getRecommendedFriends);
router.delete("/unfriend/:friendshipId", unfriendFriend);

export default router;
