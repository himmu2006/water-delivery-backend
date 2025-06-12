import express from "express";
import authMiddleware from '../middleware/authMiddleware.js';
import roleMiddleware from '../middleware/roleMiddleware.js';
import {
  getSupplierOrders,
  respondToOrder,
  markOrderDelivered
} from '../controllers/supplierController.js'; // handles SUPPLIER operations only

const supplierRouter = express.Router();

supplierRouter.use(authMiddleware);
supplierRouter.use(roleMiddleware(['supplier']));

// Supplier Routes Only
supplierRouter.get('/orders', getSupplierOrders);
supplierRouter.post('/respond/:id', respondToOrder);
supplierRouter.put('/deliver/:id', markOrderDelivered);

export default supplierRouter;
