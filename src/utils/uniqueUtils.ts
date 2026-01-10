let currentId = 0;
export function getUniqueId() {
  return `optimal${currentId++}`;
}
