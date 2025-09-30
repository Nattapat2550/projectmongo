import { google } from 'googleapis';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

export async function sendEmail(to, subject, html) {
  const mail = new MailComposer({
    to,
    subject,
    html,
    text: html?.replace(/<[^>]+>/g, ' '),
    from: process.env.SENDER_EMAIL
  });

  const message = await new Promise((resolve, reject) => {
    mail.compile().build((err, msg) => err ? reject(err) : resolve(msg));
  });

  const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage }
  });
  return res.data;
}
