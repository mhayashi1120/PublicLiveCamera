import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';
import {
  } from '@client/Types';

import { RawLocationJson, RawLiveCameraThumb, } from 'CrawlerTypes';

import { ERROR, } from 'Logging';

import {
  // RawLocationJson,
  IndexProcessManualImageDatabase,
 } from 'CrawlerTypes';
import { downloadFile } from 'CrawlerTools';

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly BASE_URL = 'http://gajyumaru.it-ogasawara.com/';
  // private readonly TOP_URL = `${this.BASE_URL}live_select_page1.html`;

  // No terms.
  // private readonly INDEX_URL = `${this.TOP_URL}pubdat/livecamera.php`;
  // private readonly TERMS_URL = `${this.TOP_URL}modules/tinyd8/index.php?id=1`;
  // private readonly SOURCE_URL = `${this.TOP_URL}modules/tinyd2/index.php?id=4`;

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['13', 'it-ogasawara.com']);
  }

  getIndexInterval(): number {
     return (15 * 60);
  }

  getActivateInterval(): number {
     return (15 * 60);
  }

  public getFriendlyName(): string {
    return '小笠原村ライブカメラ';
  }

  private readTheLatestImage(baseUrl: string, text: string): string | null {
    const urls: string[] = [];

    for (const l of text.split('\n')) {
      if (!/^file_array/.test(l)) {
        continue;
      }

      const m = /="(.*?\.jpg)"/.exec(l);

      if (!m) {
        continue;
      }

      const imageUrl = m[1];

      urls.push(imageUrl);
    }

    if (urls.length === 0) {
      return null;
    }

    const urls2 = urls.sort().reverse();
    const topUrl = urls2[0];
    const sourceUrl = new URL(topUrl, baseUrl);

    return sourceUrl.toString();
  }

  public run(): void {

    const master: IndexProcessManualImageDatabase = [
      { lat: 27.093550, lng: 142.192685, indexUrl: `${this.BASE_URL}cam1.php`, title: '二見港 (父島)', },
      { lat: 26.640835, lng: 142.159463, indexUrl: `${this.BASE_URL}cam2.php`, title: '沖港 (母島)', },
      { lat: 27.103504, lng: 142.194491, indexUrl: `${this.BASE_URL}cam3.php`, title: '宮之浜海岸 (父島)', },
      { lat: 27.072290, lng: 142.195274, indexUrl: `${this.BASE_URL}cam4.php`, title: '振分山 (父島)', },
      { lat: 27.060808, lng: 142.195182, indexUrl: `${this.BASE_URL}cam5.php`, title: '小港海岸 (母島)', },
      { lat: 26.630781, lng: 142.174998, indexUrl: `${this.BASE_URL}cam6.php`, title: '中ノ平無線中継所 (母島)', },
    ];

    for (const t of master) {
      const text = downloadFile(t.indexUrl);
      const src = this.readTheLatestImage(t.indexUrl, text);

      if (src === null) {
        ERROR(`No valid image url ${t.indexUrl}`);
        continue;
      }

      const lat = t.lat;
      const lng = t.lng;
      const title = t.title;
      const s2cellId = this.getS2CellId(lat, lng);

      const thumbLinks: RawLiveCameraThumb[] = [];
      const link = `${src}`;

      const thumb: RawLiveCameraThumb = {
        sourceLink: link,
      };

      thumbLinks.push(thumb);

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks,
        lat,
        lng,
        lastIndexedAt: new Date().toISOString(),
        // No url supplied.
        // termsUrl,
        sourceUrl: t.indexUrl,
        title,
      };

      super.writeCrawlJson(cameraItem);
    }
  }
}
