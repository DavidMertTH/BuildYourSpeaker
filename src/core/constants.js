export const AIR_DENSITY = 1.204;
export const SPEED_OF_SOUND = 343;
export const SPL_REFERENCE = 20e-6;
export const DEFAULT_DISTANCE = 1;

export const litersToCubicMeters = (liters) => liters / 1000;
export const cubicMetersToLiters = (cubicMeters) => cubicMeters * 1000;
export const cm2ToSquareMeters = (cm2) => cm2 / 10000;
export const mmToMeters = (mm) => mm / 1000;
export const gramsToKg = (grams) => grams / 1000;
export const mhToHenry = (mh) => mh / 1000;
export const cmToMeters = (cm) => cm / 100;
export const db = (value) => 20 * Math.log10(Math.max(value, 1e-30));
