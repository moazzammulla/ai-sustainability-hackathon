const express = require("express");
const app = express();
const flightsDB = require("./flights.json");
const { calculateCO2, getCO2Category } = require("./co2");
const { getEcoTips } = require("./tips");

app.use(express.json());

// API route: get all flights list
app.get("/flights", (req, res) => {
  res.json(flightsDB);
});

// API route: calculate CO₂ for a flight
app.post("/calculate", (req, res) => {
  const { from, to, passengers } = req.body;

  const flight = flightsDB.flights.find(
    (f) => f.from === from && f.to === to
  );

  if (!flight) {
    return res.json({ error: "Flight route not found in database" });
  }

  const totalCO2 = calculateCO2(flight.co2_per_person, passengers);
  const category = getCO2Category(totalCO2);
  const tips = getEcoTips(category);

  res.json({
    from,
    to,
    passengers,
    totalCO2,
    category,
    tips
  });
});

// Run backend on localhost
app.listen(5000, () => console.log("Backend running on port 5000"));
