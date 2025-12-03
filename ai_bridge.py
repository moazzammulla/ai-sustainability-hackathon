import json
import sys

from utils import get_eco_metrics_summary


def main() -> None:
    """Bridge between Node backend and Python AI eco-metrics module.

    Reads JSON from stdin with at least `numFaces` (or `num_faces`) and optional
    `distance_m`, then prints a JSON object with eco metrics to stdout.
    """
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw or "{}")
    except Exception as exc:  # defensive
        json.dump({"error": "Invalid JSON input", "details": str(exc)}, sys.stdout)
        return

    raw_num_faces = payload.get("numFaces", payload.get("num_faces", 0))
    try:
        num_faces = int(raw_num_faces)
    except (TypeError, ValueError):
        num_faces = 0

    raw_distance = payload.get("distance_m", 1000)
    try:
        distance_m = float(raw_distance)
    except (TypeError, ValueError):
        distance_m = 1000.0

    try:
        metrics = get_eco_metrics_summary(num_faces=num_faces, distance_m=distance_m)
    except Exception as exc:  # defensive
        json.dump({"error": "AI module error", "details": str(exc)}, sys.stdout)
        return

    json.dump(metrics, sys.stdout)


if __name__ == "__main__":
    main()
