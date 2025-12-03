// Eco-friendly travel tips based on emission category
function getEcoTips(category) {
  if (category === "Low Emission") {
    return [
      "Great job! Low CO₂ impact.",
      "Continue choosing short routes and efficient airlines.",
      "Prefer direct flights whenever possible."
    ];
  }

  if (category === "Moderate Emission") {
    return [
      "Consider using eco-friendly airlines.",
      "Carry less weight to reduce aircraft fuel burn.",
      "Use public transport once you reach your destination."
    ];
  }

  // High emission tips
  return [
    "Try to fly economy instead of business class.",
    "Look for direct flights — connecting flights produce more CO₂.",
    "Offset your carbon footprint through carbon-offset programs.",
    "Avoid unnecessary luggage — weight increases fuel burn."
  ];
}

module.exports = { getEcoTips };
