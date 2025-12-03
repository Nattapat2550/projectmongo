// backend/models/homepage.js (CommonJS)
const mongoose = require('mongoose');

const { Schema } = mongoose;

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
    _id: true,
  }
);

const homepageSchema = new Schema(
  {
    body: { type: String, default: '' },
    carousel: { type: [carouselItemSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

const Homepage =
  mongoose.models.Homepage || mongoose.model('Homepage', homepageSchema);

module.exports = Homepage;
