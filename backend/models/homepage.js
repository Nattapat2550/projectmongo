import mongoose from 'mongoose';

const CarouselItemSchema = new mongoose.Schema({
  index: { type: Number, default: 0 },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '/images/user.png' },
  active: { type: Boolean, default: true }
}, { _id: true, timestamps: true });

const HomepageSchema = new mongoose.Schema({
  body: { type: String, default: '' },
  carousel: { type: [CarouselItemSchema], default: [] }
}, { timestamps: true });

export default mongoose.model('Homepage', HomepageSchema);
