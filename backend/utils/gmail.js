const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const sendEmail = async (to, subject, html) => {
  try {
    const accessToken = await oauth2Client.getAccessToken();
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const message = [
      `From: ${process.env.SENDER_EMAIL}`,
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      `MIME-Version: 1.0`,
      `Subject: ${subject}`,
      '',
      html
    ].join('\n').trim();

    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('Email send failed:', error);
    throw error;
  }
};

const sendVerificationEmail = async (email, code) => {
  const html = `
    <h2>Email Verification</h2>
    <p>Your verification code is: <strong>${code}</strong></p>
    <p>This code expires in 10 minutes.</p>
  `;
  await sendEmail(email, 'Verify Your Email', html);
};

const sendResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset.html?token=${token}`;
  const html = `
    <h2>Password Reset</h2>
    <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
    <p>This link expires in 1 hour.</p>
  `;
  await sendEmail(email, 'Reset Your Password', html);
};

module.exports = { sendVerificationEmail, sendResetEmail };