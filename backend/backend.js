const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
const flightsDB = require("./flights.json");
const { calculateCO2, getCO2Category } = require("./co2");
const { getEcoTips } = require("./tips");

app.use(express.json());
app.use(cors());

// API route: get all flights list
app.get("/flights", (req, res) => {
  res.json(flightsDB);
});

// API route: search flights (POST) - returns formatted flights matching search criteria
app.post("/flights", (req, res) => {
  const { departure, arrival, date, passengers } = req.body;
  
  // Filter flights by departure and arrival cities (case-insensitive)
  const matchingFlights = flightsDB.flights.filter(flight => {
    const fromMatch = flight.from.toLowerCase().includes((departure || "").toLowerCase());
    const toMatch = flight.to.toLowerCase().includes((arrival || "").toLowerCase());
    return fromMatch && toMatch;
  });

  // Transform backend flight format to frontend format
  const formattedFlights = matchingFlights.map((flight, index) => {
    // Generate mock flight details based on route
    const airlines = ["Air India", "IndiGo", "SpiceJet", "Vistara", "GoAir"];
    const airline = airlines[index % airlines.length];
    const flightNumber = `${airline.substring(0, 2).toUpperCase()}${flight.id}${Math.floor(Math.random() * 1000)}`;
    
    // Generate times based on route distance (mock)
    const basePrice = 150 + (flight.co2_per_person * 2);
    const price = Math.round(basePrice + Math.random() * 200);
    
    // Generate departure/arrival times
    const departureHour = 6 + Math.floor(Math.random() * 12);
    const departureMin = Math.floor(Math.random() * 60);
    const durationHours = Math.floor(flight.co2_per_person / 50) + 2;
    const durationMins = Math.floor(Math.random() * 60);
    
    const arrivalHour = (departureHour + durationHours) % 24;
    const arrivalMin = (departureMin + durationMins) % 60;
    
    return {
      id: flight.id,
      airline: airline,
      flightNumber: flightNumber,
      price: price,
      departure: `${String(departureHour).padStart(2, '0')}:${String(departureMin).padStart(2, '0')}`,
      arrival: `${String(arrivalHour).padStart(2, '0')}:${String(arrivalMin).padStart(2, '0')}`,
      departureCity: flight.from,
      arrivalCity: flight.to,
      duration: `${durationHours}h ${durationMins}m`,
      seats: Math.floor(Math.random() * 20) + 5,
      type: Math.random() > 0.3 ? 'direct' : 'stop',
      distance: flight.co2_per_person * 10, // Mock distance calculation
      passengers: parseInt(passengers) || 1,
      aircraft_type: 'medium',
      class: 'economy',
      co2_per_person: flight.co2_per_person
    };
  });

  res.json(formattedFlights);
});

// API route: calculate CO₂ for a flight
app.post("/calculate", (req, res) => {
  const { from, to, passengers, flight_id, distance, aircraft_type, class: flightClass } = req.body;

  let flight;
  
  // Support both old format (from/to) and new format (flight_id)
  if (flight_id) {
    flight = flightsDB.flights.find((f) => f.id === flight_id);
  } else if (from && to) {
    flight = flightsDB.flights.find(
      (f) => f.from === from && f.to === to
    );
  }

  if (!flight) {
    return res.json({ error: "Flight route not found in database" });
  }

  const numPassengers = parseInt(passengers) || 1;
  const totalCO2 = calculateCO2(flight.co2_per_person, numPassengers);
  const category = getCO2Category(totalCO2);
  const tips = getEcoTips(category);
  
  // Calculate eco rating based on CO2 (lower is better, scale 1-5)
  const ecoRating = Math.max(1, Math.min(5, Math.round(5 - (flight.co2_per_person / 100))));

  res.json({
    from: flight.from,
    to: flight.to,
    passengers: numPassengers,
    totalCO2,
    co2: `${totalCO2} kg`,
    co2_kg: totalCO2,
    eco_rating: ecoRating,
    ecoRating: ecoRating,
    category,
    tips
  });
});

// AI eco-metrics endpoint that bridges to the Python AI module
app.post("/ai/metrics", (req, res) => {
  const body = req.body || {};
  const rawNumFaces = body.numFaces ?? body.num_faces;
  const parsedNumFaces = parseInt(rawNumFaces, 10);

  if (!Number.isInteger(parsedNumFaces) || parsedNumFaces < 0) {
    return res.status(400).json({ error: "numFaces must be a non-negative integer" });
  }

  const payload = { numFaces: parsedNumFaces };

  if (typeof body.distance_m === "number") {
    payload.distance_m = body.distance_m;
  }

  const bridgePath = path.join(__dirname, "..", "ai_bridge.py");
  const python = spawn("python", [bridgePath]);

  let stdout = "";
  let stderr = "";

  python.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  python.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  python.on("close", (code) => {
    if (code !== 0) {
      return res.status(500).json({
        error: "AI module failed",
        code,
        details: stderr.trim(),
      });
    }

    try {
      const result = stdout ? JSON.parse(stdout) : {};
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        error: "Invalid AI response",
        raw: stdout,
      });
    }
  });

  python.stdin.write(JSON.stringify(payload));
  python.stdin.end();
});

// Run backend on localhost
app.listen(5000, () => console.log("Backend running on port 5000"));
