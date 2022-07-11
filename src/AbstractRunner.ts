import * as path from 'path';
import * as fs from 'fs';

import {
  ActivatedLiveCameraThumb, RawLiveCameraThumb,
  ActivatedLocationJson, RawLocationJson, RawLocationJsonOptionals,
  BaseLocationJson,
} from 'CrawlerTypes';

import { incDays } from 'DateTools';
import {
  readAsJson, writeJson, artificialIdentity,
  getIndexLinkPath, getS2CellId,
} from 'CrawlerTools';
import { CrawlDataDirectory, } from 'Settings';

import { INFO } from 'Logging';

export abstract class AbstractRunner {
  abstract get CountryCode(): string;
  abstract get LocalCodes(): string[];

  public computeLocalPath(): string {
    const id = this.getRunnerId();
    const prefix = id.substring(0, 2);

    return `${prefix}/${id}`;
  }

  public computeRecipeRoot(): string {
    return path.join(CrawlDataDirectory, this.computeLocalPath());
  }

  /**
   * Main entry point
   */
  protected abstract run(): void;

  public createIndex(limitDays: number): void {
    const name = this.getFriendlyName();

    INFO(`Now creating index ${name}`);

    const limitMinTime = incDays(-limitDays).getTime();

    this.run();

    INFO(`Now expiring index ${name}`);

    const path = this.computeRecipeRoot();

    this.expireDirectory(path, limitMinTime);
  }

  /**
   * Indexing interval as seconds
   */
  abstract getIndexInterval(): number;

  /**
   * Image activation interval as seconds
   */
  abstract getActivateInterval(): number;

  /**
   * Image thumbnails activation interval as seconds
   */
  getActivatingInterval(): number {
    return 0;
  }

  protected getS2CellId(lat: number, lng: number): string {
    return getS2CellId(lat, lng);
  }

  /**
   * Friendly name of each runner
   */
  abstract getFriendlyName(): string;

  private expireDirectory(dir: string, minDate: number) {
    if (!fs.existsSync(dir)) {
      return;
    }

    for (const fn of fs.readdirSync(dir)) {
      const file = path.join(dir, fn);
      const stat = fs.statSync(file);

      if (stat.isDirectory()) {
        this.expireDirectory(file, minDate);
      } else  if (/\.json$/.test(file)) {
        const json = readAsJson(file) as RawLocationJson;

        const lastIndexedTime = new Date(json.lastIndexedAt);

        if (lastIndexedTime.getTime() < minDate) {

          const id = json.s2cellId;
          const keyLink = getIndexLinkPath(id);

          if (fs.existsSync(file) && fs.existsSync(keyLink)) {
            INFO(`Deleting ${file} and ${keyLink}`);

            fs.rmSync(keyLink);
            fs.rmSync(file);
          } else {
            INFO(`Ignoring ${file} and ${keyLink} since not existing.`);
          }

          const keyLinkDir = path.dirname(keyLink);
          const files = fs.readdirSync(keyLinkDir);

          if (files.length === 0) {
            INFO(`Deleting ${keyLinkDir} since empty.`);
            fs.rmdirSync(keyLinkDir);
          }
        }
      }
    }
  }

  getRunnerId(): string {
    const source = [this.CountryCode, ...this.LocalCodes];

    const id = artificialIdentity(source, 32);

    return id;
  }

  protected writeCrawlJson(json: RawLocationJson) {
    const size = 2;
    // This id must be Level 30 id
    const id = json.s2cellId;
    const tail = id.substring(id.length - size);

    if (!/^[0-9]+$/.test(tail) || tail.length != size) {
      throw new Error(`Unexpected id ${id} -> ${tail}`);
    }

    const keyLink = getIndexLinkPath(id);
    const keyLinkDir = path.dirname(keyLink);

    const recipeRoot = this.computeRecipeRoot();
    const file = path.join(recipeRoot, tail, `${id}.json`);

    if (fs.existsSync(keyLink)) {
      const linkStat = fs.statSync(keyLink);

      if (!linkStat.isSymbolicLink) {
        throw new Error(`Unexpectedly not a symblink ${keyLink}`);
      }

      const existingLink = fs.readlinkSync(keyLink);
      const existingFile = path.join(keyLinkDir, existingLink);

      if (existingFile !== file) {
        throw new Error(`duplicated same s2 cell ${id} should be ${file} but ${existingFile}.`);
      }
    }

    const newJson = this.maybeMergeJson(json, file);

    writeJson(file, newJson);

    if (!fs.existsSync(keyLink)) {

      if (!fs.existsSync(keyLinkDir)) {
        fs.mkdirSync(keyLinkDir, {recursive: true});
      }

      const fileRelLink = path.relative(keyLinkDir, file);

      fs.symlinkSync(fileRelLink, keyLink);
    }
  }

  private maybeMergeThumbJson(activated: ActivatedLiveCameraThumb[], raw: RawLiveCameraThumb): RawLiveCameraThumb {
    for (const a of activated) {

      if (a.sourceLink !== raw.sourceLink) {
        if (typeof a.artificialThumbId !== 'number' ||
          typeof raw.artificialThumbId !== 'number' ) {
          continue;
        }

        if (a.artificialThumbId !== raw.artificialThumbId) {
          continue;
        }
      }

      a.sourceLink = raw.sourceLink;

      if (typeof raw.direction === 'number' ) {
        a.direction = raw.direction;
      } else {
        delete a.direction;
      }

      if (typeof raw.artificialThumbId === 'number') {
        a.artificialThumbId = raw.artificialThumbId;
      } else {
        delete a.artificialThumbId;
      }

      return a;
    }

    return raw;
  }

  private cloneField(toJson: any, fromJson: any, field: string) {
    if (!(field in fromJson)) {
      if (field in toJson) {
        delete toJson[field];
      }
    } else {
      toJson[field] = fromJson[field];
    }
  }

  private maybeMergeJson(newJson: RawLocationJson, file: string): BaseLocationJson {
    if (!fs.existsSync(file)) {
      return newJson;
    }

    const existingJson = readAsJson(file) as BaseLocationJson;

    // Old one that is not activated existing. just return new one.
    if (existingJson.state === 'raw') {
      return newJson;
    }

    const activeJson = existingJson as ActivatedLocationJson;

    activeJson.lastIndexedAt = newJson.lastIndexedAt;

    for (const field of RawLocationJsonOptionals) {
      this.cloneField(activeJson, newJson, field);
    }

    const newThumbs: RawLiveCameraThumb[] = [];

    for (const t of newJson.thumbLinks) {
      const m = this.maybeMergeThumbJson(activeJson.thumbLinks, t);

      newThumbs.push(m);
    }

    activeJson.thumbLinks = newThumbs;

    // other value must be  same.

    return activeJson;
  }
}
