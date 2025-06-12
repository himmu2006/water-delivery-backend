import nodemailer from 'nodemailer';
import dotenv from "dotenv";
dotenv.config();

const sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `Daily Water Delivery <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent:", info.response);
  } catch (err) {
    console.error("Email error:", err);
    throw err;
  }
};

export default sendEmail;
