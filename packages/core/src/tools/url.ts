const appIdRegExp = new RegExp(/app\/(\d+)\/?/);

export function parseUrl(path: string) {
  return path.match(appIdRegExp)?.[1];
}
