const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

// MongoDB connection setup
mongoose.connect('mongodb+srv://ev:ev@evdata.wjsxnmb.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Charger schema for charging stations
const chargerSchema = new mongoose.Schema({
  _id: String,
  status: Boolean,
  units: Number,
  time: Number,
  emergency_stop: Boolean,
  used_time: Number,
  used_units: Number ,
});
const Charger = mongoose.model('EVdata', chargerSchema);

// User schema for authentication
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  mobileNumber: String,
  otp: String,
  otpExpiration: Date,
});
const User = mongoose.model('User', userSchema);

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'danidusennath@gmail.com', // Replace with your email address
    pass: 'rydc qzsx lttv dmfn', // Replace with your email password
  },
});

// Function to send OTP via email
const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: 'danidusennath@gmail.com', // Replace with your email address
    to: email,
    subject: 'OTP for Registration',
    text: `Your OTP for registration is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('OTP sent successfully!');
  } catch (error) {
    console.error('Error sending OTP:', error);
  }
};

// Charging Station Simulation
const simulateChargingControl = async (stationId, units, time, action, emergency_stop) => {
  try {
    let station = await Charger.findOne({ _id: stationId });

    if (!station) {
      station = new Charger({
        _id: stationId,
        status: false,
        units: units,
        time: time,
        emergency_stop: false,
        used_time: 0,
        used_units: 0,
      });
    }

    if (action === 'start' && station.status === false) {
      station.status = true;
      station.units = units;
      station.time = time;
      station.emergency_stop = false;
      await station.save();
      return { success: true, message: `Charging started at Station ${stationId}` };
    } else if (action === 'stop' && station.status === true) {
      station.status = false;
      station.emergency_stop = true;
      await station.save();
      return { success: true, message: `Charging stopped at Station ${stationId}` };
    } else {
      return { success: false, message: `Invalid action for station ${stationId}` };
    }
  } catch (error) {
    return { success: false, message: 'Error updating station status in the database' };
  }
};

// Charging Station Simulation from Device
const ChargingControlDevice = async (id, units, time, used_time, used_units, emergency_stop) => {
  try {

    const station = await Charger.findOne({ _id: id });

    if (!station) {
      return { success: false, message: `Station with ID ${id} not found` };
    }

    if (units > 0) {
      // Charging logic when units are greater than 0
      station.status = true;
      station.units = units;
      station.time = time;
      station.used_time = used_time;
      station.used_units = used_units;
      station.emergency_stop =emergency_stop;

    } else {
      // Stop charging logic when units are 0
      station.status = false;
      station.units = units;
      station.time = time;
      station.used_time = used_time;
      station.used_units = used_units;
      station.emergency_stop =emergency_stop;

    }

    await station.save();
    return { success: true, message: `Charging status updated at Station ${id}` };
  } catch (error) {
    console.error('Error updating station status:', error);
    return { success: false, message: 'Error updating station status in the database' };
  }
};

// Register a new user with hashed password and OTP
app.post('/api/register', async (req, res) => {
  const { email, password, mobileNumber } = req.body;

  try {
    // Check if the email is already registered
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate OTP
    const otp = uuidv4().substr(0, 6); // Generating a 6-digit OTP
    const otpExpiration = new Date(Date.now() + 600000); // OTP expiration time (10 minutes)

    // Hash the password before saving it to the database
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user with hashed password, mobile number, OTP, and OTP expiration
    const newUser = new User({
      email,
      password: hashedPassword,
      mobileNumber,
      otp,
      otpExpiration,
    });

    await newUser.save();

    // Send OTP to the user's email
    await sendOTP(email, otp);

    res.status(201).json({ message: 'User registered successfully. OTP sent to email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint for user authentication
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      // User not found
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare the entered password with the hashed password in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      // Passwords match, authentication successful
      res.status(200).json({ message: 'Authentication successful' });
    } else {
      // Passwords don't match, authentication failed
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all charging stations
app.get('/api/charging-stations', async (req, res) => {
  try {
    const stations = await Charger.find();
    res.json(stations);
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch charging stations' });
  }
});

// Start charging at a specific station
app.post('/api/charging-stations/:id/:units/:time/start', async (req, res) => {
  const stationId = req.params.id;
  const units = parseInt(req.params.units);
  const time = parseInt(req.params.time);
  const result = await simulateChargingControl(stationId, units, time, 'start', false);
  res.json(result);
});

app.post('/api/charging-stations/:id/stop', async (req, res) => {
  const stationId = req.params.id;
  const result = await simulateChargingControl(stationId, 0, 0, 'stop', true);
  res.json(result);
});

// Get the 'id' query parameter from the request URL
app.get('/api/charging-stations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const station = await Charger.findOne({ _id: id });
    
    if (station) {
      res.json({ id: station.id, status: station.status, units: station.units, time: station.time  });
    } else {
      res.status(404).json({ error: `Station with ID ${id} not found` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch charging station' });
  }
});


// Verify OTP endpoint
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      // User not found
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if OTP matches and is not expired
    if (user.otp === otp && user.otpExpiration > new Date()) {
      // Clear OTP and OTP expiration in the database
      user.otp = null;
      user.otpExpiration = null;
      await user.save();

      return res.status(200).json({ message: 'OTP verification successful' });
    } else {
      // OTP verification failed
      return res.status(401).json({ error: 'Invalid OTP or OTP expired' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


//update the status from the device
app.post('/api/charging-stations/:id', async (req, res) => {
  const id = req.params.id;
  const units = parseInt(req.body.units);
  const time = parseInt(req.body.time);
  const used_time = parseInt(req.body.used_time);
  const used_units = parseFloat(req.body.used_units);
  const emergency_stop = Boolean(req.body.emergency_stop);

  const result = await ChargingControlDevice(id, units, time, used_time, used_units, emergency_stop);
  res.json(result);
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
