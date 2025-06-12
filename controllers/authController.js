// controllers/authController.js

import userModel from '../models/userModel.js';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ✅ Signup Controller
const signup = async (req, res) => {
  try {
    const { name, email, password, role, location } = req.body;

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new userModel({
      name,
      email,
      password: hashedPassword,
      role,
      location
    });

    await user.save();
    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// ✅ Login Controller
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role !== role) {
      return res.status(403).json({ message: `Access denied for ${role} login` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res.status(200).json({
      token,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    res.status(500).json({ message: 'Login error', error: err.message });
  }
};

// ✅ Change Password Controller
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user._id;

  try {
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;

    await user.save();
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export { signup, login, changePassword };
