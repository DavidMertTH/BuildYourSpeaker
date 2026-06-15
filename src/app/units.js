export const UNIT_GROUPS = {
  resistance: [
    { id: "ohm", label: "ohm", fromBase: (value) => value, toBase: (value) => value, step: "0.01" },
  ],
  inductance: [
    { id: "mH", label: "mH", fromBase: (value) => value, toBase: (value) => value, step: "0.01" },
    { id: "uH", label: "uH", fromBase: (value) => value * 1000, toBase: (value) => value / 1000, step: "1" },
    { id: "H", label: "H", fromBase: (value) => value / 1000, toBase: (value) => value * 1000, step: "0.0001" },
  ],
  frequency: [
    { id: "Hz", label: "Hz", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "kHz", label: "kHz", fromBase: (value) => value / 1000, toBase: (value) => value * 1000, step: "0.001" },
  ],
  volume: [
    { id: "L", label: "L", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "m3", label: "m3", fromBase: (value) => value / 1000, toBase: (value) => value * 1000, step: "0.001" },
    { id: "ft3", label: "ft3", fromBase: (value) => value / 28.3168, toBase: (value) => value * 28.3168, step: "0.01" },
  ],
  area: [
    { id: "cm2", label: "cm2", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "m2", label: "m2", fromBase: (value) => value / 10000, toBase: (value) => value * 10000, step: "0.0001" },
    { id: "in2", label: "in2", fromBase: (value) => value / 6.4516, toBase: (value) => value * 6.4516, step: "0.1" },
  ],
  length: [
    { id: "mm", label: "mm", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "cm", label: "cm", fromBase: (value) => value / 10, toBase: (value) => value * 10, step: "0.01" },
    { id: "in", label: "in", fromBase: (value) => value / 25.4, toBase: (value) => value * 25.4, step: "0.001" },
  ],
  smallLength: [
    { id: "cm", label: "cm", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "mm", label: "mm", fromBase: (value) => value * 10, toBase: (value) => value / 10, step: "1" },
    { id: "in", label: "in", fromBase: (value) => value / 2.54, toBase: (value) => value * 2.54, step: "0.01" },
  ],
  mass: [
    { id: "g", label: "g", fromBase: (value) => value, toBase: (value) => value, step: "0.1" },
    { id: "kg", label: "kg", fromBase: (value) => value / 1000, toBase: (value) => value * 1000, step: "0.001" },
    { id: "oz", label: "oz", fromBase: (value) => value / 28.3495, toBase: (value) => value * 28.3495, step: "0.01" },
  ],
  compliance: [
    { id: "mm/N", label: "mm/N", fromBase: (value) => value, toBase: (value) => value, step: "0.001" },
    { id: "um/N", label: "um/N", fromBase: (value) => value * 1000, toBase: (value) => value / 1000, step: "1" },
  ],
  power: [
    { id: "W", label: "W", fromBase: (value) => value, toBase: (value) => value, step: "1" },
  ],
  percent: [
    { id: "%", label: "%", fromBase: (value) => value, toBase: (value) => value, step: "1" },
  ],
};
