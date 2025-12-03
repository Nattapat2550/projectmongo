// backend/models/homepage.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

// ตัวหนึ่งใน carousel
const carouselItemSchema = new Schema(
  {
    index: { type: Number, default: 0 },
    title: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  {
    _id: true, // ให้มี _id สำหรับใช้ homepage.carousel.id(...)
  }
);

// หน้า homepage หลัก
const homepageSchema = new Schema(
  {
    body: { type: String, default: '' },          // เนื้อหาใหญ่บนหน้า Home
    carousel: { type: [carouselItemSchema], default: [] }, // สไลด์ทั้งหมด
  },
  {
    timestamps: true,
  }
);

// กัน error OverwriteModelError เวลา hot-reload / deploy ซ้ำ
const Homepage =
  mongoose.models.Homepage || mongoose.model('Homepage', homepageSchema);

export default Homepage;
