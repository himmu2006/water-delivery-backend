import jwt from "jsonwebtoken"; // make sure this path is correct
import userModel from "../models/userModel.js";

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ✅ Fetch the user to get their role
    const user = await userModel.findById(decoded.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    console.error('Token error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

export default authMiddleware;
