function convert_CTVal(colorTemperature, brightness) {
    const warmWhiteRange = [2000, 3000];
    const coolWhiteRange = [6000, 7000];
    const normalizedColorTemperature = (colorTemperature - warmWhiteRange[0]) / (coolWhiteRange[1] - warmWhiteRange[0]);
    const warmWhitePercentage = Math.max(0, Math.min(100, normalizedColorTemperature * 100));
    const coolWhitePercentage = 100 - warmWhitePercentage;
    const adjustedCoolWhite = (warmWhitePercentage * brightness) / 100;
    const adjustedWarmWhite = (coolWhitePercentage * brightness) / 100;
    return { adjustedWarmWhite, adjustedCoolWhite };
}

module.exports = { convert_CTVal }