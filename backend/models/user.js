const mongoose = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const { Schema } = mongoose;

// ===== Schemas & Models =====

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String },
    password_hash: { type: String },
    role: { type: String, default: 'user' },
    profile_picture_url: { type: String },
    is_email_verified: { type: Boolean, default: false },
    oauth_provider: { type: String },
    oauth_id: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

const verificationCodeSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  code: { type: String, required: true },
  expires_at: { type: Date, required: true },
});

const passwordResetTokenSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, index: true },
  expires_at: { type: Date, required: true },
  is_used: { type: Boolean, default: false, index: true },
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const VerificationCode =
  mongoose.models.VerificationCode || mongoose.model('VerificationCode', verificationCodeSchema);
const PasswordResetToken =
  mongoose.models.PasswordResetToken ||
  mongoose.model('PasswordResetToken', passwordResetTokenSchema);

// ===== Helpers =====

function normalizeUser(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  return obj;
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ===== User Core =====

async function createUserByEmail(email) {
  // เดิมเป็น INSERT ... ON CONFLICT(email) DO UPDATE ...
  const user = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, is_email_verified: false } },
    { new: true, upsert: true }
  );
  return normalizeUser(user);
}

async function findUserByEmail(email) {
  const user = await User.findOne({ email });
  return normalizeUser(user);
}

async function findUserById(id) {
  if (!id) return null;
  const user = await User.findById(id);
  return normalizeUser(user);
}

async function findUserByOAuth(provider, oauthId) {
  const user = await User.findOne({ oauth_provider: provider, oauth_id: oauthId });
  return normalizeUser(user);
}

async function markEmailVerified(userId) {
  const user = await User.findByIdAndUpdate(
    userId,
    { is_email_verified: true },
    { new: true }
  );
  return normalizeUser(user);
}

async function setUsernameAndPassword(email, username, password) {
  const user = await User.findOne({ email, is_email_verified: true });
  if (!user) return null;

  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  user.username = username;
  user.password_hash = hash;
  await user.save();

  return normalizeUser(user);
}

async function updateProfile(userId, { username, profilePictureUrl }) {
  const update = {};
  if (username !== undefined) update.username = username;
  if (profilePictureUrl !== undefined) update.profile_picture_url = profilePictureUrl;

  const user = await User.findByIdAndUpdate(userId, update, { new: true });
  return normalizeUser(user);
}

async function deleteUser(userId) {
  await User.findByIdAndDelete(userId);
}

// สำหรับฝั่ง admin ใช้แก้ไข user
async function adminUpdateUser(id, { username, email, role, profile_picture_url }) {
  const update = {};
  if (username !== undefined) update.username = username;
  if (email !== undefined) update.email = email;
  if (role !== undefined) update.role = role;
  if (profile_picture_url !== undefined) update.profile_picture_url = profile_picture_url;

  try {
    const user = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    return normalizeUser(user);
  } catch (err) {
    // duplicate key (email ซ้ำ)
    if (err && err.code === 11000) {
      const dup = new Error('Duplicate value');
      dup.code = 'DUPLICATE';
      throw dup;
    }
    throw err;
  }
}

async function getAllUsers() {
  const users = await User.find(
    {},
    'username email role profile_picture_url is_email_verified created_at updated_at'
  ).sort({ _id: 1 });

  return users.map((u) => {
    const obj = u.toObject();
    obj.id = obj._id.toString();
    delete obj._id;
    delete obj.__v;
    return obj;
  });
}

// ===== Verification Codes =====

async function storeVerificationCode(userId, code, expiresAt) {
  // มีได้แค่ 1 code ต่อ user
  await VerificationCode.deleteMany({ user_id: userId });

  const rec = await VerificationCode.create({
    user_id: userId,
    code,
    expires_at: expiresAt,
  });

  return rec.toObject();
}

async function validateAndConsumeCode(email, code) {
  const user = await User.findOne({ email });
  if (!user) return { ok: false, reason: 'no_user' };

  const now = new Date();
  const rec = await VerificationCode.findOne({
    user_id: user._id,
    code,
    expires_at: { $gt: now },
  });

  if (!rec) return { ok: false, reason: 'invalid_or_expired' };

  await VerificationCode.deleteOne({ _id: rec._id });
  await markEmailVerified(user._id);

  return { ok: true, userId: user._id.toString() };
}

// ===== OAuth Users =====

async function setOAuthUser({ email, provider, oauthId, pictureUrl, name }) {
  // 1) มีผู้ใช้ที่ผูก OAuth นี้อยู่แล้ว
  let user = await User.findOne({ oauth_provider: provider, oauth_id: oauthId });
  if (user) return normalizeUser(user);

  // 2) มีผู้ใช้ที่ email นี้อยู่แล้ว -> ผูก OAuth เพิ่ม
  user = await User.findOne({ email });
  if (user) {
    user.oauth_provider = provider;
    user.oauth_id = oauthId;
    user.is_email_verified = true;
    if (pictureUrl) {
      user.profile_picture_url = user.profile_picture_url || pictureUrl;
    }
    if (!user.username && email) {
      user.username = email.split('@')[0];
    }
    await user.save();
    return normalizeUser(user);
  }

  // 3) ไม่เคยมี user มาก่อน -> สร้างใหม่
  const username = email ? email.split('@')[0] : undefined;
  user = await User.create({
    email,
    oauth_provider: provider,
    oauth_id: oauthId,
    is_email_verified: true,
    profile_picture_url: pictureUrl || null,
    username,
  });

  return normalizeUser(user);
}

// ===== Password reset tokens =====

async function createPasswordResetToken(email, token, expiresAt) {
  const user = await User.findOne({ email });
  if (!user) return null;

  await PasswordResetToken.create({
    user_id: user._id,
    token: hashToken(token),
    expires_at: expiresAt,
    is_used: false,
  });

  return normalizeUser(user);
}

async function consumePasswordResetToken(rawToken) {
  const token = hashToken(rawToken);
  const now = new Date();

  const rec = await PasswordResetToken.findOne({
    token,
    is_used: false,
    expires_at: { $gt: now },
  });

  if (!rec) return null;

  rec.is_used = true;
  await rec.save();

  const user = await User.findById(rec.user_id);
  return normalizeUser(user);
}

async function setPassword(userId, newPassword) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(newPassword, salt);

  const user = await User.findByIdAndUpdate(
    userId,
    { password_hash: hash },
    { new: true }
  );

  return normalizeUser(user);
}

module.exports = {
  createUserByEmail,
  findUserByEmail,
  findUserById,
  findUserByOAuth,
  markEmailVerified,
  setUsernameAndPassword,
  updateProfile,
  deleteUser,
  getAllUsers,
  storeVerificationCode,
  validateAndConsumeCode,
  setOAuthUser,
  createPasswordResetToken,
  consumePasswordResetToken,
  setPassword,
  adminUpdateUser,
};
