import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';
import {

} from '@client/Types';
import { RawLocationJson,RawLiveCameraThumb, } from 'CrawlerTypes';
import {  } from 'Logging';

import { downloadHtml, downloadJson, jsonNow, validateGeoText, } from 'CrawlerTools';

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly BASE_URL = `https://info-road.hdb.hkd.mlit.go.jp/`;
  private readonly IMAGE_URL = `${this.BASE_URL}gazou/`;
  private readonly INDEX_URL = `${this.BASE_URL}RoadInfo/index_gazou2.htm`;

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['01']);
  }

  getIndexInterval(): number {
     return (15 * 60);
  }

  getActivateInterval(): number {
     return (15 * 60);
  }

  public getFriendlyName(): string {
    return '北海道地区 道路情報';
  }

  public run(): void {

    const indexSource = downloadHtml(`${this.INDEX_URL}`);
    const doc = indexSource.window.document;
    const containers = doc.querySelectorAll('a.popup_txt');

    for (const c of containers) {

      const a = c as HTMLAnchorElement;
      const onClick = a.getAttribute('onClick');

      if (!onClick) {
        continue;
      }

      const m = /cameraPopup\('\/(.*?\.json)'/.exec(onClick);

      if (!m) {
        continue;
      }

      const jsonUrl = `${this.BASE_URL}${m[1]}`;
      const jsonArray = downloadJson(jsonUrl);
      const json = jsonArray[0];
      const lat = validateGeoText(json['lat']);
      const lng = validateGeoText(json['lon']);
      const title = json['route_name'] + ' ' + json['cname'];
      const imgPath = json['cctv_file_name']
      const thumbLinks: RawLiveCameraThumb[] = [];
      const s2cellId = super.getS2CellId(lat, lng);

      thumbLinks.push({
        sourceLink: `${this.IMAGE_URL}${imgPath.substring(1)}`,
      });

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks,
        lat,
        lng,
        lastIndexedAt: jsonNow(),
        title,
        termsUrl: `${this.BASE_URL}RoadInfo/information.html`,
        sourceUrl: this.BASE_URL,
      };

      super.writeCrawlJson(cameraItem);
    }
  }
}
