import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';

// TODO consider path problem
import {
  jsonNow, downloadJson, findField, validateGeoText,
  validateString, validateOptionalString,
} from 'CrawlerTools';
import { RawLocationJson } from 'CrawlerTypes';
import { ERROR, } from 'Logging';

interface CameraMasterPair {
  id: string;
  camera: any;
  master: any;
}

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly BASE_URL = 'https://www.toyama-douro.toyama.toyama.jp/';
  private readonly TERMS_URL = `${this.BASE_URL}site_about.html`;

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['16']);
  }

  getIndexInterval(): number {
     return (5 * 60 * 60);
  }

  public getFriendlyName(): string {
    return '富山県冬季道路情報';
  }

  private readCameraJsons() {
    const masterSource = downloadJson(`${this.BASE_URL}json/camera_master.json`);
    const cameraSource = downloadJson(`${this.BASE_URL}json/camera.json`);

    const db: Record<string, CameraMasterPair> = {}
    const masterData: Record<string, any> = {};

    for (const seemsId in masterSource) {
      masterData[seemsId] = masterSource[seemsId];
    }

    // Join two json to one
    for (const seemsId in cameraSource) {
      // TODO just ignore not existing other hand.

      db[seemsId] = {
        id: seemsId,
        camera: cameraSource[seemsId],
        master: masterData[seemsId],
      };
    }

    for (const id in db) {
      const r = db[id];

      if (!r.master || !r.camera) {
        ERROR(`No valid item`, r);
        continue;
      }

      const imgDir = r.master['path'];
      const imgFnField = findField(r.camera['camera_data'], 'file_name1');

      if (!imgFnField) {
        ERROR(`No valid image fielname`, r.camera);
        continue;
      }

      const imgFn = imgFnField['file_name1'];

      if (!imgDir || !imgFn) {
        ERROR(`No valid camera image`, r);
        continue;
      }

      const imgPath = `${imgDir}${imgFn}`;
      const lat = validateGeoText(r.master['lat']);
      const lng = validateGeoText(r.master['lng']);
      const title = validateOptionalString(r.master['name']);
      const url = `${this.BASE_URL}${imgPath}`;
      const s2cellId = this.getS2CellId(lat, lng);

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks: [
          {
            sourceLink: url,
          },
        ],
        lat,
        lng,
        lastIndexedAt: jsonNow(),
        termsUrl: this.TERMS_URL,
        sourceUrl: this.BASE_URL,
        title,
      };

      super.writeCrawlJson(cameraItem);
    }
  }

  private readLinkJson() {
    const linkSource = downloadJson(`${this.BASE_URL}json/link_master.json`);

    for (const k in linkSource) {
      const r = linkSource[k];
      const imgPath = r['path'];

      if (typeof imgPath !== 'string') {
        ERROR(`No valid image fielname`, imgPath);
        continue;
      }

      if (!imgPath.match(/\.jpe?g$/)) {
        ERROR(`Not a valid image URL ${imgPath}`);
        continue;
      }

      const lat = validateGeoText(r['lat']);
      const lng = validateGeoText(r['lng']);
      const title = validateOptionalString(r['name']);
      const url = validateString(r['path']);
      const s2cellId = this.getS2CellId(lat, lng);

      // TODO validate url and name

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks: [
          {
            sourceLink: url,
          },
        ],
        lat,
        lng,
        lastIndexedAt: jsonNow(),
        termsUrl: this.TERMS_URL,
        sourceUrl: this.BASE_URL,
        title,
      };

      super.writeCrawlJson(cameraItem);
    }
  }

  public run(): void {
    this.readCameraJsons();

    this.readLinkJson();
  }
}
