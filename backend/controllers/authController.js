const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ message: 'All fields are required' });

  try {
    const existingUser  = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser ) return res.status(400).json({ message: 'User  already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser  = new User({ username, email, password: hashedPassword });
    await newUser .save();

    const token = generateToken(newUser );
    res.status(201).json({ token, user: { id: newUser ._id, username: newUser .username, email: newUser .email, profilePicture: newUser .profilePicture } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(user);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, profilePicture: user.profilePicture } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

exports.googleAuthCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user) => {
    if (err || !user) return res.redirect(`${process.env.FRONTEND_URL}/login?error=google_auth_failed`);

    // Generate JWT token
    const token = generateToken(user);

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/success?token=${token}`);
  })(req, res, next);
};

exports.logout = (req, res) => {
  req.logout(() => {
    res.json({ message: 'Logged out' });
  });
};