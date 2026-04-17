async function testBooking() {
  try {
    // 1. Register a test user
    const email = `test_${Date.now()}@test.com`;
    console.log(`Registering ${email}...`);
    const regRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test User',
        email: email,
        password: 'password123',
        phone: '1234567890'
      })
    });
    
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(`Reg failed: ${JSON.stringify(regData)}`);
    
    const token = regData.token;
    console.log('Registered successfully. Token received.');

    // 2. Book
    console.log('Attempting to book...');
    const bookRes = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        checkInDate: '2026-05-18T00:00:00.000Z',
        checkOutDate: '2026-05-20T00:00:00.000Z',
        numberOfGuests: 2,
        guestDetails: {
          fullName: 'Test User',
          email: email,
          phone: '1234567890',
          specialRequests: ''
        }
      })
    });

    const bookData = await bookRes.json();
    if (!bookRes.ok) {
      console.error('Booking failed with status:', bookRes.status);
      console.error('Response data:', bookData);
    } else {
      console.log('Booking success:', bookData);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testBooking();
