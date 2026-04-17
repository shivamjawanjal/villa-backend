const nodemailer = require('nodemailer');

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS   // Gmail App Password (not regular password)
  }
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('Email service error:', error);
  } else {
    console.log('Email service ready to send messages');
  }
});

// Send booking confirmation to guest
const sendBookingConfirmation = async (booking, guest, villa) => {
  const checkInDate = new Date(booking.checkInDate).toLocaleDateString();
  const checkOutDate = new Date(booking.checkOutDate).toLocaleDateString();
  
  const mailOptions = {
    from: `"Villa Rental" <${process.env.EMAIL_USER}>`,
    to: guest.email,
    subject: `Booking Confirmation - ${villa.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Booking Confirmed! 🎉</h2>
        <p>Dear ${guest.fullName},</p>
        <p>Your booking at <strong>${villa.name}</strong> has been confirmed.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details:</h3>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Check-in:</strong> ${checkInDate} (${villa.checkInTime})</p>
          <p><strong>Check-out:</strong> ${checkOutDate} (${villa.checkOutTime})</p>
          <p><strong>Guests:</strong> ${booking.numberOfGuests}</p>
          <p><strong>Total Price:</strong> $${booking.totalPrice}</p>
        </div>
        
        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Villa Information:</h3>
          <p><strong>Address:</strong> ${villa.address?.street}, ${villa.address?.city}</p>
          <p><strong>Amenities:</strong> ${villa.amenities?.join(', ')}</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3>Important Information:</h3>
          <ul>
            <li>Check-in time: ${villa.checkInTime}</li>
            <li>Check-out time: ${villa.checkOutTime}</li>
            <li>Free cancellation up to ${villa.cancellationPolicy?.freeCancellationDays || 7} days before check-in</li>
          </ul>
        </div>
        
        <p>If you have any questions, please contact us.</p>
        <p>Thank you for choosing our villa!</p>
        <hr />
        <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply.</p>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
};

// Send booking confirmation to owner
const sendOwnerBookingNotification = async (booking, guest, villa) => {
  const checkInDate = new Date(booking.checkInDate).toLocaleDateString();
  const checkOutDate = new Date(booking.checkOutDate).toLocaleDateString();
  
  const mailOptions = {
    from: `"Villa Rental" <${process.env.EMAIL_USER}>`,
    to: process.env.OWNER_EMAIL || process.env.EMAIL_USER,
    subject: `New Booking Received - ${villa.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #27ae60;">New Booking Alert! 🏠</h2>
        <p>You have received a new booking.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Booking Details:</h3>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Guest:</strong> ${guest.fullName} (${guest.email})</p>
          <p><strong>Phone:</strong> ${guest.phone || 'Not provided'}</p>
          <p><strong>Check-in:</strong> ${checkInDate}</p>
          <p><strong>Check-out:</strong> ${checkOutDate}</p>
          <p><strong>Guests:</strong> ${booking.numberOfGuests}</p>
          <p><strong>Total Price:</strong> $${booking.totalPrice}</p>
          ${booking.guestDetails?.specialRequests ? `<p><strong>Special Requests:</strong> ${booking.guestDetails.specialRequests}</p>` : ''}
        </div>
        
        <p>Log into your dashboard to manage this booking.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
};

// Send welcome email on registration
const sendWelcomeEmail = async (user) => {
  const mailOptions = {
    from: `"Villa Rental" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Welcome to Villa Rental!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Welcome ${user.fullName}! 🎉</h2>
        <p>Thank you for registering with Villa Rental.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse villa details</li>
          <li>Check availability</li>
          <li>Make bookings</li>
          <li>Manage your reservations</li>
        </ul>
        <a href="${process.env.FRONTEND_URL}/villa" style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Start Exploring</a>
        <hr />
        <p style="font-size: 12px; color: #666;">If you didn't register, please ignore this email.</p>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
};

// Send booking reminder (24 hours before check-in)
const sendBookingReminder = async (booking, guest, villa) => {
  const checkInDate = new Date(booking.checkInDate).toLocaleDateString();
  
  const mailOptions = {
    from: `"Villa Rental" <${process.env.EMAIL_USER}>`,
    to: guest.email,
    subject: `Reminder: Your stay at ${villa.name} starts tomorrow!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Your stay starts tomorrow! 🏖️</h2>
        <p>Dear ${guest.fullName},</p>
        <p>This is a reminder that your booking at <strong>${villa.name}</strong> starts tomorrow (${checkInDate}).</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Check-in Information:</h3>
          <p><strong>Time:</strong> ${villa.checkInTime}</p>
          <p><strong>Address:</strong> ${villa.address?.street}, ${villa.address?.city}</p>
          <p><strong>Contact host:</strong> ${process.env.OWNER_PHONE || 'Available in your dashboard'}</p>
        </div>
        
        <p>We hope you have a wonderful stay!</p>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
};

// Send cancellation confirmation
const sendCancellationEmail = async (booking, guest, villa, refundAmount) => {
  const mailOptions = {
    from: `"Villa Rental" <${process.env.EMAIL_USER}>`,
    to: guest.email,
    subject: `Booking Cancellation - ${villa.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Booking Cancelled</h2>
        <p>Dear ${guest.fullName},</p>
        <p>Your booking at <strong>${villa.name}</strong> has been cancelled as requested.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Refund Amount:</strong> $${refundAmount}</p>
          <p><strong>Refund will be processed within 5-7 business days.</strong></p>
        </div>
        
        <p>We hope to welcome you in the future!</p>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
};

// Send OTP for email verification
const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"Villa Rental" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verification Code - Villa Rental',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3498db;">Verify Your Email 📧</h2>
        <p>Thank you for registering. Please use the following code to verify your email address:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="letter-spacing: 5px; color: #2c3e50; margin: 0;">${otp}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <hr />
        <p style="font-size: 12px; color: #666;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendBookingConfirmation,
  sendOwnerBookingNotification,
  sendWelcomeEmail,
  sendBookingReminder,
  sendCancellationEmail,
  sendOTPEmail
};