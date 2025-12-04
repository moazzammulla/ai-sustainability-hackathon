// Face Detection Module with MediaPipe
import { FaceDetection } from "@mediapipe/face_detection"

const BACKEND_BASE_URL = "http://localhost:5000"

class FaceDetectionSystem {
  constructor() {
    this.webcamElement = document.getElementById("webcam")
    this.canvasElement = document.getElementById("canvas")
    this.canvasCtx = this.canvasElement.getContext("2d")
    this.preview = document.getElementById("preview")
    this.uploadBox = document.getElementById("uploadBox")
    this.imageInput = document.getElementById("imageInput")
    this.detectionLog = document.getElementById("detectionLog")

    // Buttons
    this.startWebcamBtn = document.getElementById("startWebcamBtn")
    this.stopWebcamBtn = document.getElementById("stopWebcamBtn")
    this.detectBtn = document.getElementById("detectBtn")
    this.clearBtn = document.getElementById("clearBtn")

    // Stats
    this.faceCount = document.getElementById("faceCount")
    this.scanCount = document.getElementById("scanCount")
    this.resultFaces = document.getElementById("resultFaces")
    this.resultConfidence = document.getElementById("resultConfidence")
    this.resultQuality = document.getElementById("resultQuality")

    // Sections
    this.resultsSection = document.getElementById("resultsSection")
    this.verificationStatus = document.getElementById("verificationStatus")
    this.verificationMessage = document.getElementById("verificationMessage")

    // State
    this.webcamRunning = false
    this.camera = null
    this.faceDetection = null
    this.totalScans = 0
    this.currentFaceCount = 0
    this.uploadedImage = null
    this.lastMetricsSend = null

    this.init()
  }

  async init() {
    // Initialize MediaPipe Face Detection
    this.faceDetection = new FaceDetection({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
      },
    })

    this.faceDetection.setOptions({
      model: "short_range", // 'short_range' (0-2m) or 'full_range' (0-5m)
      selfieMode: true,
    })

    this.faceDetection.onResults(this.onFaceDetectionResults.bind(this))

    // Event listeners
    this.startWebcamBtn.addEventListener("click", () => this.startWebcam())
    this.stopWebcamBtn.addEventListener("click", () => this.stopWebcam())
    this.detectBtn.addEventListener("click", () => this.detectFaceInImage())
    this.clearBtn.addEventListener("click", () => this.clearImage())

    // Upload events
    this.uploadBox.addEventListener("click", () => this.imageInput.click())
    this.uploadBox.addEventListener("dragover", (e) => this.handleDragOver(e))
    this.uploadBox.addEventListener("drop", (e) => this.handleDrop(e))
    this.imageInput.addEventListener("change", (e) => this.handleImageSelect(e))

    this.addLog("System initialized successfully")
  }

  async startWebcam() {
    this.addLog("Starting webcam...")
    this.webcamRunning = true
    this.startWebcamBtn.disabled = true
    this.stopWebcamBtn.disabled = false

    const hasCamera = await this.setupCamera()
    if (hasCamera) {
      this.webcamElement.style.display = "block"
      this.canvasElement.style.display = "block"
      this.addLog("Webcam started successfully")
      this.detectFaceWebcam()
    }
  }

  async setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
    })

    this.webcamElement.srcObject = stream

    return new Promise((resolve) => {
      this.webcamElement.onloadedmetadata = () => {
        this.webcamElement.play()
        // Setup canvas dimensions
        this.canvasElement.width = this.webcamElement.videoWidth
        this.canvasElement.height = this.webcamElement.videoHeight
        resolve(true)
      }
    })
  }

  detectFaceWebcam() {
    if (!this.webcamRunning) return

    const video = this.webcamElement
    const canvas = this.canvasElement
    const ctx = this.canvasCtx

    const detect = async () => {
      await this.faceDetection.send({ image: video })

      if (this.webcamRunning) {
        requestAnimationFrame(detect)
      }
    }

    detect()
  }

  async onFaceDetectionResults(results) {
    this.canvasElement.width = this.webcamElement.videoWidth
    this.canvasElement.height = this.webcamElement.videoHeight

    // Clear canvas
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)
    this.canvasCtx.drawImage(this.webcamElement, 0, 0, this.canvasElement.width, this.canvasElement.height)

    if (results.detections.length > 0) {
      this.currentFaceCount = results.detections.length
      this.drawFaceDetections(results.detections)
      const confidence = (results.detections[0].score[0] * 100).toFixed(2)
      this.addLog(
        `Detected ${this.currentFaceCount} face(s) - Confidence: ${confidence}%`,
      )

      // Update stats
      this.faceCount.textContent = this.currentFaceCount

      // Get metrics from backend (throttled to avoid too many requests)
      if (!this.lastMetricsSend || Date.now() - this.lastMetricsSend > 2000) {
        try {
          const metricsResponse = await fetch(`${BACKEND_BASE_URL}/ai/metrics`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              numFaces: this.currentFaceCount
            })
          })

          if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json()
            
            // Update UI with backend metrics instead of browser detection
            this.faceCount.textContent = metricsData.num_faces || this.currentFaceCount
            
            // Update AI eco metrics
            const densityLabelEl = document.getElementById("aiDensityLabel")
            const co2SavedEl = document.getElementById("aiCo2Saved")
            const walkTimeEl = document.getElementById("aiWalkTime")
            const energySavedEl = document.getElementById("aiEnergySaved")

            if (densityLabelEl && typeof metricsData.density_label === "string") {
              densityLabelEl.textContent = metricsData.density_label
            }

            if (co2SavedEl && typeof metricsData.co2_saved_readable === "string") {
              co2SavedEl.textContent = `CO₂ Saved (estimated): ${metricsData.co2_saved_readable}`
            }

            if (walkTimeEl && typeof metricsData.walk_time === "string") {
              walkTimeEl.textContent = `Equivalent walking time: ${metricsData.walk_time}`
            }

            if (energySavedEl && typeof metricsData.energy_saved === "number") {
              energySavedEl.textContent = `Estimated energy saved: ${metricsData.energy_saved.toFixed(2)}`
            }
            
            this.lastMetricsSend = Date.now()
          }
        } catch (error) {
          console.error('Error getting webcam metrics from backend:', error)
        }
      }
    } else {
      this.currentFaceCount = 0
      this.faceCount.textContent = "0"
    }
  }

  drawFaceDetections(detections) {
    detections.forEach((detection) => {
      const keypoints = detection.keypoints
      const score = detection.score[0]

      // Get bounding box
      const locationData = detection.locationData
      const startX = locationData.relative_bounding_box.xmin * this.canvasElement.width
      const startY = locationData.relative_bounding_box.ymin * this.canvasElement.height
      const width = locationData.relative_bounding_box.width * this.canvasElement.width
      const height = locationData.relative_bounding_box.height * this.canvasElement.height

      // Draw bounding box
      this.canvasCtx.strokeStyle = `rgba(0, 212, 255, 0.8)`
      this.canvasCtx.lineWidth = 3
      this.canvasCtx.strokeRect(startX, startY, width, height)

      // Draw keypoints
      keypoints.forEach((keypoint) => {
        const x = keypoint.x * this.canvasElement.width
        const y = keypoint.y * this.canvasElement.height

        this.canvasCtx.fillStyle = "rgba(255, 107, 53, 0.8)"
        this.canvasCtx.beginPath()
        this.canvasCtx.arc(x, y, 4, 0, 2 * Math.PI)
        this.canvasCtx.fill()
      })

      // Draw confidence score
      this.canvasCtx.fillStyle = "#00d4ff"
      this.canvasCtx.font = "bold 14px Arial"
      this.canvasCtx.fillText(`Confidence: ${(score * 100).toFixed(2)}%`, startX, startY - 10)
    })
  }

  stopWebcam() {
    this.addLog("Stopping webcam...")
    this.webcamRunning = false
    this.startWebcamBtn.disabled = false
    this.stopWebcamBtn.disabled = true

    if (this.webcamElement.srcObject) {
      const tracks = this.webcamElement.srcObject.getTracks()
      tracks.forEach((track) => track.stop())
    }

    this.webcamElement.style.display = "none"
    this.canvasElement.style.display = "none"
    this.addLog("Webcam stopped")
  }

  handleDragOver(e) {
    e.preventDefault()
    this.uploadBox.style.borderColor = "var(--primary)"
    this.uploadBox.style.background = "rgba(0, 212, 255, 0.15)"
  }

  handleDrop(e) {
    e.preventDefault()
    this.uploadBox.style.borderColor = "var(--border)"
    this.uploadBox.style.background = ""

    const files = e.dataTransfer.files
    if (files.length > 0) {
      this.loadImage(files[0])
    }
  }

  handleImageSelect(e) {
    if (e.target.files.length > 0) {
      this.loadImage(e.target.files[0])
    }
  }

  loadImage(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      this.uploadedImage = new Image()
      this.uploadedImage.onload = () => {
        this.preview.src = e.target.result
        this.preview.style.display = "block"
        this.detectBtn.disabled = false
        this.clearBtn.disabled = false
        this.addLog(`Image loaded: ${file.name}`)
      }
      this.uploadedImage.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  async detectFaceInImage() {
    if (!this.uploadedImage) return

    this.addLog("Detecting face in image...")
    this.totalScans++
    this.scanCount.textContent = this.totalScans
    this.detectBtn.disabled = true

    try {
      // Send image to MediaPipe
      const results = await new Promise((resolve) => {
        const tempCanvas = document.createElement("canvas")
        tempCanvas.width = this.uploadedImage.width
        tempCanvas.height = this.uploadedImage.height
        const ctx = tempCanvas.getContext("2d")
        ctx.drawImage(this.uploadedImage, 0, 0)

        // Create a temporary detection with results
        this.faceDetection.onResults((detectionResults) => {
          resolve(detectionResults)
        })

        this.faceDetection.send({ image: tempCanvas })
      })

      this.displayDetectionResults(results)
    } catch (error) {
      this.addLog(`Error: ${error.message}`)
      console.error("Detection error:", error)
    }

    this.detectBtn.disabled = false
  }

  async displayDetectionResults(results) {
    const faceCount = results.detections.length

    // Show results section
    this.resultsSection.classList.add("active")

    // Get metrics from backend instead of using browser-only detection
    try {
      const metricsResponse = await fetch(`${BACKEND_BASE_URL}/ai/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          numFaces: faceCount
        })
      })

      if (!metricsResponse.ok) {
        throw new Error(`HTTP error! status: ${metricsResponse.status}`)
      }

      const metricsData = await metricsResponse.json()
      
      // Update results with backend data instead of browser detection
      const backendFaceCount = metricsData.num_faces || faceCount
      const densityIndex = (metricsData.density_index || 0) * 100
      const densityLabel = metricsData.density_label || "Unknown"
      
      this.resultFaces.textContent = backendFaceCount
      this.resultConfidence.textContent = `${densityIndex.toFixed(0)}%`
      this.resultQuality.textContent = densityLabel

      // Update AI eco metrics section
      const densityLabelEl = document.getElementById("aiDensityLabel")
      const co2SavedEl = document.getElementById("aiCo2Saved")
      const walkTimeEl = document.getElementById("aiWalkTime")
      const energySavedEl = document.getElementById("aiEnergySaved")

      if (densityLabelEl && typeof metricsData.density_label === "string") {
        densityLabelEl.textContent = metricsData.density_label
      }

      if (co2SavedEl && typeof metricsData.co2_saved_readable === "string") {
        co2SavedEl.textContent = `CO₂ Saved (estimated): ${metricsData.co2_saved_readable}`
      }

      if (walkTimeEl && typeof metricsData.walk_time === "string") {
        walkTimeEl.textContent = `Equivalent walking time: ${metricsData.walk_time}`
      }

      if (energySavedEl && typeof metricsData.energy_saved === "number") {
        energySavedEl.textContent = `Estimated energy saved: ${metricsData.energy_saved.toFixed(2)}`
      }

      this.addLog(`✓ Backend metrics received: ${JSON.stringify(metricsData)}`)

      if (backendFaceCount > 0) {
        this.verificationStatus.classList.add("active")
        this.addLog(`✓ Face verified! Found ${backendFaceCount} face(s) with ${densityLabel} density`)

        if (densityIndex >= 50) {
          this.verificationMessage.textContent = `Your face has been detected and verified. Crowd density: ${densityLabel}. You are now identified in the system.`
        } else {
          this.verificationMessage.textContent = `Face detected. Crowd density: ${densityLabel}. Please ensure better lighting for optimal verification.`
        }
      } else {
        this.verificationStatus.classList.remove("active")
        this.addLog("⚠ No face detected in image. Please try another image.")
      }
    } catch (error) {
      console.error('Error getting metrics from backend:', error)
      this.addLog(`⚠ Failed to get metrics from backend: ${error.message}`)
      
      // Fallback to browser detection if backend fails
      this.resultFaces.textContent = faceCount
      this.resultConfidence.textContent = faceCount > 0 ? "N/A" : "0%"
      this.resultQuality.textContent = "Backend unavailable"
    }

    // Draw detection on preview
    this.drawFaceDetectionsOnPreview(results.detections)
  }

  drawFaceDetectionsOnPreview(detections) {
    const canvas = document.createElement("canvas")
    canvas.width = this.uploadedImage.width
    canvas.height = this.uploadedImage.height
    const ctx = canvas.getContext("2d")

    ctx.drawImage(this.uploadedImage, 0, 0)

    detections.forEach((detection) => {
      const locationData = detection.locationData
      const startX = locationData.relative_bounding_box.xmin * canvas.width
      const startY = locationData.relative_bounding_box.ymin * canvas.height
      const width = locationData.relative_bounding_box.width * canvas.width
      const height = locationData.relative_bounding_box.height * canvas.height

      ctx.strokeStyle = "rgba(0, 212, 255, 0.9)"
      ctx.lineWidth = 3
      ctx.strokeRect(startX, startY, width, height)

      // Draw keypoints
      const keypoints = detection.keypoints
      keypoints.forEach((keypoint) => {
        const x = keypoint.x * canvas.width
        const y = keypoint.y * canvas.height
        ctx.fillStyle = "rgba(255, 107, 53, 0.9)"
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, 2 * Math.PI)
        ctx.fill()
      })
    })

    this.preview.src = canvas.toDataURL()
  }

  getQualityLabel(confidence) {
    const conf = Number.parseFloat(confidence)
    if (conf >= 90) return "Excellent"
    if (conf >= 80) return "Good"
    if (conf >= 70) return "Fair"
    if (conf >= 60) return "Poor"
    return "Very Poor"
  }

  clearImage() {
    this.preview.style.display = "none"
    this.imageInput.value = ""
    this.uploadedImage = null
    this.detectBtn.disabled = true
    this.clearBtn.disabled = true
    this.resultsSection.classList.remove("active")
    this.verificationStatus.classList.remove("active")
    this.addLog("Image cleared")
  }

  addLog(message) {
    const timestamp = new Date().toLocaleTimeString()
    const entry = document.createElement("div")
    entry.className = "log-entry"
    entry.textContent = `[${timestamp}] ${message}`

    this.detectionLog.insertBefore(entry, this.detectionLog.firstChild)

    // Keep only last 20 entries
    while (this.detectionLog.children.length > 20) {
      this.detectionLog.removeChild(this.detectionLog.lastChild)
    }
  }
}

async function sendMetricsToBackend(numFaces) {
  if (!Number.isFinite(numFaces) || numFaces <= 0) return

  const densityLabelEl = document.getElementById("aiDensityLabel")
  const co2SavedEl = document.getElementById("aiCo2Saved")
  const walkTimeEl = document.getElementById("aiWalkTime")
  const energySavedEl = document.getElementById("aiEnergySaved")

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/ai/metrics`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ numFaces }),
    })

    if (!response.ok) {
      console.error("AI metrics backend error", response.status)
      return
    }

    const data = await response.json()

    if (densityLabelEl && typeof data.density_label === "string") {
      densityLabelEl.textContent = data.density_label
    }

    if (co2SavedEl && typeof data.co2_saved_readable === "string") {
      co2SavedEl.textContent = `CO₂ Saved (estimated): ${data.co2_saved_readable}`
    }

    if (walkTimeEl && typeof data.walk_time === "string") {
      walkTimeEl.textContent = `Equivalent walking time: ${data.walk_time}`
    }

    if (energySavedEl && typeof data.energy_saved === "number") {
      energySavedEl.textContent = `Estimated energy saved: ${data.energy_saved.toFixed(2)}`
    }
  } catch (error) {
    console.error("Failed to fetch AI metrics from backend", error)
  }
}

function setupAIMetricsObserver() {
  const faceCountEl = document.getElementById("faceCount")
  if (!faceCountEl) return

  let lastValue = null

  const observer = new MutationObserver(() => {
    const value = Number.parseInt(faceCountEl.textContent || "0", 10)
    if (!Number.isFinite(value) || value <= 0) return
    if (value === lastValue) return
    lastValue = value
    sendMetricsToBackend(value)
  })

  observer.observe(faceCountEl, {
    childList: true,
    characterData: true,
    subtree: true,
  })
}

// Initialize system on page load
document.addEventListener("DOMContentLoaded", () => {
  new FaceDetectionSystem()

  // Highlight active nav
  const currentPage = window.location.pathname.split("/").pop() || "face.html"
  const navLinks = document.querySelectorAll(".nav-links a")
  navLinks.forEach((link) => {
    link.classList.remove("active")
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active")
    }
  })
})

document.addEventListener("DOMContentLoaded", setupAIMetricsObserver)
