    import express from "express";
    import crypto from "crypto";
    import bcrypt from "bcrypt";
    import User from "../models/userModel.js";  // your schema
    import sendEmail from "../utils/sendEmail.js"; // your nodemailer helper

    const router = express.Router();

    // FORGOT PASSWORD - send reset token to email
    router.post("/forgot-password", async (req, res) => {
    console.log("Forgot-password route called");
    try {
      const { email } = req.body;
      console.log("Request body:", req.body);
      if (!email) return res.status(400).json({ message: "Email is required" });

      const user = await User.findOne({ email });
      console.log("User found:", user);
      if (!user)
        return res
          .status(200)
          .json({ message: "If this email exists, a reset link has been sent" });

      const token = crypto.randomBytes(20).toString("hex");

      user.resetToken = token;
      user.resetTokenExpire = Date.now() + 3600000; // 1 hour from now
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}?role=${user.role}`;
      console.log("Reset URL:", resetUrl);

      const message = `
        <p>You requested a password reset.</p>
        <p>Click this <a href="${resetUrl}">link</a> to set a new password. This link is valid for 1 hour.</p>
      `;

      await sendEmail(user.email, "Password Reset Request", message);

      res.status(200).json({ message: "Reset link sent to email if exists" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });


    // RESET PASSWORD - set new password using token
    router.post("/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password, confirmPassword, role } = req.body;  // get role from body

      if (!password || !confirmPassword)
        return res.status(400).json({ message: "All fields are required" });

      if (password !== confirmPassword)
        return res.status(400).json({ message: "Passwords do not match" });

      const user = await User.findOne({
        resetToken: token,
        resetTokenExpire: { $gt: Date.now() },
      });

      if (!user)
        return res.status(400).json({ message: "Invalid or expired token" });

      // Verify role matches
      if (user.role !== role)
        return res.status(403).json({ message: "Role mismatch. Unauthorized." });

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Clear reset token fields
      user.resetToken = undefined;
      user.resetTokenExpire = undefined;

      await user.save();

      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  });


    export default router;