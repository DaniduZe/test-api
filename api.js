const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// MongoDB connection setup
mongoose.connect('mongodb+srv://ev:ev@evdata.wjsxnmb.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const Charger = mongoose.model('EVdata', {
  id: Number,
  status: Boolean,
  units: Number,
  time: Number,
  emergency_stop: Boolean
});

// Charging Station Simulation (Replace this with your actual hardware control logic)
const simulateChargingControl = async (stationId, units, time, action) => {
  try {
    let station = await Charger.findOne({ id: stationId });

    if (!station) {
      // If the station doesn't exist, create a new one
      station = new Charger({
        id: stationId,
        status: false,
        units: units,
        time: time,
        emergency_stop: false
      });
    }

    if (action === 'start' && station.status === false) {
      station.status = true;
      station.units = units;
      station.time = time;
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

// API Endpoints

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
  const result = await simulateChargingControl(stationId, units, time, 'start');
  res.json(result);
});

// Stop charging at a specific station
app.post('/api/charging-stations/:id/stop', async (req, res) => {
  const stationId = req.params.id;
  const result = await simulateChargingControl(stationId, 0, 0, 'stop');
  res.json(result);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Get the 'id' query parameter from the request URL
app.get('/api/charging-stations/:id', async (req, res) => {
  try {
    const { id } = req.params; // Using req.params to get the 'id' parameter from the route
    
    const station = await Charger.findOne({ id: parseInt(id) });
    if (station) {
      res.json({ id: station.id, status: station.status });
    } else {
      res.status(404).json({ error: `Station with ID ${id} not found` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch charging station' });
  }
});
