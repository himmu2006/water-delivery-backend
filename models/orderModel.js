import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userEmail: { type: String },

  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quantity: { type: Number, required: true },
  dateTime: { type: Date, default: Date.now },

  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },

  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Delivered', 'Cancelled', 'Paid'],
    default: 'Pending'
  },

  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'failed'],
    default: 'unpaid'
  },

  stripeSessionId: { type: String, unique: true, sparse: true },
  stripePaymentIntentId: { type: String},

  rejectionReason: { type: String },
  deliveredBy: { type: String }
}, { timestamps: true });

orderSchema.index({ location: '2dsphere' });

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);
export default orderModel;