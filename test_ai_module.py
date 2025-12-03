"""
Test Script for AI Module - Face Detection + Eco Metrics
Tests the face_detector.py and utils.py modules with live webcam feed
"""

import cv2
import time
from face_detector import FaceDetector
from utils import get_eco_metrics_summary, estimate_crowd_density, estimate_energy_saved


def main():
    """
    Main test function - opens webcam and runs face detection with eco-metrics.
    Press 'q' to quit, 'r' to toggle metrics refresh.
    """
    print("=" * 60)
    print("AI Module Test - Eco-Passenger Flow Optimization System")
    print("=" * 60)
    print("\nInitializing webcam and face detector...")
    
    # Initialize webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Could not open webcam")
        return
    
    # Set webcam properties for 30 FPS
    cap.set(cv2.CAP_PROP_FPS, 30)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    print("Webcam initialized successfully!")
    print("\nInitializing MediaPipe face detector...")
    
    # Initialize face detector with context manager
    with FaceDetector(min_detection_confidence=0.5) as detector:
        print("Face detector ready!")
        print("\n" + "=" * 60)
        print("CONTROLS:")
        print("  Press 'q' to quit")
        print("  Press 's' to take screenshot")
        print("=" * 60)
        
        # FPS calculation variables
        frame_count = 0
        start_time = time.time()
        fps = 0
        
        # Metrics refresh counter
        metrics_refresh_counter = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("ERROR: Failed to grab frame")
                break
            
            # Run face detection
            annotated_frame, detections = detector.detect(frame)
            num_faces = len(detections)
            
            # Calculate FPS
            frame_count += 1
            if frame_count >= 30:
                end_time = time.time()
                fps = frame_count / (end_time - start_time)
                frame_count = 0
                start_time = time.time()
            
            # Display FPS on frame
            cv2.putText(
                annotated_frame,
                f'FPS: {fps:.1f}',
                (10, 70),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 0),
                2,
                cv2.LINE_AA
            )
            
            # Show the frame
            cv2.imshow('Face Detection - Eco Flow System', annotated_frame)
            
            # Print eco-metrics to terminal every 30 frames (~1 second)
            metrics_refresh_counter += 1
            if metrics_refresh_counter >= 30:
                metrics_refresh_counter = 0
                print_eco_metrics(num_faces, detections)
            
            # Handle key presses
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                print("\nQuitting...")
                break
            elif key == ord('s'):
                # Save screenshot
                filename = f"screenshot_{int(time.time())}.jpg"
                cv2.imwrite(filename, annotated_frame)
                print(f"\nScreenshot saved: {filename}")
    
    # Cleanup
    cap.release()
    cv2.destroyAllWindows()
    print("\nTest completed successfully!")


def print_eco_metrics(num_faces: int, detections: list):
    """
    Print eco-metrics to terminal.
    
    Args:
        num_faces: Number of faces detected
        detections: List of detection dictionaries
    """
    print("\n" + "-" * 60)
    print(f"REAL-TIME ECO-METRICS | Timestamp: {time.strftime('%H:%M:%S')}")
    print("-" * 60)
    
    # Get crowd density
    density_label, density_index = estimate_crowd_density(num_faces)
    
    # Calculate energy saved
    energy_saved = estimate_energy_saved(density_index)
    
    # Print face detection info
    print(f"👥 Faces Detected: {num_faces}")
    print(f"📊 Crowd Density: {density_label} (Index: {density_index:.2f})")
    print(f"⚡ Energy Saved: {energy_saved:.2f} units")
    
    # Get full metrics for 1km reference distance
    metrics = get_eco_metrics_summary(num_faces, distance_m=1000)
    
    print(f"\n🌍 ECO-IMPACT (per 1 km walked):")
    print(f"  • CO2 Saved: {metrics['co2_saved_readable']}")
    print(f"  • Walking Time: {metrics['walk_time']}")
    print(f"  • Calories Burned: {metrics['calories']} kcal")
    
    # Print detection details if faces found
    if detections:
        print(f"\n🔍 Detection Details:")
        for i, det in enumerate(detections, 1):
            print(f"  Face {i}: Confidence {det['confidence']:.2f} | "
                  f"Position ({det['x']}, {det['y']}) | "
                  f"Size {det['width']}x{det['height']}")
    
    print("-" * 60)


def test_utils_only():
    """
    Test utility functions without webcam (for debugging).
    """
    print("\n" + "=" * 60)
    print("Testing Utility Functions")
    print("=" * 60)
    
    test_cases = [0, 1, 3, 5, 8, 12, 20]
    
    for num_faces in test_cases:
        print(f"\n--- Test Case: {num_faces} faces ---")
        metrics = get_eco_metrics_summary(num_faces, distance_m=2000)
        
        print(f"Density: {metrics['density_label']} ({metrics['density_index']:.2f})")
        print(f"CO2 Saved: {metrics['co2_saved_readable']}")
        print(f"Walk Time: {metrics['walk_time']}")
        print(f"Calories: {metrics['calories']} kcal")
        print(f"Energy Saved: {metrics['energy_saved']} units")
    
    print("\n" + "=" * 60)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--test-utils":
        # Test utilities only
        test_utils_only()
    else:
        # Run full test with webcam
        try:
            main()
        except KeyboardInterrupt:
            print("\n\nInterrupted by user. Exiting gracefully...")
        except Exception as e:
            print(f"\nERROR: {e}")
            import traceback
            traceback.print_exc()

