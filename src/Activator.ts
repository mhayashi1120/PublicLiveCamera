import * as path from 'path';
import * as fs from 'fs';

import { ERROR, WARN, VERB, } from 'Logging';
import { VersionJson } from '@client/Types';
import {
  jsonNow,
  imagemagickConvert, readAsJson, writeJson, saveToTempFile, artificialIdentity,
  readMD5hash, randomSleep,
} from 'CrawlerTools';
import {
  compareTimeString
} from 'DateTools';
import {
  RawLocationJson, RawLiveCameraThumb,
  ActivatedLocationJson,  ActivatedLiveCameraThumb,
} from 'CrawlerTypes';
import { PubDirectory, getThumbRootResource2, getThumbPrefix, } from 'Settings';

export interface ActivatorOpts {
  maximumInterval?: number;
  downloadVerbose?: boolean;
}

export class Activator {

  private static readonly THUMB_VERSION_SEMVER = '0.5.0';
  private static readonly THUMB_VERSION_KEY = '1b1421c2';
  private static readonly THUMB_VERSION_AT = new Date('2022-01-29 00:00:00');

  private readonly ThumbPrefix = getThumbPrefix(new Date());

  constructor(
    private opts?: ActivatorOpts,
  ){
  }

  private ensurePubThumbFile(thumbResource: string): string {
    const file = path.join(PubDirectory, getThumbRootResource2(Activator.THUMB_VERSION_KEY), thumbResource);
    const dir = path.dirname(file);

    if (!fs.existsSync(dir)) {
      VERB(`Creating directory ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }

    return file;
  }

  activateLocals(path: string) {
    if (!fs.existsSync(path)) {
      ERROR(`No path existing ${path}`);
      return;
    }

    this.doActivateDirectory(path);
  }

  private doActivateDirectory(dir: string) {
    VERB(`Try to activate on ${dir} recursively`);

    for (const fn of fs.readdirSync(dir)) {
      const file = path.join(dir, fn);
      const stat = fs.statSync(file);

      if (stat.isDirectory()) {
        this.doActivateDirectory(file);
      } else if (fn.match(/\.json$/)) {
        const json = readAsJson(file) as RawLocationJson;

        if (this.opts?.maximumInterval) {
          randomSleep(this.opts.maximumInterval);
        }

        const newJson = this.doActivate(json);

        writeJson(file, newJson);
      } else {
        ERROR(`Unknown file ${file}`);
      }
    }
  }

  private makeCacheResource(cellId: string, index: number): string {
    const id = artificialIdentity([cellId, `${index}`], 32);
    const pref1 = id.substring(0, 2);
    const pref2 = id.substring(2, 4);
    const suffix = id.substring(4);

    return path.join(this.ThumbPrefix, `${pref1}/${pref2}/${suffix}.jpg`);
  }

  private shouldCacheImage(holder: RawLocationJson, url: string): [string | null, string] {
    const startTime = new Date();
    const downloadOpts = {
      verbose: this.opts?.downloadVerbose,
    };
    // TODO consider to referer and other HTTP header
    const tmpFile = saveToTempFile(url, downloadOpts);
    const endTime = new Date();
    const ms = endTime.getTime() - startTime.getTime();
    const sec = ms / 1000;
    const hash = readMD5hash(tmpFile);

    if (holder.mustCache && !holder.neverCache) {
      return [tmpFile, hash];
    }

    if (url.match(/^http:/)) {
      return [tmpFile, hash];
    }

    // 2 seconds
    if (sec >= 2 ) {
      WARN(`Too many seconds to download from ${url} spent ${sec} sec`);
      return [tmpFile, hash];
    }

    const stat = fs.statSync(tmpFile);

    if (stat.size > 20000) {
      return [tmpFile, hash];
    }

    if (fs.existsSync(tmpFile)) {
      fs.rmSync(tmpFile);
    }

    return [null, hash];
  }

  private doReActivateThumb(json: ActivatedLocationJson, source: ActivatedLiveCameraThumb, i: number): ActivatedLiveCameraThumb | null {
    let cacheResource: string;

    if (!source.cacheLink ||
      // When Date is changed.
      !source.cacheLink.startsWith(this.ThumbPrefix)) {
      cacheResource = this.makeCacheResource(json.s2cellId, i);
    } else {
      cacheResource = source.cacheLink;
    }

    const dest = this.tryActivateThumb(json, source, cacheResource, source.sourceHash);

    if (!dest) {
      return null;
    }

    const sourceCheckedTime = new Date(dest.sourceCheckedAt!);

    // Too long time (1 day) not updated.
    if (sourceCheckedTime.getTime() < (new Date().getTime() - (24 * 60 * 60 * 1000))) {
      return null;
    }

    return dest;
  }

  private tryActivateThumb(json: RawLocationJson, source: RawLiveCameraThumb, cacheResource: string, oldHash?: string): ActivatedLiveCameraThumb | null {
    VERB(`Try to download ${source.sourceLink} ${cacheResource}`);

    try {
      const [tmpFile, hash] = this.shouldCacheImage(json, source.sourceLink);

      // Not updated.
      if (oldHash && oldHash === hash) {
        // source should have already been `activated` state
        // TODO continue this activation is failed then need any special handling
        return source as ActivatedLiveCameraThumb;
      }

      const aThumb: ActivatedLiveCameraThumb = {
        sourceLink: source.sourceLink,
        direction: source.direction,
        artificialThumbId: source.artificialThumbId,
        sourceHash: hash,
        sourceCheckedAt: jsonNow(),
      };

      if (!tmpFile || json.neverCache) {
        return aThumb;
      }

      try {
        const cacheFile = this.ensurePubThumbFile(cacheResource);

        VERB(`Converting ${cacheFile}`);

        imagemagickConvert(tmpFile, ['-resize', '300x300'], cacheFile);
      } finally {
        // Cannot convert. Regard as Invalid image.
        if (fs.existsSync(tmpFile)) {
          fs.rmSync(tmpFile);
        }
      }

      VERB(`Activate cache ${source.sourceLink} -> ${cacheResource} on ${json.lat},${json.lng}`);

      aThumb.cacheLink = cacheResource;
      aThumb.cacheAt = jsonNow();
      aThumb.cacheTime = aThumb.cacheAt;

      return aThumb;
    } catch (err) {
      ERROR(`Failed to create cache on ${source.sourceLink}`, err);
      return null;
    }
  }

  private doActivateThumb(json: RawLocationJson, source: RawLiveCameraThumb, i: number): ActivatedLiveCameraThumb | null {
    const cacheResource = this.makeCacheResource(json.s2cellId, i);

    return this.tryActivateThumb(json, source, cacheResource);
  }

  private doActivate(json: RawLocationJson): ActivatedLocationJson {
    // What the `Activate` means: -> TODO move to doc
    // - Refresh cache
    // - Check server side image is living
    // - Check server side image size
    // - Change point thumb links
    // - if http protocol.

    let i = 0;
    let thumbs: ActivatedLiveCameraThumb[] = [];
    let aJson: ActivatedLocationJson;
    let activeCount = 0;

    if (json.state === 'raw' ||
      // TODO FIXME: This is workaround fix. should remove it
      !json.state) {
      for (const thumb of json.thumbLinks) {
        const aThumb = this.doActivateThumb(json, thumb, i);

        if (aThumb) {
          activeCount++;
        }

        thumbs.push(aThumb || thumb as ActivatedLiveCameraThumb);
        i++;
      }

      aJson = Object.assign({}, json) as ActivatedLocationJson;
      aJson.state = 'activated';
    } else if (json.state === 'activated') {
      aJson = json as ActivatedLocationJson;

      for (const thumb of aJson.thumbLinks) {
        const aThumb = this.doReActivateThumb(aJson, thumb as ActivatedLiveCameraThumb, i);

        if (aThumb) {
          activeCount++;
        }

        thumbs.push(aThumb || thumb as ActivatedLiveCameraThumb);
        i++;
      }
    } else {
      throw new Error(`Asertion. Not supported state ${json.state}`);
    }

    aJson.isActive = (activeCount > 0);
    if (aJson.isActive) {
      aJson.lastActivatedAt = jsonNow();
    } else if (json.neverActivate && json.assumedActivationAt) {
      // Overwrite when past date
      if (typeof aJson.lastActivatedAt === 'string') {
        if (compareTimeString(aJson.lastActivatedAt, json.assumedActivationAt) < 0) {
          aJson.lastActivatedAt = json.assumedActivationAt;
        }
      } else {
        aJson.lastActivatedAt = json.assumedActivationAt;
      }
      // Forcibly turn on
      aJson.isActive = true;
    }
    aJson.thumbLinks = thumbs;

    return aJson;
  }

  getVersions(): VersionJson[] {
    const ver: VersionJson = {
      semver: Activator.THUMB_VERSION_SEMVER,
      releasedAt: Activator.THUMB_VERSION_AT,
      targetPath: getThumbRootResource2(Activator.THUMB_VERSION_KEY),
    };

    return [ver];
  }
}
