const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser ((user, done) => {
  done(null, user.id);
});

passport.deserializeUser (async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const existingUser  = await User.findOne({ googleId: profile.id });
    if (existingUser ) return done(null, existingUser );

    // Create new user
    const newUser  = new User({
      googleId: profile.id,
      username: profile.displayName,
      email: profile.emails[0].value,
      profilePicture: profile.photos[0].value
    });
    await newUser .save();
    done(null, newUser );
  } catch (err) {
    done(err, null);
  }
}));