import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';

import { RawLocationJson, } from 'CrawlerTypes';
import { downloadJson, jsonNow, readSingleImagePage, washQueryString, } from 'CrawlerTools';
import { ERROR, } from 'Logging';

interface CameraMasterPair {
  id: string;
  camera: any;
  master: any;
}

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly BASE_URL = 'https://douro.pref.ishikawa.lg.jp/';
  private readonly TERMS_URL = `https://douro.pref.ishikawa.lg.jp/notice.html`;

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['17']);
  }

  getIndexInterval(): number {
     return (24 * 60 * 60);
  }

  public getFriendlyName(): string {
    return '石川みち情報ネット';
  }

  public run(): void {

    const masterSource = downloadJson(`${this.BASE_URL}api/getCameraMaster`);
    const cameraSource = downloadJson(`${this.BASE_URL}api/getCamera`);

    const bothSource: Record<string, CameraMasterPair> = {}
    const master: Record<string, any> = {};

    for (const v of masterSource['vals']) {
      master[v['id']] = v;
    }

    for (const c of cameraSource['vals']) {
      // TODO just ignore not existing other hand.
      const id = c['id'];

      if (!(id in master)) {
        continue;
      }

      const m = master[id];

      bothSource[id] = {
        id,
        camera: c,
        master: m,
      };
    }

    const onlyMasterSource: Record<string, any> = {};

    for (const id in master) {
      const v = master[id];

      if (id in bothSource) {
        continue;
      }

      onlyMasterSource[id] = v;
    }

    this.generateBothSource(bothSource);

    this.generateOnlyMasterSource(onlyMasterSource);
  }

  private safeReadSubPage(url: string): string | null {
    try {
      const imageUrl = readSingleImagePage(url);

      return imageUrl;
    } catch (err) {
      ERROR(`Error while retrieving ${url}`, err);
      return null;
    }
  }

  private generateOnlyMasterSource(source: Record<string, any>) {
    for (const id in source) {
      const v = source[id];

      const url = v['windowOpenUrl'];

      if (typeof url !== 'string') {
        ERROR(`No valid window url`, v);
        continue;
      }

      if (!(url.startsWith('http://www.hrr.mlit.go.jp/') ||
        url.startsWith('http://www.city.kanazawa.ishikawa.jp/') ||
        url.startsWith('http://douro.pref.ishikawa.lg.jp/'))) {
        ERROR(`No valid window url ${url}`);
        continue;
      }

      const imageUrl = this.safeReadSubPage(url);

      if (!imageUrl) {
        ERROR(`No valid image source on ${url}`);
        continue;
      }

      const lat = v['latitude'];
      const lng = v['longitude'];
      const title = v['pointName'];
      const s2cellId = this.getS2CellId(lat, lng);

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks: [
          {
            sourceLink: washQueryString(imageUrl),
          },
        ],
        lat,
        lng,
        termsUrl: this.TERMS_URL,
        lastIndexedAt: jsonNow(),
        sourceUrl: url,
        title,
      };

      super.writeCrawlJson(cameraItem);
    }
  }

  private generateBothSource(source: Record<string, CameraMasterPair>) {
    for (const id in source) {
      const r = source[id];

      const imgPath = r.camera['cameraImg'];

      if (typeof imgPath !== 'string') {
        ERROR(`No valid camera image`, r);
        continue;
      }

      const lat = r.master['latitude'];
      const lng = r.master['longitude'];
      const title = r.master['pointName'];
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
        termsUrl: this.TERMS_URL,
        lastIndexedAt: jsonNow(),
        sourceUrl: this.BASE_URL,
        title,
        neverActivate: true,
        assumedActivationAt: jsonNow(),
      };

      super.writeCrawlJson(cameraItem);
    }

  }
}
