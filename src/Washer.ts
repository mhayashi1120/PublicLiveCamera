import * as path from 'path';
import * as fs from 'fs';

import { S2, S2CellKey, } from 's2-geometry';

import  { WARN, } from './Logging';
import { readAsJson } from './CrawlerTools';
import { RawLocationJson, } from './CrawlerTypes';

import { CrawlDataIndexDirectory } from './Settings';

// TODO consider level
const NEARBY_LEVEL = 25;
// TODO some of nearby level should be merged into one location.

export class Washer {

  constructor(
  ){
  }

  // TODO consider indexedAt is too old entry
  fullCheckDuplicates(): void {
    this.runNearbyFullCheck(CrawlDataIndexDirectory);
  }

  checkLocalDuplicates(topdir: string): void {
    for (const fn of fs.readdirSync(topdir)){
      const file = path.join(topdir, fn);
      const stat = fs.statSync(file);

      if (stat.isDirectory()) {
        this.checkLocalDuplicates(file);
      } else {
        const json = readAsJson(file) as RawLocationJson;
        const s2key = S2.idToKey(json.s2cellId);
        const segments = this.splitToCrawlPathSegment(s2key);
        const lnkFile = path.join(CrawlDataIndexDirectory, ...segments);

        this.checkNearby(s2key, lnkFile);
      }
    }
  }

  private checkNearby(s2key: S2CellKey, file: string): boolean {
    const latLng = S2.keyToLatLng(s2key);
    const neighbors = S2.latLngToNeighborKeys(latLng.lat, latLng.lng, NEARBY_LEVEL);
    const me = S2.latLngToKey(latLng.lat, latLng.lng, NEARBY_LEVEL);
    const allLinks = this.getDescendantLinks(me, neighbors);
    const myIndex = allLinks.findIndex(l => l === file);

    if (myIndex < 0) {
      console.error(`Failed search index. This must be found. ${file}`);
      return false;
    }

    if (allLinks.length === 1) {
      return true;
    }

    WARN(`Found nearby`, allLinks);

    allLinks.splice(myIndex, 1);

    // TODO what should do? just warn?
    return false;
  }

  private runNearbyFullCheck(dir: string, keyPrefix: string = '') {
    for (const fn of fs.readdirSync(dir)) {
      const file = path.join(dir, fn);
      const stat = fs.statSync(file);
      const s2key = keyPrefix === '' ? `${fn}/` : `${keyPrefix}${fn}`;

      if (stat.isDirectory()) {
        this.runNearbyFullCheck(file, s2key);
      } else {
        if (this.checkNearby(s2key, file)) {
          continue;
        }
      }
    }
  }

  // TODO share the function
  private splitToCrawlPathSegment(key: S2CellKey): string[] {
    const [root, path] = key.split('/');

    let p = path;
    const res = [root];
    const segmentLen = [5, 5, 5, 5, 10];

    for (let i = 0; 0 < p.length; i++) {
      const len = segmentLen[i];
      const segment = p.substring(0, len);

      res.push(segment);

      p = p.substring(len);
    }

    return res;
  }

  private getDescendantLinks(me: S2CellKey, neibors: S2CellKey[]): string[] {
    const keys = [...neibors, me];
    const neiborSegments: string[][] = [];

    for (const k of keys) {
      const segment = this.splitToCrawlPathSegment(k);

      if (!neiborSegments.find(xs => {
        if (xs.length !== segment.length) {
          return false;
        }

        for (let i = 0; i < xs.length; i++) {
          if (xs[i] !== segment[i]) {
            return false;
          }
        }

        return true;
      })) {
        neiborSegments.push(segment);
      }
    }

    let descendants: S2CellKey[] = [];

    for (const n of neiborSegments) {
      const pathPrefix = path.join(CrawlDataIndexDirectory, ...n);
      const pathDir = path.dirname(pathPrefix);
      const pathFn = path.basename(pathPrefix);

      if (!fs.existsSync(pathDir)) {
        continue;
      }

      for (const fn of fs.readdirSync(pathDir)) {
        if (!fn.startsWith(pathFn)) {
          continue;
        }

        const file = path.join(pathDir, fn);
        const lstats = fs.lstatSync(file);
        const bodyFile = lstats.isSymbolicLink() ? fs.readlinkSync(file) : file;

        if (!fs.existsSync(bodyFile)) {
          console.error(`${file} -> ${bodyFile} not exists.`);
          continue;
        }

        const stats = fs.statSync(bodyFile);

        if (stats.isDirectory()) {
          descendants = descendants.concat(this.readFiles(bodyFile));
        } else {
          descendants.push(bodyFile)
        }
      }
    }

    return descendants;
  }

  private readFiles(dir: string): string[] {
    let res: string[] = [];

    for (const fn of fs.readdirSync(dir)) {
      const file = path.join(dir, fn);
      const stat = fs.statSync(file);

      if (stat.isDirectory()) {
        res = res.concat(this.readFiles(file));
      } else {
        res.push(file);
      }
    }

    return res;
  }
}
