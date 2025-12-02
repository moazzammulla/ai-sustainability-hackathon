"""
Utility Functions for Eco-Passenger Flow Optimization System
Provides calculations for CO2 savings, energy metrics, and crowd density estimation
"""

from typing import Tuple


# Constants based on environmental research
CO2_PER_KM_CAR = 0.171  # kg CO2 per km for average car
CO2_PER_KM_WALKING = 0.0  # Walking produces negligible CO2
AVERAGE_WALKING_SPEED = 1.4  # meters per second (5 km/h)
CALORIES_PER_KM_WALKING = 50  # Average calories burned per km walking
ENERGY_BASELINE = 100  # Baseline energy units for empty space


def calc_co2_saved_by_walking(distance_m: float) -> float:
    """
    Calculate CO2 saved by walking instead of driving.
    
    Args:
        distance_m: Distance in meters
        
    Returns:
        CO2 saved in kilograms
    """
    if distance_m <= 0:
        return 0.0
    
    distance_km = distance_m / 1000.0
    co2_saved = distance_km * CO2_PER_KM_CAR
    
    return round(co2_saved, 3)


def human_readable_co2(kg: float) -> str:
    """
    Convert CO2 in kg to human-readable format.
    
    Args:
        kg: CO2 amount in kilograms
        
    Returns:
        Formatted string with appropriate units
    """
    if kg < 0:
        return "0 g"
    
    if kg < 1:
        grams = kg * 1000
        return f"{grams:.0f} g"
    elif kg < 1000:
        return f"{kg:.2f} kg"
    else:
        tonnes = kg / 1000
        return f"{tonnes:.2f} tonnes"


def estimate_walk_time(distance_m: float) -> str:
    """
    Estimate walking time for a given distance.
    
    Args:
        distance_m: Distance in meters
        
    Returns:
        Formatted time string (e.g., "5 min" or "1 hr 20 min")
    """
    if distance_m <= 0:
        return "0 min"
    
    time_seconds = distance_m / AVERAGE_WALKING_SPEED
    time_minutes = int(time_seconds / 60)
    
    if time_minutes < 60:
        return f"{time_minutes} min"
    else:
        hours = time_minutes // 60
        minutes = time_minutes % 60
        if minutes > 0:
            return f"{hours} hr {minutes} min"
        else:
            return f"{hours} hr"


def estimate_calories_burned(distance_m: float) -> int:
    """
    Estimate calories burned by walking a given distance.
    
    Args:
        distance_m: Distance in meters
        
    Returns:
        Calories burned (integer)
    """
    if distance_m <= 0:
        return 0
    
    distance_km = distance_m / 1000.0
    calories = distance_km * CALORIES_PER_KM_WALKING
    
    return int(round(calories))


def estimate_crowd_density(num_faces: int) -> Tuple[str, float]:
    """
    Estimate crowd density level based on number of detected faces.
    Returns both a categorical label and a density index (0.0-1.0).
    
    Args:
        num_faces: Number of faces detected in frame
        
    Returns:
        Tuple of (density_label, density_index)
            - density_label: "Empty", "Low", "Medium", "High", or "Very High"
            - density_index: Float between 0.0 and 1.0
    """
    if num_faces <= 0:
        return "Empty", 0.0
    elif num_faces <= 2:
        return "Low", 0.2
    elif num_faces <= 5:
        return "Medium", 0.5
    elif num_faces <= 10:
        return "High", 0.75
    else:
        return "Very High", 1.0


def estimate_energy_saved(density_index: float) -> float:
    """
    Estimate energy saved based on crowd density.
    Higher density = more people choosing sustainable transport = more energy saved.
    
    Args:
        density_index: Density index from 0.0 to 1.0
        
    Returns:
        Energy saved in arbitrary units (0-100)
    """
    if density_index < 0:
        density_index = 0.0
    elif density_index > 1:
        density_index = 1.0
    
    # Energy saved scales with crowd density
    # More people walking = more collective energy savings
    energy_saved = ENERGY_BASELINE * density_index
    
    return round(energy_saved, 2)


def get_eco_metrics_summary(num_faces: int, distance_m: float = 1000) -> dict:
    """
    Get a complete summary of eco-metrics for display.
    Convenience function for getting all metrics at once.
    
    Args:
        num_faces: Number of faces detected
        distance_m: Reference distance for calculations (default 1km)
        
    Returns:
        Dictionary containing all eco-metrics
    """
    density_label, density_index = estimate_crowd_density(num_faces)
    co2_saved = calc_co2_saved_by_walking(distance_m)
    
    return {
        'num_faces': num_faces,
        'density_label': density_label,
        'density_index': density_index,
        'co2_saved_kg': co2_saved,
        'co2_saved_readable': human_readable_co2(co2_saved),
        'walk_time': estimate_walk_time(distance_m),
        'calories': estimate_calories_burned(distance_m),
        'energy_saved': estimate_energy_saved(density_index),
        'distance_km': distance_m / 1000.0
    }

