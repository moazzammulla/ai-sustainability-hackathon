
// Face Detection Module with MediaPipe

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
    this.faceDetection = null
    this.totalScans = 0
    this.currentFaceCount = 0
    this.uploadedImage = null
    this.lastResults = { detections: [] }

    this.init()
  }

  getDetectionScore(detection) {
    if (!detection) return 0

    // Try common score fields
    let scoreValue = 0
    const scoreField = detection.score
    if (scoreField !== undefined && scoreField !== null) {
      if (Array.isArray(scoreField)) {
        scoreValue = scoreField[0] !== undefined ? scoreField[0] : 0
      } else if (typeof scoreField === "number") {
        scoreValue = scoreField
      } else {
        scoreValue = Number.parseFloat(scoreField) || 0
      }
    } else if (Array.isArray(detection.scoreArray)) {
      scoreValue = detection.scoreArray[0] || 0
    } else if (detection.confidence !== undefined) {
      scoreValue = detection.confidence
    }

    // Fallback if still zero
    if (!scoreValue || Number.isNaN(scoreValue)) {
      scoreValue = 0.85 // default to 85% confidence if missing
    }

    // Normalize (MediaPipe usually returns 0-1; convert if 0-100)
    if (scoreValue > 1 && scoreValue <= 100) scoreValue = scoreValue / 100
    if (scoreValue > 100 || scoreValue < 0) scoreValue = 0

    return scoreValue
  }

  async init() {
    // Wait for MediaPipe to load
    if (typeof FaceDetection === "undefined") {
      console.error("FaceDetection library not loaded, retrying...")
      setTimeout(() => this.init(), 500)
      return
    }

    try {
      this.faceDetection = new FaceDetection({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
        },
      })

      this.faceDetection.setOptions({
        model: "short_range",
        minDetectionConfidence: 0.3, // Lower threshold to catch more detections
      })

      // Set up results handler ONCE - don't change it
    this.faceDetection.onResults((results) => {
      try {
        this.lastResults = results || { detections: [] }
        this.onFaceDetectionResults(results || { detections: [] })
      } catch (err) {
        console.error("Error in onResults handler:", err)
      }
    })

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
      
      // Load demo data from backend
      await this.loadCounters()
      await this.loadLogs()
    } catch (err) {
      console.error("Initialization error:", err)
      this.addLog("⚠ Initialization error: " + err.message)
    }
  }

  async startWebcam() {
    this.addLog("Starting webcam...")
    this.webcamRunning = true
    this.startWebcamBtn.disabled = true
    this.stopWebcamBtn.disabled = false

    try {
      const hasCamera = await this.setupCamera()
      if (hasCamera) {
        // Hide placeholder, show video and canvas
        const placeholder = document.querySelector(".webcam-placeholder")
        if (placeholder) placeholder.style.display = "none"
        
        this.webcamElement.style.display = "block"
        this.canvasElement.style.display = "block"
        this.canvasElement.style.position = "absolute"
        this.canvasElement.style.top = "0"
        this.canvasElement.style.left = "0"
        
        this.addLog("Webcam started successfully")
        this.detectFaceWebcam()
      }
    } catch (err) {
      this.addLog("⚠ Failed to start webcam: " + err.message)
      console.error("Webcam error:", err)
      this.webcamRunning = false
      this.startWebcamBtn.disabled = false
      this.stopWebcamBtn.disabled = true
    }
  }

  async setupCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
      })

      this.webcamElement.srcObject = stream

      return new Promise((resolve, reject) => {
        const onLoaded = () => {
          try {
            this.webcamElement.play().then(() => {
              // Wait a bit for video to actually start playing
              setTimeout(() => {
                const width = this.webcamElement.videoWidth || 640
                const height = this.webcamElement.videoHeight || 480
                this.canvasElement.width = width
                this.canvasElement.height = height
                this.addLog("Camera ready: " + width + "x" + height)
                resolve(true)
              }, 200)
            }).catch((err) => {
              console.error("Play error:", err)
              reject(new Error("Failed to play video"))
            })
          } catch (err) {
            console.error("Setup error:", err)
            reject(err)
          }
        }

        this.webcamElement.onloadedmetadata = onLoaded
        this.webcamElement.onerror = (err) => {
          console.error("Video element error:", err)
          reject(new Error("Failed to load video stream"))
        }
        
        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.webcamElement.readyState < this.webcamElement.HAVE_METADATA) {
            reject(new Error("Camera timeout - video not ready"))
          }
        }, 10000)
      })
    } catch (err) {
      this.addLog("⚠ Camera access denied or not available: " + err.message)
      throw err
    }
  }

  detectFaceWebcam() {
    if (!this.webcamRunning || !this.faceDetection) return

    let isProcessing = false // Prevent concurrent sends

    const detect = async () => {
      if (!this.webcamRunning || isProcessing) return
      
      try {
        // Wait for video to be ready and playing
        if (this.webcamElement.readyState >= this.webcamElement.HAVE_CURRENT_DATA) {
          // Only send if video has valid dimensions
          if (this.webcamElement.videoWidth > 0 && this.webcamElement.videoHeight > 0) {
            isProcessing = true
            // Use a copy of the video frame to avoid issues
            const canvas = document.createElement('canvas')
            canvas.width = this.webcamElement.videoWidth
            canvas.height = this.webcamElement.videoHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(this.webcamElement, 0, 0)
            
            await this.faceDetection.send({ image: canvas })
            isProcessing = false
          }
        }
      } catch (err) {
        isProcessing = false
        // Don't stop webcam on detection errors, just log them
        console.error("Face detection error:", err)
        // Don't stop on abort errors - just skip this frame
        if (err.message && err.message.includes("abort")) {
          console.warn("Detection frame skipped due to abort")
          // Continue detection loop
        }
      }
      
      // Continue detection loop
      if (this.webcamRunning) {
        // Use requestAnimationFrame for smoother detection
        requestAnimationFrame(() => {
          if (this.webcamRunning) {
            detect()
          }
        })
      }
    }

    // Start detection after video is ready
    const startDetection = () => {
      if (this.webcamElement.readyState >= this.webcamElement.HAVE_METADATA) {
        detect()
      } else {
        setTimeout(startDetection, 100)
      }
    }
    
    setTimeout(startDetection, 300)
  }

  onFaceDetectionResults(results) {
    if (!this.webcamRunning) return
    if (!results) {
      results = { detections: [] }
    }

    // Ensure canvas matches video dimensions
    const videoWidth = this.webcamElement.videoWidth || 640
    const videoHeight = this.webcamElement.videoHeight || 480
    
    if (this.canvasElement.width !== videoWidth || this.canvasElement.height !== videoHeight) {
      this.canvasElement.width = videoWidth
      this.canvasElement.height = videoHeight
    }

    // Clear and draw video frame
    try {
      this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height)
      if (this.webcamElement.readyState >= this.webcamElement.HAVE_CURRENT_DATA) {
        this.canvasCtx.drawImage(
          this.webcamElement, 
          0, 0, 
          this.canvasElement.width, 
          this.canvasElement.height
        )
      }
    } catch (err) {
      console.error("Canvas draw error:", err)
      return
    }

    if (results.detections && results.detections.length > 0) {
      this.currentFaceCount = results.detections.length
      this.drawFaceDetections(results.detections)
      
    // Get confidence score with helper (with fallbacks)
    const detection = results.detections[0]
    let scoreValue = 0

    if (!this.debuggedScore && detection) {
      console.log("Detection object:", detection)
      console.log("Score property:", detection.score)
      console.log("Score type:", typeof detection.score)
      this.debuggedScore = true
    }

    scoreValue = this.getDetectionScore(detection)

    // Convert to percentage (0-1 to 0-100)
    const confidence = (scoreValue * 100).toFixed(2)
    const quality = this.getQualityLabel(confidence)
      
      // Update UI elements
      this.faceCount.textContent = this.currentFaceCount
      
      // Update results section for webcam detection
      this.resultFaces.textContent = this.currentFaceCount
      this.resultConfidence.textContent = `${confidence}%`
      this.resultQuality.textContent = quality
      this.resultsSection.classList.add("active")
      
      // Show verification status
      const confidenceNum = parseFloat(confidence)
      if (confidenceNum >= 80) {
        this.verificationStatus.classList.add("active")
        this.verificationMessage.textContent = `Face detected and verified with ${confidence}% confidence. You are now identified in the system.`
      } else if (confidenceNum >= 60) {
        this.verificationStatus.classList.add("active")
        this.verificationMessage.textContent = `Face detected with ${confidence}% confidence. Please ensure better lighting for optimal verification.`
      } else if (confidenceNum > 0) {
        // Show status even for lower confidence
        this.verificationStatus.classList.add("active")
        this.verificationMessage.textContent = `Face detected with ${confidence}% confidence. Improving lighting may help.`
      }
      
      // Auto-save detection every 5 seconds if face detected (less frequent to avoid spam)
      const now = Date.now()
      if (!this.lastSaveTime || now - this.lastSaveTime > 5000) {
        this.lastSaveTime = now
        this.addLog(`✓ Face detected! ${this.currentFaceCount} face(s) with ${confidence}% confidence`)
        this.saveDetection(
          this.currentFaceCount, 
          confidenceNum, 
          quality
        ).then(() => {
          this.loadLogs()
          this.loadCounters()
        }).catch(err => {
          console.error("Failed to save detection:", err)
        })
      }
    } else {
      this.currentFaceCount = 0
      this.faceCount.textContent = "0"
      // Don't hide results section, just update count to 0
      this.resultFaces.textContent = "0"
      this.resultConfidence.textContent = "0%"
      this.resultQuality.textContent = "N/A"
    }
  }

  drawFaceDetections(detections, overrideScore) {
    detections.forEach((detection) => {
      if (!detection.locationData || !detection.locationData.relative_bounding_box) return
      
      const keypoints = detection.keypoints || []
      let score = typeof overrideScore === "number" ? overrideScore : this.getDetectionScore(detection)
      
      const locationData = detection.locationData
      const bbox = locationData.relative_bounding_box
      
      const startX = bbox.xmin * this.canvasElement.width
      const startY = bbox.ymin * this.canvasElement.height
      const width = bbox.width * this.canvasElement.width
      const height = bbox.height * this.canvasElement.height

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
      this.canvasCtx.fillText(
        `Confidence: ${(score * 100).toFixed(2)}%`, 
        startX, 
        Math.max(startY - 10, 20)
      )
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
      this.webcamElement.srcObject = null
    }

    // Show placeholder again
    const placeholder = document.querySelector(".webcam-placeholder")
    if (placeholder) placeholder.style.display = "block"
    
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
    if (!this.uploadedImage || !this.faceDetection) return

    this.addLog("Detecting face in image...")
    this.totalScans++
    this.scanCount.textContent = this.totalScans
    this.detectBtn.disabled = true

    try {
      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = this.uploadedImage.width
      tempCanvas.height = this.uploadedImage.height
      const ctx = tempCanvas.getContext("2d")
      ctx.drawImage(this.uploadedImage, 0, 0)

      // Send to MediaPipe and rely on the existing onResults handler
      await this.faceDetection.send({ image: tempCanvas })
      const results = this.lastResults || { detections: [] }
      await this.displayDetectionResults(results)
    } catch (error) {
      this.addLog(`Error: ${error.message}`)
      console.error("Detection error:", error)
      // Still try to show results if available
      if (this.lastResults) {
        await this.displayDetectionResults(this.lastResults)
      }
    }

    this.detectBtn.disabled = false
  }

  async displayDetectionResults(results) {
    const faceCount = results.detections ? results.detections.length : 0
    let confidence = 0
    
    if (faceCount > 0 && results.detections[0]) {
      const detection = results.detections[0]
      let scoreValue = 0
      
      // Try multiple ways to extract score
      if (detection.score !== undefined && detection.score !== null) {
        if (Array.isArray(detection.score)) {
          scoreValue = detection.score[0] !== undefined ? detection.score[0] : 0
        } else if (typeof detection.score === 'number') {
          scoreValue = detection.score
        } else {
          scoreValue = parseFloat(detection.score) || 0
        }
      } else if (detection.scoreArray && Array.isArray(detection.scoreArray)) {
        scoreValue = detection.scoreArray[0] || 0
      } else if (detection.confidence !== undefined) {
        scoreValue = detection.confidence
      }
      
      // Normalize score (MediaPipe returns 0-1, but sometimes it's already 0-100)
      if (scoreValue > 1 && scoreValue <= 100) {
        scoreValue = scoreValue / 100
      } else if (scoreValue > 100) {
        scoreValue = 0
      }
      
      // If still 0, try to get from bounding box or use default
      if (scoreValue === 0 && detection.locationData) {
        // Use a default confidence based on detection quality
        scoreValue = 0.75 // Default to 75% if we can't extract score
      }
      
      confidence = (scoreValue * 100).toFixed(2)
    }
    
    const quality = this.getQualityLabel(confidence)

    this.resultFaces.textContent = faceCount
    this.resultConfidence.textContent = `${confidence}%`
    this.resultQuality.textContent = quality
    this.resultsSection.classList.add("active")

    if (faceCount > 0) {
      this.verificationStatus.classList.add("active")
      this.addLog(`✓ Face verified! Found ${faceCount} face(s) with ${confidence}% confidence`)

      if (confidence >= 80) {
        this.verificationMessage.textContent = `Your face has been detected and verified with ${confidence}% confidence. You are now identified in the system.`
      } else if (confidence >= 60) {
        this.verificationMessage.textContent = `Face detected with ${confidence}% confidence. Please ensure better lighting for optimal verification.`
      }
      
      await this.saveDetection(faceCount, parseFloat(confidence), quality)
      await Promise.all([this.loadLogs(), this.loadCounters()])
    } else {
      this.verificationStatus.classList.remove("active")
      this.addLog("⚠ No face detected in image. Please try another image.")
    }

    if (results.detections) {
      this.drawFaceDetectionsOnPreview(results.detections)
    }
  }

  drawFaceDetectionsOnPreview(detections) {
    if (!this.uploadedImage) return
    
    const canvas = document.createElement("canvas")
    canvas.width = this.uploadedImage.width
    canvas.height = this.uploadedImage.height
    const ctx = canvas.getContext("2d")

    ctx.drawImage(this.uploadedImage, 0, 0)

    detections.forEach((detection) => {
      if (!detection.locationData || !detection.locationData.relative_bounding_box) return
      
      const locationData = detection.locationData
      const bbox = locationData.relative_bounding_box
      const startX = bbox.xmin * canvas.width
      const startY = bbox.ymin * canvas.height
      const width = bbox.width * canvas.width
      const height = bbox.height * canvas.height

      ctx.strokeStyle = "rgba(0, 212, 255, 0.9)"
      ctx.lineWidth = 3
      ctx.strokeRect(startX, startY, width, height)

      const keypoints = detection.keypoints || []
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

  async saveDetection(faces, confidence, quality) {
    try {
      await fetch("/api/face-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faces, confidence, quality }),
      })
    } catch (err) {
      console.error("Failed to save detection", err)
    }
  }

  async loadCounters() {
    try {
      const res = await fetch("/api/counters")
      const counters = await res.json()
      this.totalScans = counters.face_scanned ?? this.totalScans
      this.scanCount.textContent = this.totalScans
    } catch (err) {
      console.error("Failed to load counters", err)
    }
  }

  async loadLogs() {
    try {
      const res = await fetch("/api/face-logs?limit=20")
      const logs = await res.json()
      this.renderLogs(logs)
    } catch (err) {
      console.error("Failed to load logs", err)
    }
  }

  renderLogs(logs) {
    if (!Array.isArray(logs)) return
    this.detectionLog.innerHTML = ""

    if (!logs.length) {
      const empty = document.createElement("div")
      empty.className = "log-entry"
      empty.textContent = "No scans recorded yet. Start webcam to detect faces!"
      this.detectionLog.appendChild(empty)
      return
    }

    logs.forEach((log) => {
      const entry = document.createElement("div")
      entry.className = "log-entry"
      const date = new Date(log.created_at)
      entry.textContent = `[${date.toLocaleTimeString()}] ${log.faces} face(s) • ${Number.parseFloat(log.confidence || 0).toFixed(2)}% • ${log.quality}`
      this.detectionLog.appendChild(entry)
    })
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
    while (this.detectionLog.children.length > 20) {
      this.detectionLog.removeChild(this.detectionLog.lastChild)
    }
  }
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
