import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import { io, connectedUsers } from '../server.js';

const getSupplierOrders = async (req, res) => {
  try {
    const supplierId = req.user.id;

    // Fetch orders:
    // - unassigned and pending/paid orders (available to all suppliers)
    // - OR orders assigned to THIS supplier only
    // - paymentStatus must be 'paid'
    const orders = await orderModel.find({
      paymentStatus: 'paid',
      $or: [
        { supplierId: null, status: { $in: ['Pending', 'Paid'] } },
        { supplierId: supplierId },
      ],
    }).populate('userId', 'name email');

    res.json({ orders });

  } catch (err) {
    console.error('Error fetching supplier orders:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const respondToOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;

    const order = await orderModel.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only allow respond if order is unassigned or assigned to current supplier
    if (order.supplierId && !order.supplierId.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to respond to this order' });
    }

    // Only respond if status is Pending or Paid (not already accepted/rejected)
    if (!['Pending', 'Paid'].includes(order.status)) {
      return res.status(400).json({ message: 'Order already responded to' });
    }

    if (action === 'accept') {
      order.status = 'Accepted';
      order.supplierId = req.user.id;
      order.rejectionReason = null;
    } else if (action === 'reject') {
      order.status = 'Rejected';
      order.rejectionReason = rejectionReason || 'No reason provided';
      order.supplierId = null; // make sure supplierId stays null on reject
    } else {
      return res.status(400).json({ message: "Invalid action. Use 'accept' or 'reject'." });
    }

    await order.save();

    // Notify user via socket
    const userSocketId = connectedUsers.get(order.userId.toString());
    if (userSocketId) {
      io.to(userSocketId).emit('orderResponse', {
        message: `Your order was ${order.status.toLowerCase()}`,
        order,
      });
    }

    res.json({ message: `Order ${order.status.toLowerCase()} successfully`, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error responding to order', error: err.message });
  }
};

const markOrderDelivered = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order || !order.supplierId.equals(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized or order not found' });
    }

    if (order.status !== 'Accepted') {
      return res.status(400).json({ message: 'Order must be accepted before marking delivered' });
    }

    order.status = 'Delivered';
    await order.save();

    const userSocketId = connectedUsers.get(order.userId.toString());
    if (userSocketId) {
      io.to(userSocketId).emit('orderStatusUpdate', {
        message: 'Your order has been delivered',
        order,
      });
    }

    res.json({ message: 'Order marked as delivered', order });
  } catch (err) {
    res.status(500).json({ message: 'Delivery update error', error: err.message });
  }
};

export {
  getSupplierOrders,
  respondToOrder,
  markOrderDelivered
};
