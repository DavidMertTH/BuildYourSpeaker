export function logFrequencyVector(start = 10, end = 1000, points = 320) {
  const result = [];
  const ratio = Math.log10(end / start);
  for (let index = 0; index < points; index += 1) {
    result.push(start * 10 ** ((ratio * index) / (points - 1)));
  }
  return result;
}

export function nearestFrequencyValue(frequencies, values, target) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  frequencies.forEach((frequency, index) => {
    const distance = Math.abs(frequency - target);
    if (distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  });
  return values[bestIndex];
}
