import express from "express";
import { login, signup, changePassword } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js'; // ✅ ensure path is correct

const authRouter = express.Router();

// 🔐 Public routes
authRouter.post('/signup', signup);
authRouter.post('/login', login);

// 🔐 Protected routes (require auth token)
authRouter.get('/', authMiddleware, (req, res) => {
  res.status(200).json(req.user); // Get current user info
});

authRouter.post('/change-password', authMiddleware, changePassword); // ✅ Change password route

export default authRouter;
