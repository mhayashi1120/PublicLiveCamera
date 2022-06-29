import { PrefectureRunner, } from 'Crawler/392/PrefectureRunner';
import { RawLocationJson, } from 'CrawlerTypes';
import { ERROR, } from 'Logging';
import { jsonNow, downloadJson, } from 'CrawlerTools';
import { LiveCameraThumb } from '@client/Types';

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly BASE_URL = 'https://www.hozen.pref.fukui.lg.jp/hozen/yuki/';
  private readonly SOURCE_URL = this.BASE_URL;

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['21']);
  }

  getIndexInterval(): number {
     return (24 * 60 * 60);
  }

  public getFriendlyName(): string {
    return 'みち情報ネットふくい';
  }

  public run(): void {

    const db = downloadJson(`${this.BASE_URL}assets/jsons/cameras.json`);

    for (const r of db) {

      const map = r['map'];
      const data = r['data'];

      if (!map || !data) {
        ERROR(`No valid item`, r);
        continue;
      }

      const imgPath = data['image'] as string;

      if (typeof imgPath !== 'string') {
        ERROR(`No valid image`, r);
        continue;
      }

      if (!('icons' in map)) {
        ERROR(`No icons`, data);
        continue;
      }

      const icons = map['icons'];
      if (typeof icons !== 'object') {
        ERROR(`No valid icons`, icons);
        continue;
      }

      const thumbLinks: LiveCameraThumb[] = [];

      thumbLinks.push({
        sourceLink: `${this.BASE_URL}${imgPath}`,
        // TODO may have direction?
      });

      const lat = icons[0]['lat'];
      const lng = icons[0]['lng'];
      const title = r['name'];
      const s2cellId = this.getS2CellId(lat, lng);

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks,
        lat,
        lng,
        lastIndexedAt: jsonNow(),
        title,
        isFuzzyLocation: true,
        sourceUrl: this.SOURCE_URL,
        // Seems not supplied
        // termsUrl:
      };

      super.writeCrawlJson(cameraItem);
    }
  }
}
