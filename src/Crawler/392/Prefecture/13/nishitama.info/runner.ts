import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';
import {
  } from '@client/Types';

import { RawLocationJson, RawLiveCameraThumb, } from 'CrawlerTypes';

import {
  // RawLocationJson,
  IndexNoLocationDatabase,
 } from 'CrawlerTypes';
import { downloadHtml } from 'CrawlerTools';

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly BASE_URL = 'http://dourocamera.nishitama.info/';

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['13', 'nishitama.info']);
  }

  getIndexInterval(): number {
     return (15 * 60);
  }

  getActivateInterval(): number {
     return (15 * 60);
  }

  public getFriendlyName(): string {
    return 'にしたまの道ライブカメラ';
  }

  public run(): void {

    const indexSource = downloadHtml(`${this.BASE_URL}`);
    const doc = indexSource.window.document;
    const imgs = doc.querySelectorAll('img');

    const master: IndexNoLocationDatabase = {
      allImageCount: 7,
      targets: [
        { lat: 35.789939, lng: 139.042276, index: 1, title: '国道４１１ 大麦代トンネル山梨側', },
        { lat: 35.780548, lng: 138.987668, index: 2, title: '国道４１１ 山梨県境付近', },
        { lat: 35.762352, lng: 138.992162, index: 3, title: '国道１３９ 山梨県境付近', },
        { lat: 35.729037, lng: 139.193262, index: 4, title: '都道３３ 十里木付近', },
        { lat: 35.703353, lng: 139.112607, index: 5, title: '都道３３ 滑石橋付近', },
        { lat: 35.701819, lng: 139.111633, index: 6, title: '都道３３ 山梨県境付近', },
      ],
    };

    if (imgs.length != master.allImageCount) {
      throw new Error(`Not a supported index file. Aborted`);
    }

    for (const t of master.targets) {
      const img = imgs[t.index];
      const src = img.src;
      const lat = t.lat;
      const lng = t.lng;
      const title = t.title;
      const s2cellId = this.getS2CellId(lat, lng);

      const thumbLinks: RawLiveCameraThumb[] = [];
      const link = `${this.BASE_URL}${src}`;

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
        sourceUrl: 'http://dourocamera.nishitama.info/',
        title,
      };

      super.writeCrawlJson(cameraItem);
    }
  }
}
