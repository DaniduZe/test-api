const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json());

// Charging Station Simulation (Replace this with your actual hardware control logic)
const chargingStations = [
  { id: 1, name: 'Station A', status: 'available' },
  { id: 2, name: 'Station B', status: 'available' },
];

const simulateChargingControl = (stationId, action) => {
  const station = chargingStations.find((s) => s.id === stationId);

  if (station) {
    if (action === 'start' && station.status === 'available') {
      station.status = 'charging';
      return { success: true, message: `Charging started at ${station.name}` };
    } else if (action === 'stop' && station.status === 'charging') {
      station.status = 'available';
      return { success: true, message: `Charging stopped at ${station.name}` };
    } else {
      return { success: false, message: `Invalid action for station ${station.name}` };
    }
  } else {
    return { success: false, message: `Station with ID ${stationId} not found` };
  }
};

// API Endpoints

// Get all charging stations
app.get('/api/charging-stations', (req, res) => {
  res.json(chargingStations);
});

// Get a specific charging station
app.get('/api/charging-stations/:id', (req, res) => {
  const stationId = parseInt(req.params.id);
  const station = chargingStations.find((s) => s.id === stationId);

  if (station) {
    res.json(station);
  } else {
    res.status(404).json({ error: 'Station not found' });
  }
});

// Start charging at a specific station
app.post('/api/charging-stations/:id/start', (req, res) => {
  const stationId = parseInt(req.params.id);
  const result = simulateChargingControl(stationId, 'start');
  res.json(result);
});

// Stop charging at a specific station
app.post('/api/charging-stations/:id/stop', (req, res) => {
  const stationId = parseInt(req.params.id);
  const result = simulateChargingControl(stationId, 'stop');
  res.json(result);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
