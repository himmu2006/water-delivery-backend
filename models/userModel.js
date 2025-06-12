import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'supplier', 'admin'], default: 'user' },
  resetToken: String,
  resetTokenExpire: Date,
  createdAt: { type: Date, default: Date.now },

  // Location as GeoJSON Point (only for suppliers)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  }
});

// Add geospatial index on location for supplier queries
userSchema.index({ location: "2dsphere" });

const userModel = mongoose.models.user || mongoose.model("User", userSchema);
export default userModel;
