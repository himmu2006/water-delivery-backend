import express from "express";
import authMiddleware from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';
import {
  getUserOrders,
  cancelOrder,
  updatePaymentStatus,
  getUserOrderHistory
} from '../controllers/orderController.js';

const orderRouter = express.Router();

orderRouter.use(authMiddleware);

// User Routes Only
orderRouter.get('/', roleMiddleware(['user']), getUserOrders);
orderRouter.delete('/:id', roleMiddleware(['user']), cancelOrder);
orderRouter.get('/history', roleMiddleware(['user']), getUserOrderHistory);
orderRouter.post('/update-payment', roleMiddleware(['user']), updatePaymentStatus);

// ❌ Removed PATCH route (redundant or incorrect)
// orderRouter.patch('/:id', roleMiddleware(['user']), cancelOrder);

export default orderRouter;
