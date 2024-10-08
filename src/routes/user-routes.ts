import { Router } from "express";
import {
  registerController,
  verifyUserController,
  loginController,
  refreshAccessTokenController,
  googleLoginController,
  getAllUsersController,
} from "../controllers/user-controller.js";
import { singleAvatar } from "../config/multerConfig.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
const router = Router();

router.post("/register", singleAvatar, registerController);
router.post("/verify", verifyUserController);
router.post("/login", loginController);
router.post("/login-with-google", googleLoginController);
router.get("/refresh-token", refreshAccessTokenController);
router.use(authMiddleware);
router.get("/all-users", getAllUsersController);
export default router;
