require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing email service with user:', process.env.EMAIL_USER);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER, // send to self
  subject: 'Test Email - Villa Rental',
  text: 'If you receive this, your email configuration is working!'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('❌ Email test failed:', error);
  } else {
    console.log('✅ Email sent successfully:', info.response);
  }
  process.exit();
});
