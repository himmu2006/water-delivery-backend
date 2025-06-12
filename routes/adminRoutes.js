import { deleteUser, getAllOrders, getAllUsers, getOrderStats } from '../controllers/adminController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';
import express from "express";
const adminRouter = express.Router();

adminRouter.use(authMiddleware);
adminRouter.use(roleMiddleware(['admin']));

adminRouter.get('/users', getAllUsers);
adminRouter.delete('/user/:id', deleteUser);
adminRouter.get('/stats', getOrderStats);
adminRouter.get('/orders', getAllOrders); // ✅ fetch all orders for admin

export default adminRouter;