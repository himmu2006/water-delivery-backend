import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import authRouter from "./routes/authRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import supplierRouter from "./routes/supplierRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import forgotResetRoutes from './routes/forgotResetRoutes.js';
import paymentRouter from "./routes/paymentRoutes.js";
import webhookRouter from "./routes/webhookRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Set up socket.io
const io = new Server(server, {
  cors: {
    origin: "https://water-delivery-frontend-d02t.onrender.com",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Store connected users
const connectedUsers = new Map();

// Stripe webhook (raw body parser required for Stripe)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookRouter);

// Parse JSON for other routes
app.use(express.json());

// CORS setup
app.use(cors({
  origin: "https://water-delivery-frontend-d02t.onrender.com",
  credentials: true,
}));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/orders', orderRouter);
app.use('/api/suppliers', supplierRouter);
app.use('/api/admin', adminRouter);
app.use('/api', forgotResetRoutes);
app.use('/api/payments', paymentRouter);

// Socket authentication
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error: Token missing'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    console.log('Socket authentication failed:', err.message);
    next(new Error('Authentication error: Invalid token'));
  }
});

// Socket connection
io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`✅ User connected: ${userId} with socket ${socket.id}`);
  connectedUsers.set(userId, socket.id);

  // Optional: allow room join for private events
  socket.on('join-user', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their private room.`);
  });

  socket.on('disconnect', () => {
    for (const [uid, sid] of connectedUsers.entries()) {
      if (sid === socket.id) {
        connectedUsers.delete(uid);
        console.log(`❌ User disconnected: ${uid}`);
        break;
      }
    }
  });
});

// Export io and connectedUsers for use in controllers
export { io, connectedUsers };

// MongoDB + Server Startup
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('📦 MongoDB connected');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
