import { JSDOM } from 'jsdom';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { spawnSync, SpawnSyncOptionsWithBufferEncoding, }  from 'child_process';
import { ERROR, VERB, WARN, } from './Logging';
import iconv from 'iconv-lite';
import { sha512 } from 'js-sha512';
import UrlParse from 'url-parse';

export { readAsJson } from './IOTools';
import { readAsJson } from './IOTools';

// private const DIGEST_KEY = 'TODO';

// export function createThumbFile(imageFile: string): string {
//   path.join('');
// }


/**
 * Degrees to Sexagesimal(DMS) notation
 * TODO consider naming
 */
export function floatToSexagesimal(v: number): [number, number, number] {
  const degrees = Math.trunc(v);

  v -= degrees;
  v *= 60;

  const min = Math.trunc(v);

  v -= min;
  v *= 60

  const sec = v;

  return [degrees, min, sec];
}

/**
 * Sexagesimal(DMS) notation to Degrees
 * TODO consider naming
 */
export function sexagesimalToFloat(degrees: number, min?: number, sec?: number): number {
  return degrees + ((min || 0) / 60) + ((sec || 0) / 3600);
}

/**
 * Validate Degrees text input
 * TODO consider naming
 */
export function validateGeoText(x: any): number {

  const s = validateString(x);

  if (!/^[-+]?[0-9]+(\.[0-9]+)?$/.test(s)) {
    throw new Error(`Not a valid number ${s}`);
  }

  return Number(s);
}

/**
 * Validate unknown input is string or not.
 */
export function validateString(x: any): string {
  if (!(typeof x === 'string')) {
    throw new Error(`Not a string ${x}`);
  }

  return x as string;
}

/**
 * Validate unknown input is optional string or not.
 */
export function validateOptionalString(x: any): string | undefined {

  if (typeof x === undefined) {
    return x;
  }

  return validateString(x);
}

/**
 * validate latitude,longitude text.
 * e.g. "30.12340, 130.34566" "-30.12340, -130.34566"
 * TODO test
 */
export function validateGeo(x: any): [number, number] {

  const s = validateString(x);
  const a = s.split(',').map(g => g.trim());

  if (a.length !== 2) {
    throw new Error(`Not a valid geo ${s}`);
  }

  const [lat, lng] = a.map(s => validateGeoText(s));

  return [lat, lng];
}

export function findField(json: any, fieldName: string): any {
  for (const f in json) {

    if (f === fieldName) {
      return json;
    }

    const v = json[f];

    if (typeof v === 'number') {
      return null;
    }

    if (typeof v === 'string') {
      return null;
    }

    if (typeof v === 'boolean') {
      return null;
    }

    // TODO array

    // TODO maybe not existing cyclic reference on json
    if (typeof v === 'object') {
      return findField(v, fieldName);
    }
  }
}

// TODO should test
function deepCopyJson(toJson: any, fromJson: any) {
  for (const k in fromJson) {
    const nv = fromJson[k];

    if (typeof toJson[k] === 'object' && typeof nv === 'object') {
      if (Array.isArray(nv)) {
        toJson[k] = nv;
      } else {
        deepCopyJson(toJson[k], nv);
      }
    } else {
      toJson[k] = nv;
    }
  }
}

//TODO dangerous. should not use this.
export function overwriteJson(file: string, json: any): void {
  let newJson;

  if (fs.existsSync(file)) {
    newJson = readAsJson(file);

    deepCopyJson(newJson, json);
  } else {
    newJson = json;
  }

  writeJson(file, newJson);
}

export function writeText(file: string, text: string): void {
  const dir = path.dirname(file);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(file, text);
}

export function writeJson(file: string, json: any): void {
  writeText(file, JSON.stringify(json));
}

export function readJsdom(html: string): JSDOM {
  return new JSDOM(html);
}

export async function readFileAsJsdom(file: string): Promise<JSDOM> {
  return await JSDOM.fromFile(file);
}

export function artificialIdentity(source: string[], size: number = -1): string {
  var hash = sha512.create();

  hash.update(source.join(':'));

  const hex = hash.hex();

  if (size <= 0) {
    return hex
  }

  return hex.substring(0, size);
}

//TODO create other module
export function makeRandomString(len: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
  let text = '';

  for (let i = 0; i < len; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // TODO consider security reason
  VERB(`Random generated ${text}`);

  return text;
}

export function makeTempfile() {
  const tempName = makeRandomString(30);
  const tempFilePath = path.join(os.tmpdir(), tempName);

  return tempFilePath;
}

export function downloadDocument(url: string, opts?: DownloadOpts): Document {
  const jsdom = downloadHtml(url, opts);

  return jsdom.window.document;
}

export function downloadHtml(url: string, opts?: DownloadOpts): JSDOM {
  const text =  downloadFile(url, opts);

  return readJsdom(text);
}

export function downloadText(url: string, opts?: DownloadOpts): string {
  return  downloadFile(url, opts);
}

export function downloadJson(url: string, opts?: DownloadOpts): any {
  const text = downloadFile(url, opts);

  return JSON.parse(text);
}

//TODO
let debugCache: Record<string, string> = {
};

export type SupportedEncoding =
  'shift_jis' | 'euc-jp' | 'utf-8'
;

export interface DownloadOpts {
  encoding?: SupportedEncoding;
  timeoutSeconds?: number;
  verbose?: boolean;
}

// TODO just index file timeout 10
export function downloadFile(url: string, opts?: DownloadOpts): string {

  if (url in debugCache) {
    WARN(`${url} in cache on debug purpose. Using the cache.`);
    const fn = debugCache[url];
    const file = path.join('working/__cache__', fn);
    const s = fs.readFileSync(file);

    return decodeBuffer(s, opts?.encoding);
  }

  const tmpFile = saveToTempFile(url, opts);

  const s = fs.readFileSync(tmpFile);

  return decodeBuffer(s, opts?.encoding);
}

function decodeBuffer(buffer: Buffer, coding?: string): string {
  if (coding && ['shift_jis', 'euc-jp'].includes(coding)) {
    return iconv.decode(buffer, coding);
  } else {
    const binary = Uint8Array.from(buffer);
    const decoder = new TextDecoder();

    return decoder.decode(binary);
  }
}

export function saveToTempFile(url: string, opts?: DownloadOpts): string {
  const tmpFile = makeTempfile();

  VERB(`Downloading ${url} to ${tmpFile}`);

  const timeoutSec = opts?.timeoutSeconds || 5;
  const debugOption = opts?.verbose ? [ '--debug', '--verbose' ] : [];
  const wgetArgs = [ ...debugOption, '--tries', '1', '--timeout', `${timeoutSec}`, '-O', tmpFile, url ];
  const spawnOpts: SpawnSyncOptionsWithBufferEncoding = {
    ...(opts?.verbose ? { stdio: 'inherit' } : {}),
  };

  try {
    const result = spawnSync('wget', wgetArgs, spawnOpts);

    if (result.status !== 0) {
      ERROR(`Failed exit wget with ${wgetArgs}`, result);
      throw new Error(`Failed exit wget ${wgetArgs} with ${result.status}`);
    }
  } catch (err) {
    if (fs.existsSync(tmpFile)) {
      fs.rmSync(tmpFile);
    }
    throw err;
  }

  return tmpFile;
}

export function readMD5hash(file: string): string {
  const result = spawnSync('md5sum', [file]);

  if (result.status !== 0) {
    throw new Error(`Failed to call md5sum command to ${file}`);
  }

  const binary = Uint8Array.from(result.stdout);
  const line = new TextDecoder().decode(binary);

  const m = /^([0-9a-fA-F]+)/.exec(line);

  if (!m) {
    throw new Error(`Failed to get md5 hash ${file}`);
  }

  return m[1];
}

/**
 * Nodejs doesn't have sleep. call `sleep` command ;-)
 */
export function randomSleep(max: number = 10): void {
  if (max <= 0) {
    return;
  }

  const sleepSec = Math.trunc(Math.random() * max);

  VERB(`Random sleep ${sleepSec}`);

  const result = spawnSync('sleep', [`${sleepSec}`]);

  if (result.status !== 0) {
    throw new Error(`Failed exit sleep.`);
  }
}

/**
 * @deprecated
 **/
export const saveToFile = saveToTempFile;

export function imagemagickConvert(sourceFile: string, filterArgs: string[], toFile: string): void {
  VERB(`Converting ${sourceFile} with ${filterArgs} ${toFile}`);

  const result = spawnSync('convert', [sourceFile, ...filterArgs, toFile]);

  if (result.status !== 0) {
    throw new Error(`Failed to convert ${sourceFile} with ${filterArgs}`);
  }
}


/**
 * Just read single image index.
 */
export function readSingleImagePage(indexUrl: string, opts?: DownloadOpts): string | null {
  const doc = downloadDocument(indexUrl, opts);

  const img = doc.querySelector('img');

  if (!img) {
    return null;
  }

  const src = img.getAttribute('src');

  if (!src) {
    return null;
  }

  return src;
}

/**
 * Just remove after '?'. This found many cases on web to avoid browser cache.
 */
export function washQueryString(url: string): string {
  const i = url.indexOf('?');

  if (i < 0) {
    return url;
  }

  return url.substring(0, i);
}

export function jsonNow(): string {
  return new Date().toISOString();
}

export function cloneJson(j: any): any {
  return JSON.parse(JSON.stringify(j));
}

export function joinUrl(urlPrefix: string, tail: string): string {
  const urlObj = new URL(tail, urlPrefix);

  return urlObj.toString();
}

/**
 * Parse googlemap url just read lat and lng from commonly used in iframe website
 * FIXME, TODO More elegant way or need other official utility. :-)
 */
export function parseGoogleMapIframeUrl(url: string): [number, number] {
  const urlObj = new UrlParse(url, true);

  const pb = urlObj.query['pb'];
  let lat: number | undefined;
  let lng: number | undefined;

  if (!pb) {
    throw new Error(`Not an expected url ${url}`);
  }

  for (const x of pb.split('!')) {
    let m;

    // 2d = lng 3d = lat
    if (m = /2d([0-9.]+)/.exec(x)) {
      lng = parseInt(m[1]);
    } else if (m = /3d([0-9.]+)/.exec(x)) {
      lat = parseInt(m[1]);
    } else {
    }
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error(`Unable to read lat and lng from ${url}`);
  }

  return [lat, lng];
}

// Longitude increment left to right
// Latitude increment bottom to top

export interface MapGeo {
  lat: number;
  lng: number;
}

export interface MapPixel {
  geo: MapGeo;
  /**
   * Pixel of left
   */
  left: number;
  /**
   * Pixel of top
   */
  top: number;
}

/**
 *
 * Currently support just NorthEast and SouthWest compution
 */
export interface MapPixelDefinition {
  NE: MapPixel;
  SW: MapPixel;
}

export class MapPixelAllocation {
  private bias: {
    pixelLat: number;
    pixelLng: number;
    lngBase: number;
    latBase: number;
  };

  constructor(def: MapPixelDefinition) {
    const lngComputeBase = def.SW.geo.lng;
    const latComputeBase = def.SW.geo.lat;
    const pixelLeftComputeBase = def.SW.left;
    const pixelTopComputeBase = def.SW.top;
    const pixelLng = (def.NE.geo.lng - lngComputeBase) / (def.NE.left - pixelLeftComputeBase);
    const pixelLat = (def.NE.geo.lat - latComputeBase) / (pixelTopComputeBase - def.NE.top);
    const lngBase = lngComputeBase - (pixelLeftComputeBase * pixelLng);
    const latBase = latComputeBase + (pixelTopComputeBase * pixelLat);

    this.bias = {
      pixelLat, pixelLng,
      lngBase, latBase,
    };
  }

  computeGeo(left: number, top: number): MapGeo {
    const lat = this.bias.latBase - (top * this.bias.pixelLat);
    const lng = this.bias.lngBase + (left * this.bias.pixelLng);

    return {
      lat, lng,
    };
  }
}

import { S2 } from 's2-geometry';
import { CrawlDataIndexDirectory, } from 'Settings';

export function getS2CellId(lat: number, lng: number) {
  const key = S2.latLngToKey(lat, lng, S2.MAX_LEVEL);

  return S2.keyToId(key);
}

export function getIndexLinkPath(id: string): string {
  const key = S2.idToKey(id);

  const [root, s2Path] = key.split('/');
  // TODO create splitter
  const s2Parts = s2Path.match(/^([0-3]{5})([0-3]{5})([0-3]{5})([0-3]{5})([0-3]{10})$/);

  if (!s2Parts) {
    throw new Error(`Unable match key of ${key} ${id}`);
  }

  const keyLink = path.join(CrawlDataIndexDirectory, root, s2Parts[1], s2Parts[2], s2Parts[3], s2Parts[4], s2Parts[5]);

  return keyLink;
}
