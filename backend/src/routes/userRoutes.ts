import express from "express";
import {container} from "tsyringe"
import UserAuthController from "../controllers/userAuthController";
import { authMiddleware } from "../middleware/authMiddleware";
import { User } from "../models/userModels";

const user = express.Router();

const userAuthController = container.resolve(UserAuthController)

user.post("/register",userAuthController.register);
user.post("/verify-otp",userAuthController.verifyOtp);
user.post("/resend-otp",userAuthController.resendOtp);
user.post("/login",userAuthController.login);
user.post("/refresh-token",userAuthController.refreshToken);
user.post("/forgot-password",userAuthController.forgotPassword)
user.post("/reset-password/:token",userAuthController.resetPassword);

user.get("/users-list",authMiddleware,userAuthController.getUsers);
user.put("/profile", authMiddleware, userAuthController.updateProfile);
user.post("/logout", userAuthController.logout);
user.get("/check", authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const currentUser = await User.findById(userId).select("-password");

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      user: currentUser,
    });
  } catch (error) {
    return next(error);
  }
});

export default user;