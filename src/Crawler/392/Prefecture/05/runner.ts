import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';

import URLParse  from 'url-parse';

import { RawLocationJson, } from 'CrawlerTypes';
import { downloadDocument, jsonNow, validateGeo, } from 'CrawlerTools';
import { ERROR, WARN, } from 'Logging';

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly TOP_URL = `http://road.pref.akita.lg.jp/`;
  private readonly INDEX_URL = `${this.TOP_URL}pubdat/livecamera.php`;
  private readonly TERMS_URL = `${this.TOP_URL}modules/tinyd8/index.php?id=1`;
  private readonly SOURCE_URL = `${this.TOP_URL}modules/tinyd2/index.php?id=4`;

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['05']);
  }

  getIndexInterval(): number {
     return (24 * 60 * 60);
  }

  getActivateInterval(): number {
     return (15 * 60);
  }

  public getFriendlyName(): string {
    return '秋田のみち情報';
  }

  private maybeReadTitle(c: Element): string | null {
    const node = c.querySelector('tr th');

    if (!node) {
      return null;
    }

    const m = /【(.*?)】/.exec(node.innerHTML);

    if (!m) {
      return null;
    }

    return m[1];
  }

  public run(): void {

    const indexSource = downloadDocument(this.INDEX_URL);

    for (const c of indexSource.querySelectorAll('center')) {

      const img = c.querySelector('td.picture img');

      if (!img) {
        ERROR('Unexpectedly no img element');
        continue;
      }

      const src = img.getAttribute('src');

      if (typeof src !== 'string') {
        continue;
      }

      if (!src.startsWith('/')) {
        ERROR(`img src ${src} is unexpectedly not on the domain.`);
        continue;
      }
      const imageUrl = `${this.TOP_URL}${src.substring(1)}`;

      const map = c.querySelector('td.map a');

      if (!map) {
        ERROR('Unexpectedly no map element')
        continue;
      }

      const onclick = map.getAttribute('onclick');

      if (!onclick) {
        WARN('Unexpectedly no onclick attribute. Ignore')
        continue;
      }

      const m = /window\.open\(\'([^\']+)\'/.exec(onclick);

      if (!m) {
        WARN('no google map url. Ignore')
        continue;
      }

      const googlemapUrl = m[1];

      const u: URLParse<Record<string, string | undefined>> = new URLParse(googlemapUrl, true);

      const mapQueryGeo = u.query['q'];
      const [lat, lng] = validateGeo(mapQueryGeo);

      const title = this.maybeReadTitle(c);
      const s2cellId = this.getS2CellId(lat, lng);

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks: [
          {
            sourceLink: imageUrl,
          },
        ],
        lat,
        lng,
        termsUrl: this.TERMS_URL,
        lastIndexedAt: jsonNow(),
        sourceUrl: this.SOURCE_URL,
      };

      if (title) {
        cameraItem.title = title;
      }

      super.writeCrawlJson(cameraItem);
    }
  }
}
