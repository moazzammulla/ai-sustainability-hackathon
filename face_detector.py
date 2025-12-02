"""
Face Detector Module for Eco-Passenger Flow Optimization System
Uses MediaPipe for efficient real-time face detection optimized for 30 FPS webcam usage
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import Tuple, List, Dict


class FaceDetector:
    """
    Real-time face detector using MediaPipe Face Detection.
    Optimized for low CPU usage and 30 FPS performance without GPU dependency.
    """
    
    def __init__(self, min_detection_confidence: float = 0.5, model_selection: int = 0):
        """
        Initialize the FaceDetector.
        
        Args:
            min_detection_confidence: Minimum confidence value ([0.0, 1.0]) for detection to be considered successful
            model_selection: 0 for short-range detection (2m), 1 for full-range detection (5m)
        """
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Initialize face detection with optimized settings
        self.face_detection = self.mp_face_detection.FaceDetection(
            min_detection_confidence=min_detection_confidence,
            model_selection=model_selection
        )
        
        self.detection_count = 0
        
    def detect(self, frame: np.ndarray) -> Tuple[np.ndarray, List[Dict]]:
        """
        Detect faces in a frame and return annotated frame with detection data.
        
        Args:
            frame: Input image as numpy array (BGR format from OpenCV)
            
        Returns:
            Tuple containing:
                - annotated_frame: Frame with detection boxes and landmarks drawn
                - detections: List of detection dictionaries with bbox and confidence
        """
        if frame is None or frame.size == 0:
            return frame, []
        
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process the frame
        results = self.face_detection.process(rgb_frame)
        
        # Prepare output
        annotated_frame = frame.copy()
        detections = []
        
        if results.detections:
            for detection in results.detections:
                # Draw detection on frame
                self.mp_drawing.draw_detection(annotated_frame, detection)
                
                # Extract bounding box coordinates
                bboxC = detection.location_data.relative_bounding_box
                h, w, _ = frame.shape
                
                bbox = {
                    'x': int(bboxC.xmin * w),
                    'y': int(bboxC.ymin * h),
                    'width': int(bboxC.width * w),
                    'height': int(bboxC.height * h),
                    'confidence': detection.score[0]
                }
                
                detections.append(bbox)
            
            self.detection_count = len(results.detections)
        else:
            self.detection_count = 0
        
        # Add count overlay
        cv2.putText(
            annotated_frame,
            f'Faces Detected: {self.detection_count}',
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2,
            cv2.LINE_AA
        )
        
        return annotated_frame, detections
    
    def get_face_count(self) -> int:
        """
        Get the number of faces detected in the last frame.
        
        Returns:
            Number of faces detected
        """
        return self.detection_count
    
    def release(self):
        """
        Release MediaPipe resources.
        """
        self.face_detection.close()
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - ensures resources are released."""
        self.release()

