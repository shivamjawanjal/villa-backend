const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const User = require('./models/User');
const Villa = require('./models/Villa');

const seedDatabase = async () => {
  try {
    // Clear existing data (optional)
    // await User.deleteMany({});
    // await Villa.deleteMany({});
    
    // Check if owner already exists
    let owner = await User.findOne({ email: 'owner@villarental.com' });
    
    if (!owner) {
      // Create owner account
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Owner123!', salt);
      
      owner = new User({
        fullName: 'Villa Owner',
        email: 'owner@villarental.com',
        password: hashedPassword,
        role: 'owner',
        phone: '+1234567890'
      });
      
      await owner.save();
      console.log('✅ Owner created successfully');
      console.log('   Email: owner@villarental.com');
      console.log('   Password: Owner123!');
    } else {
      console.log('⚠️ Owner already exists, updating password...');
      // Update password to ensure it works
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Owner123!', salt);
      owner.password = hashedPassword;
      await owner.save();
      console.log('✅ Owner password updated');
    }
    
    // Check if villa exists
    let villa = await Villa.findOne();
    
    if (!villa) {
      villa = new Villa({
        name: 'Sunset Paradise Villa',
        description: 'Beautiful beachfront villa with private pool and ocean views. Perfect for family vacations and romantic getaways.',
        address: {
          street: '123 Beach Road',
          city: 'Malibu',
          country: 'USA'
        },
        amenities: ['Private Pool', 'Free WiFi', 'Air Conditioning', 'Full Kitchen', 'Free Parking', 'Beach Access', 'BBQ Grill', 'Smart TV'],
        maxGuests: 8,
        bedrooms: 4,
        bathrooms: 3,
        basePricePerNight: 350,
        cleaningFee: 75,
        checkInTime: '15:00',
        checkOutTime: '11:00',
        images: ['/images/villa1.jpg', '/images/villa2.jpg', '/images/villa3.jpg'],
        minStayDays: 2,
        maxStayDays: 30,
        cancellationPolicy: {
          freeCancellationDays: 7,
          refundPercentage: 50
        }
      });
      
      await villa.save();
      console.log('✅ Villa created successfully');
    } else {
      console.log('⚠️ Villa already exists');
    }
    
    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Owner Email: owner@villarental.com');
    console.log('   Owner Password: Owner123!');
    
    process.exit();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();