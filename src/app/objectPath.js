export function getPath(object, path) {
  return path.split(".").reduce((value, key) => value[key], object);
}

export function setPath(object, path, value) {
  const parts = path.split(".");
  const key = parts.pop();
  const target = parts.reduce((item, part) => item[part], object);
  target[key] = value;
}
