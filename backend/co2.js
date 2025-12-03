// CO₂ calculator logic
function calculateCO2(emissionPerPerson, passengers) {
  return emissionPerPerson * passengers;
}

// Category based on total CO₂
function getCO2Category(totalCO2) {
  if (totalCO2 <= 150) return "Low Emission";
  if (totalCO2 <= 300) return "Moderate Emission";
  return "High Emission";
}

module.exports = { calculateCO2, getCO2Category };
