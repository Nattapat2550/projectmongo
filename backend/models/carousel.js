const mongoose = require('../config/db');

const { Schema } = mongoose;

const carouselItemSchema = new Schema(
  {
    item_index: { type: Number, default: 0 },
    title: { type: String },
    subtitle: { type: String },
    description: { type: String },
    image_dataurl: { type: String },
  },
  {
    timestamps: true,
  }
);

const CarouselItem =
  mongoose.models.CarouselItem || mongoose.model('CarouselItem', carouselItemSchema);

function normalizeItem(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

async function listCarouselItems() {
  const items = await CarouselItem.find().sort({ item_index: 1, _id: 1 });
  return items.map(normalizeItem);
}

async function createCarouselItem({ itemIndex, title, subtitle, description, imageDataUrl }) {
  const created = await CarouselItem.create({
    item_index: itemIndex != null ? itemIndex : 0,
    title: title || '',
    subtitle: subtitle || '',
    description: description || '',
    image_dataurl: imageDataUrl || '',
  });
  return normalizeItem(created);
}

async function updateCarouselItem(id, { itemIndex, title, subtitle, description, imageDataUrl }) {
  const update = {};
  if (itemIndex !== undefined) update.item_index = itemIndex;
  if (title !== undefined) update.title = title;
  if (subtitle !== undefined) update.subtitle = subtitle;
  if (description !== undefined) update.description = description;
  if (imageDataUrl !== undefined) update.image_dataurl = imageDataUrl;

  const updated = await CarouselItem.findByIdAndUpdate(id, update, { new: true });
  return normalizeItem(updated);
}

async function deleteCarouselItem(id) {
  await CarouselItem.findByIdAndDelete(id);
}

module.exports = {
  listCarouselItems,
  createCarouselItem,
  updateCarouselItem,
  deleteCarouselItem,
};
