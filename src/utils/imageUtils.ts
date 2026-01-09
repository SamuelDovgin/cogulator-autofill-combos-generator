export const imgFromPath = (path: string) =>
  new URL(path, import.meta.url).href;
