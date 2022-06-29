import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';
import {
  LiveCameraThumb,
} from '@client/Types';
import { RawLocationJson, } from 'CrawlerTypes';
import { VERB, } from 'Logging';

import {
  downloadHtml, jsonNow,
} from 'CrawlerTools';

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly INDEX_URL = 'https://www.pref.aomori.lg.jp/soshiki/kendo/airport/APwebcam.html';
  private readonly SINGLETON_GEO = { lat: 40.738685, lng: 140.689584, }
  private readonly TERMS_URL = 'https://www.pref.aomori.lg.jp/contents/copyright.html';

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['02', 'AirPort']);
  }

  // index interval is 1 day
  getIndexInterval(): number {
    return (24 * 60 * 60);
  }

  public getFriendlyName(): string {
    return '青森空港ライブカメラ';
  }

  protected run(): void {

    const indexSource = downloadHtml(`${this.INDEX_URL}`);
    const doc = indexSource.window.document;
    const img = doc.querySelector('img[title *= "ライブカメラ"]');

    if (!img) {
      throw new Error(`Unable find valid image source`);
    }

    const src = img.getAttribute('src');

    if (!src) {
      throw new Error(`Unable find src on ${img}`);
    }

    let sourceUrl = new URL(src, this.INDEX_URL);

    const artificialId = 'singletonId';
    const title = img.getAttribute('title') || '';
    const thumbLinks: LiveCameraThumb[] = [];
    const geo = this.SINGLETON_GEO;
    const s2cellId = super.getS2CellId(geo.lat, geo.lng);

    VERB(`aomori airport URL`, sourceUrl, geo);

    thumbLinks.push({
      sourceLink: sourceUrl.toString(),
    });

    const cameraItem: RawLocationJson = {
      state: 'raw',
      s2cellId,
      thumbLinks,
      lat: geo.lat,
      lng: geo.lng,
      lastIndexedAt: jsonNow(),
      isFuzzyLocation: true,
      termsUrl: this.TERMS_URL,
      sourceUrl: this.INDEX_URL,
      title,
      artificialId,
    };

    super.writeCrawlJson(cameraItem);
  }
}
