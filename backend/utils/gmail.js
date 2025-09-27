const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

const sendMail = async ({ to, subject, html, text }) => {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.SENDER_EMAIL,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: token,
      },
    });

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      text,
      html,
    };

    const result = await transport.sendMail(mailOptions);
    console.log('Email sent:', result.messageId);
    return result;
  } catch (err) {
    console.error('Email send error:', err);
    throw new Error('Failed to send email. Please try again.');
  }
};

module.exports = { sendMail };