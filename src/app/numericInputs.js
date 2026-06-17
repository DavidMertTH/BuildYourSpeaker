export function initializeNumericInputs(root = document) {
  root.querySelectorAll('input[type="number"]').forEach(enableDecimalTextInput);
}

export function enableDecimalTextInput(input) {
  if (!input || input.dataset.numericInput === "true" || input.type !== "number") return;
  input.dataset.numericInput = "true";
  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";
}

export function isNumericInput(field) {
  return field?.dataset?.numericInput === "true" || field?.type === "number";
}

export function parseNumericInputValue(fieldOrValue) {
  const value = typeof fieldOrValue === "string" || typeof fieldOrValue === "number"
    ? fieldOrValue
    : fieldOrValue?.value;
  const text = String(value ?? "").trim().replace(",", ".");
  return text ? Number(text) : NaN;
}
