import express from "express";
import {container} from "tsyringe"
import UserAuthController from "../controllers/userAuthController";
import { authMiddleware } from "../middleware/authMiddleware";

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
user.post("/logout", userAuthController.logout);
user.get("/check", authMiddleware, (req, res) => {
  console.log("COOKIE:", req.cookies);
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default user;