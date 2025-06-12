import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import { io, connectedUsers } from '../server.js';

// User creates order & nearest supplier is assigned
function isWithinDistance([lng1, lat1], [lng2, lat2], maxKm) {
  const toRad = (deg) => deg * (Math.PI / 180);
  const R = 6371; // Earth's radius in km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= maxKm;
}

// const createOrder = async (req, res) => {
//   try {
//     const { address, quantity, dateTime, location } = req.body;

//     if (
//       !location ||
//       typeof location.lat !== 'number' ||
//       typeof location.lng !== 'number'
//     ) {
//       return res.status(400).json({ message: "User location (lat, lng) is required and must be numbers" });
//     }

//     // 📌 Use GeoJSON format
//     const geoLocation = {
//       type: 'Point',
//       coordinates: [location.lng, location.lat],
//     };

//     const order = new orderModel({
//       userId: req.user.id,
//       quantity,
//       dateTime: dateTime || Date.now(),
//       location: geoLocation,
//       address,
//       status: "Pending",
//     });

//     await order.save();

//     // 📢 Notify all connected suppliers within 5km
//     for (const [supplierId, socketId] of connectedUsers.entries()) {
//       const supplier = await userModel.findById(supplierId);
//       if (
//         supplier?.role === 'supplier' &&
//         supplier?.location?.coordinates &&
//         isWithinDistance(supplier.location.coordinates, geoLocation.coordinates, 5)
//       ) {
//         io.to(socketId).emit('newOrder', {
//           message: 'New order placed nearby',
//           order,
//         });
//       }
//     }

//     res.status(201).json({ message: "Order placed successfully", order });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };

// User fetches own orders
// User fetches own orders with supplier name populated
const getUserOrders = async (req, res) => {
  try {
    const orders = await orderModel
      .find({ userId: req.user.id })
      .sort({ dateTime: -1 })
      .populate('supplierId', 'name');  // populate supplier's name only

    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching user orders', error: err.message });
  }
};


// User cancels order
const cancelOrder = async (req, res) => {
  try {
    const order = await orderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Check if the logged-in user is the owner
    if (!order.userId.equals(req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to cancel this order' });
    }

    // ❌ Do not allow if already delivered
    if (order.status === 'Delivered') {
      return res.status(400).json({ message: 'Cannot cancel a delivered order' });
    }

    // ❌ Do not allow if payment is done
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Cannot cancel a paid order' });
    }

    // ✅ Update status using findByIdAndUpdate and disable validators
    const updatedOrder = await orderModel.findByIdAndUpdate(
      req.params.id,
      { status: 'Cancelled' },
      { new: true, runValidators: false }
    );

    // ✅ Notify supplier if supplier is assigned
    if (updatedOrder.supplierId) {
      const supplierSocketId = connectedUsers.get(updatedOrder.supplierId.toString());
      if (supplierSocketId) {
        io.to(supplierSocketId).emit('orderCancelled', {
          message: 'An order was cancelled by the user',
          order: updatedOrder,
        });
      }
    }

    res.json({ message: 'Order cancelled successfully', order: updatedOrder });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error cancelling order', error: err.message });
  }
};

// Update payment status after successful payment
const updatePaymentStatus = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "Stripe session ID is required" });
    }

    const order = await orderModel.findOne({ stripeSessionId: sessionId });

    if (!order) {
      return res.status(404).json({ message: "Order not found for given session ID" });
    }

    order.paymentStatus = "paid";
    order.status = "Paid"; // Optional: update main status too if you want
    await order.save();

    res.json({ message: "Payment status updated successfully", order });
  } catch (err) {
    console.eror("Payment update error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

const getUserOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    // Exclude active orders (Pending, Accepted), include rest
    const orders = await orderModel
      .find({
        userId,
        status: { $nin: ['Pending', 'Accepted'] }
      })
      .sort({ updatedAt: -1 })
      .populate('supplierId', 'name');

    res.json({ orders });
  } catch (err) {
    console.error('Error fetching user order history:', err);
    res.status(500).json({ message: 'Error fetching order history', error: err.message });
  }
};

export { getUserOrders, cancelOrder, updatePaymentStatus, getUserOrderHistory };

// At the bottom of orderController.js (after all exports)
orderModel.watch().on('change', async (change) => {
  if (change.operationType === 'insert') {
    const order = change.fullDocument;
    const user = await userModel.findById(order.userId);
    const location = user?.location;

    if (!location) return; // no user location, can't check distance

    for (const [supplierId, socketId] of connectedUsers.entries()) {
      const supplier = await userModel.findById(supplierId);
      if (
        supplier?.role === 'supplier' &&
        supplier?.location?.coordinates &&
        isWithinDistance(supplier.location.coordinates, location.coordinates, 5)
      ) {
        io.to(socketId).emit('newOrder', {
          message: 'New order placed nearby',
          order,
        });
      }
    }
  }
});

