import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';
import {
  LiveCameraThumb,
} from '@client/Types';
import { RawLocationJson, } from 'CrawlerTypes';
import { D, ERROR, } from 'Logging';

import {
  MapPixelAllocation,
  artificialIdentity, downloadHtml, jsonNow,
} from 'CrawlerTools';

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly BASE_URL = 'https://www.live-cam.pref.niigata.jp/';

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['15']);
  }

  getIndexInterval(): number {
     return (24 * 60 * 60);
  }

  public getFriendlyName(): string {
    return 'にいがたLIVEカメラ';
  }

  private maybeReadPixel(s: any): number | null {

    if (typeof s !== 'string') {
      return null;
    }

    const m = /^([0-9]+)px$/.exec(s);

    if (!m) {
      return null;
    }

    return parseInt(m[1]);
  }

  public run(): void {

    const indexSource = downloadHtml(`${this.BASE_URL}`);
    const doc = indexSource.window.document;
    const containers = doc.querySelectorAll('div .bwWrapper');

    D('Found target elements', containers.length);

    // 右上:NorthWest 伊呉野 style top:22px;left:739px; -> 38.550855,139.550294
    // 左下:SouthEast 市振   style top:768px;left:21px; -> 36.979547,137.643435

    const allocator = new MapPixelAllocation({
      NE: {
        geo:{ lat: 38.550855, lng: 139.550294},
        left: 739,
        top: 22,
      },
      SW: {
        geo: { lat: 36.979547, lng: 137.643435},
        left: 21,
        top: 768,
      },
    });

    for (const c of containers) {
      const anchor = c.querySelector('a');

      if (!anchor) {
        continue;
      }

      D('anchor', anchor.id, anchor.getAttribute('href'), anchor.style);

      const img = anchor.querySelector('img');

      if (!img) {
        continue;
      }

      const imageLink = anchor.getAttribute('href');

      if (!imageLink || !/\.jpe?g$/.test(imageLink)) {
        ERROR(`Seems no jpeg files`, c);
        continue;
      }

      const top = this.maybeReadPixel(img.style.getPropertyValue('top'))
      const left = this.maybeReadPixel(img.style.getPropertyValue('left'))

      if ((typeof top !== 'number') || (typeof left !== 'number')) {
        ERROR(`No valid position from style`);
        continue;
      }

      const artificialId = artificialIdentity([`${top}`, `${left}`], 20);
      const title = anchor.getAttribute('title') || '';
      const geo = allocator.computeGeo(left, top);
      const thumbLinks: LiveCameraThumb[] = [];
      const s2cellId = super.getS2CellId(geo.lat, geo.lng);

      thumbLinks.push({
        sourceLink: `${this.BASE_URL}${imageLink}`,
        // TODO may have direction?
      });

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks,
        lat: geo.lat,
        lng: geo.lng,
        lastIndexedAt: jsonNow(),
        isFuzzyLocation: true,
        // Seems no url supplied.
        // termsUrl,
        sourceUrl: this.BASE_URL,
        title,
        artificialId,
      };

      super.writeCrawlJson(cameraItem);
    }

  }
}
