import * as fs from 'fs';

export function readAsJson(file: string): any {
  const s = fs.readFileSync(file);
  const binary = Uint8Array.from(s);
  const text = (new TextDecoder).decode(binary);

  return JSON.parse(text);
}
