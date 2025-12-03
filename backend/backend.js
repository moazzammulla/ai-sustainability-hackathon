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
