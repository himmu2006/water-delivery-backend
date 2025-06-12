import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";

const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await userModel.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getOrderStats = async (req, res) => {
  try {
    const count = await orderModel.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daily = await orderModel.countDocuments({ createdAt: { $gte: today } });
    res.json({ total: count, today: daily });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await orderModel.find()
      .populate('userId', 'name email') // Only get name and email of user
      .populate('supplierId', 'name email'); // Optional: include supplier name/email if needed

    res.json(orders);
  } catch (err) {
    console.error('Error in getAllOrders:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export {
  getAllUsers,
  deleteUser,
  getOrderStats,
  getAllOrders
};
