const path = require("path")
const express = require("express")
const cors = require("cors")
const sqlite3 = require("sqlite3").verbose()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const app = express()
const PORT = process.env.PORT || 4000
const DB_PATH = path.join(__dirname, "data.db")
const db = new sqlite3.Database(DB_PATH)
const JWT_SECRET = process.env.JWT_SECRET || "change-me-dev-secret"
const TOKEN_EXPIRY = "7d"

app.use(cors())
app.use(express.json({ limit: "2mb" }))
app.use(express.static(__dirname))

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err)
      resolve(this)
    })
  })

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err)
      resolve(rows)
    })
  })

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err)
      resolve(row)
    })
  })

async function seed() {
  await run(
    `CREATE TABLE IF NOT EXISTS counters (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0
    )`,
  )

  await run(
    `CREATE TABLE IF NOT EXISTS flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      airline TEXT NOT NULL,
      flight_number TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      departure_city TEXT NOT NULL,
      arrival_time TEXT NOT NULL,
      arrival_city TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      price INTEGER NOT NULL,
      seats TEXT NOT NULL,
      co2_kg INTEGER NOT NULL,
      eco_rating REAL NOT NULL,
      type TEXT NOT NULL
    )`,
  )

  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_flights_flight_number
     ON flights(flight_number)`,
  )

  await run(
    `CREATE TABLE IF NOT EXISTS face_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      faces INTEGER NOT NULL,
      confidence REAL NOT NULL,
      quality TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  await run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  )

  const defaultCounters = [
    ["flights", 240],
    ["co2_saved", 4200],
    ["tips_viewed", 600],
    ["face_scanned", 120],
  ]

  for (const [key, value] of defaultCounters) {
    await run(
      `INSERT OR IGNORE INTO counters (key, value)
       VALUES (?, ?)`,
      [key, value],
    )
  }

  const sampleFlights = [
    ["Eco Air", "EA2341", "08:30", "New York (JFK)", "14:45", "Los Angeles (LAX)", 315, 240, "156 seats", 245, 4.8, "direct"],
    ["Green Wings", "GW156", "10:15", "New York (JFK)", "16:30", "Los Angeles (LAX)", 375, 195, "200 seats", 198, 4.6, "direct"],
    ["Sky Express", "SX789", "12:00", "New York (JFK)", "18:20", "Los Angeles (LAX)", 380, 180, "178 seats", 267, 3.9, "direct"],
    ["Eco Air", "EA520", "07:45", "Chicago (ORD)", "09:30", "New York (JFK)", 165, 120, "145 seats", 85, 4.9, "direct"],
    ["Green Wings", "GW302", "14:20", "San Francisco (SFO)", "22:15", "New York (JFK)", 355, 220, "167 seats", 213, 4.7, "direct"],
    ["Sky Express", "SX445", "06:30", "Miami (MIA)", "08:45", "New York (JFK)", 195, 150, "189 seats", 120, 4.2, "direct"],
    ["Eco Air", "EA891", "09:00", "Boston (BOS)", "10:15", "New York (JFK)", 75, 85, "156 seats", 45, 4.9, "direct"],
    ["Green Wings", "GW678", "11:30", "Dallas (DFW)", "16:45", "Los Angeles (LAX)", 255, 165, "198 seats", 178, 4.5, "direct"],
    ["Sky Express", "SX234", "13:00", "Seattle (SEA)", "16:30", "San Francisco (SFO)", 210, 145, "167 seats", 110, 4.6, "direct"],
    // Mumbai routes
    ["Air Bharat", "AB201", "06:15", "Mumbai (BOM)", "08:25", "Delhi (DEL)", 130, 120, "180 seats", 95, 4.7, "direct"],
    ["SkyIndia", "SI402", "09:45", "Mumbai (BOM)", "12:15", "Dubai (DXB)", 150, 210, "190 seats", 140, 4.4, "direct"],
    ["EcoJet", "EJ118", "14:10", "Mumbai (BOM)", "15:35", "Pune (PNQ)", 85, 70, "150 seats", 40, 4.8, "direct"],
    ["Air Bharat", "AB305", "18:30", "Mumbai (BOM)", "20:40", "Delhi (DEL)", 130, 135, "175 seats", 105, 4.6, "direct"],
    ["SkyIndia", "SI522", "21:00", "Mumbai (BOM)", "23:20", "Dubai (DXB)", 140, 230, "188 seats", 150, 4.3, "direct"],
  ]

  for (const flight of sampleFlights) {
    await run(
      `INSERT OR IGNORE INTO flights (
        airline, flight_number, departure_time, departure_city,
        arrival_time, arrival_city, duration_minutes, price, seats,
        co2_kg, eco_rating, type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      flight,
    )
  }

  // Seed demo face logs
  const faceLogCount = await get("SELECT COUNT(*) as count FROM face_logs")
  if (!faceLogCount?.count) {
    const demoFaceLogs = [
      [1, 87.5, "Excellent", new Date(Date.now() - 3600000).toISOString()], // 1 hour ago
      [1, 92.3, "Excellent", new Date(Date.now() - 7200000).toISOString()], // 2 hours ago
      [2, 78.9, "Good", new Date(Date.now() - 10800000).toISOString()], // 3 hours ago
      [1, 85.2, "Good", new Date(Date.now() - 14400000).toISOString()], // 4 hours ago
      [1, 91.7, "Excellent", new Date(Date.now() - 18000000).toISOString()], // 5 hours ago
    ]

    for (const [faces, confidence, quality, createdAt] of demoFaceLogs) {
      await run(
        `INSERT INTO face_logs (faces, confidence, quality, created_at)
         VALUES (?, ?, ?, ?)`,
        [faces, confidence, quality, createdAt],
      )
    }
  }

  // Seed demo user if none exists
  const userCount = await get("SELECT COUNT(*) as count FROM users")
  if (!userCount?.count) {
    const demoHash = bcrypt.hashSync("password123", 10)
    await run(
      `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
      ["Demo User", "demo@eco.com", demoHash],
    )
  }
}

seed().catch((err) => {
  console.error("Database init failed", err)
  process.exit(1)
})

app.get("/api/health", (_, res) => {
  res.json({ status: "ok" })
})

app.get("/api/counters", async (_, res) => {
  try {
    const rows = await all("SELECT key, value FROM counters")
    const counters = rows.reduce((acc, row) => {
      acc[row.key] = row.value
      return acc
    }, {})
    res.json(counters)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch counters" })
  }
})

app.post("/api/counters/:key/increment", async (req, res) => {
  const { key } = req.params
  const amount = Number.parseInt(req.body.amount ?? 1, 10)

  try {
    await run(
      `INSERT INTO counters (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = value + ?`,
      [key, amount, amount],
    )

    const row = await get("SELECT value FROM counters WHERE key = ?", [key])
    res.json({ key, value: row?.value ?? 0 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to update counter" })
  }
})

app.get("/api/flights", async (req, res) => {
  const from = req.query.from || ""
  const to = req.query.to || ""
  const params = []
  let where = "WHERE 1=1"

  if (from) {
    where += " AND lower(departure_city) LIKE ?"
    params.push(`%${from.toLowerCase()}%`)
  }

  if (to) {
    where += " AND lower(arrival_city) LIKE ?"
    params.push(`%${to.toLowerCase()}%`)
  }

  try {
    const rows = await all(
      `SELECT * FROM flights ${where} ORDER BY price ASC`,
      params,
    )

    const mapped = rows.map((row) => ({
      id: row.id,
      airline: row.airline,
      flightNumber: row.flight_number,
      departure: row.departure_time,
      departureCity: row.departure_city,
      arrival: row.arrival_time,
      arrivalCity: row.arrival_city,
      duration: `${Math.floor(row.duration_minutes / 60)}h ${row.duration_minutes % 60}m`,
      price: row.price,
      seats: row.seats,
      co2: `${row.co2_kg} kg`,
      ecoRating: row.eco_rating,
      type: row.type,
    }))

    res.json(mapped)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch flights" })
  }
})

app.post("/api/flights/search", async (req, res) => {
  const { from, to } = req.body || {}
  req.query.from = from
  req.query.to = to
  return app._router.handle(req, res, () => {}, "/api/flights", "GET")
})

app.get("/api/face-logs", async (req, res) => {
  const limit = Number.parseInt(req.query.limit ?? 20, 10)
  try {
    const rows = await all(
      `SELECT faces, confidence, quality, created_at
       FROM face_logs
       ORDER BY datetime(created_at) DESC
       LIMIT ?`,
      [limit],
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch face logs" })
  }
})

app.post("/api/face-logs", async (req, res) => {
  const faces = Number.parseInt(req.body.faces ?? 0, 10)
  const confidence = Number.parseFloat(req.body.confidence ?? 0)
  const quality = req.body.quality || "Unknown"

  try {
    await run(
      `INSERT INTO face_logs (faces, confidence, quality)
       VALUES (?, ?, ?)`,
      [faces, confidence, quality],
    )

    await run(
      `INSERT INTO counters (key, value)
       VALUES ('face_scanned', ?)
       ON CONFLICT(key) DO UPDATE SET value = value + ?`,
      [faces || 1, faces || 1],
    )

    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to save face log" })
  }
})

// Auth helpers
const generateToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  })

const authRequired = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null
    if (!token) return res.status(401).json({ error: "Unauthorized" })
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await get("SELECT id, name, email FROM users WHERE id = ?", [payload.id])
    if (!user) return res.status(401).json({ error: "Unauthorized" })
    req.user = user
    next()
  } catch (err) {
    console.error(err)
    return res.status(401).json({ error: "Unauthorized" })
  }
}

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" })
  }
  try {
    const existing = await get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()])
    if (existing) {
      return res.status(409).json({ error: "Email already registered" })
    }
    const hash = await bcrypt.hash(password, 10)
    const result = await run(
      `INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`,
      [name, email.toLowerCase(), hash],
    )
    const user = { id: result.lastID, name, email: email.toLowerCase() }
    const token = generateToken(user)
    res.json({ user, token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Registration failed" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" })
  }
  try {
    const user = await get("SELECT id, name, email, password_hash FROM users WHERE email = ?", [
      email.toLowerCase(),
    ])
    if (!user) return res.status(401).json({ error: "Invalid credentials" })
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: "Invalid credentials" })
    const publicUser = { id: user.id, name: user.name, email: user.email }
    const token = generateToken(publicUser)
    res.json({ user: publicUser, token })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Login failed" })
  }
})

app.get("/api/auth/me", authRequired, (req, res) => {
  res.json({ user: req.user })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

