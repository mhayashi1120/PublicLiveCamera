import * as path from 'path';
import * as fs from 'fs';
import { readAsJson, writeJson, downloadJson } from 'CrawlerTools';
import { sha512 } from 'js-sha512';
import { fromUint8Array as encodeBase64 } from 'js-base64';
import UrlParse from 'url-parse';
import { GeoLocationDirectory } from 'Settings';

import { VERB } from 'Logging';

/**
 * Hint to search by area name (Many Camera has location name)
 */
export interface LocationHintDatabase {
  /**
   * Search query prefix of each `locations[].title` field. Useful when
   * the title contains general name.
   */
  wideAreaName?: string;
  /**
   * Database body of the hint.
   */
  locations?: SearchableLocation[];
}

export interface SearchableLocation {
  /**
   * area/location name as Camera key. This rarely changed and many cases unique on any pages.
   */
  title: string;
  /**
   * set true after work is done. should not set roughly set the value
   */
  strictWork?: true,
  /**
   * Special query rather tahn `title` field.
   */
  alterQuery?: string;

  lat?: number;
  lng?: number;
  direction?: number;
}

export function trySearchLocation(name: string, hint: LocationHintDatabase): CameraResultJson | null {
  if (hint.locations) {
    for (const entry of hint.locations) {
      if (entry.title && name !== entry.title) {
        continue;
      }

      if (typeof entry.lat === 'number' && typeof entry.lng === 'number') {
        return {
          location: {
            lat: entry.lat,
            lng: entry.lng,
          },
          direction: entry.direction,
          isFuzzy: !entry.strictWork,
        };
      }

      if (entry.alterQuery) {
        name = entry.alterQuery;
      }

      break;
    }
  }

  const fullName = `${hint.wideAreaName || ''} ${name}`;

  const location = callGoogleGeoApi(fullName);

  if (!location) {
    return null;
  }

  return {
    location,
    isFuzzy: true,
  }
}

export interface CameraResultJson {
  location: LocationJson;
  direction?: number;
  isFuzzy: boolean;
}

export type LocationsJson = LocationJson[];

export interface LocationJson {
  lat: number;
  lng: number;
}

/**
 * call google geo api with refering/creating cache.
 * NOTE: cache consideration
 * On this program just need unique result that automatically processed by crawler.
 * so does not cache multiple results. just unique result.
 */
export function callGoogleGeoApi(name: string): LocationJson | null {
  var hash = sha512.create();

  hash.update(name);

  const array = hash.arrayBuffer()
  const u8 = new Uint8Array(array.slice(0, 20));
  const b64 = encodeBase64(u8, true).replace(/=+$/, '');

  const d1 = b64.substring(0, 2);
  const d2 = b64.substring(2, 4);
  const fn = b64.substring(4);

  const cacheFile = path.join(GeoLocationDirectory, `${d1}/${d2}/${fn}.json`);

  if (fs.existsSync(cacheFile)) {
    VERB(`hitting cache for ${name} . Reading.`);
    const locJson = readAsJson(cacheFile) as LocationsJson;

    if (locJson.length !== 1) {
      return null;
    }

    return locJson[0];
  }

  const token = process.env['LIVECAMERA_GOOGLE_API_TOKEN'];

  if (!token) {
    throw new Error(`No token is supplied via Environment.`);
  }

  const endPointUrl = new UrlParse('https://maps.google.com/maps/api/geocode/json', true);

  endPointUrl.query['address'] = name;
  endPointUrl.query['key'] = token;

  // TODO consider use node library. not wget.
  const resultJson = downloadJson(endPointUrl.toString());

  if (resultJson['status'] !== 'OK') {
    return null;
  }

  const results = resultJson['results'] as Array<any>;
  const locationsJson: LocationsJson = [];

  for (const r of results) {
    const location = r['geometry']['location'];

    const lat = location['lat'];
    const lng = location['lng'];

    const geoJson: LocationJson = {
      lat,
      lng,
    };

    locationsJson.push(geoJson);
  }

  writeJson(cacheFile, locationsJson);

  if (results.length !== 1) {
    // No unique result
    return null;
  }

  return locationsJson[0];
}
