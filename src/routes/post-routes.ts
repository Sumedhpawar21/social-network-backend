import { Router } from "express";
import { singlePost } from "../config/multerConfig";
import {
  addPostController,
  getPostsController,
  likePostController,
  addCommentController,
} from "../controllers/post-controller";
import { authMiddleware } from "../middlewares/authMiddleware";
const router = Router();
router.use(authMiddleware);
router.post("/add-post", singlePost, addPostController);
router.get("/get-post", getPostsController);
router.post("/like-post", likePostController);
router.post("/add-comment", addCommentController);

export default router;
