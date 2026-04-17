const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/villa', require('./routes/villaRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/calendar', require('./routes/calendarRoutes'));

app.get('/api/test', (req, res) => {
  res.json({ message: 'Villa Rental API is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});