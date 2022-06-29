import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';
import { RawLocationJson, } from 'CrawlerTypes';
import { ERROR, } from 'Logging';
import { downloadJson, jsonNow, } from 'CrawlerTools';
import { LiveCameraThumb } from '@client/Types';

interface CameraMasterPair {
  id: string;
  camera: any;
  master: any;
}

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly BASE_URL = 'https://douro.pref.gifu.lg.jp/';

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['18']);
  }

  getIndexInterval(): number {
     return (24 * 60 * 60);
  }

  public getFriendlyName(): string {
    return '道の情報ー道路規制情報（岐阜県）';
  }

  public run(): void {

    const masterSource = downloadJson(`${this.BASE_URL}api/getCameraMaster`);
    const cameraSource = downloadJson(`${this.BASE_URL}api/getCamera`);

    const db: Record<string, CameraMasterPair> = {}
    const master: Record<string, any> = {};

    for (const v of masterSource['vals']) {
      master[v['id']] = v;
    }

    for (const c of cameraSource['vals']) {
      const id = c['id'];

      if (!(id in master)) {
        ERROR(`No valid master ${id}`, c);
        continue;
      }

      db[id] = {
        id,
        camera: c,
        master: master[id],
      };
    }

    for (const id in db) {
      const r = db[id];

      if (!r.master || !r.camera) {
        ERROR(`No valid item`, r);
        continue;
      }

      const images = r.camera['cameraImg'] as Array<any>;

      if (!images || images.length === 0) {
        continue;
      }

      const thumbLinks: LiveCameraThumb[] = [];

      for (const i of images) {
        const imgPath = i['img'];

        if (typeof imgPath !== 'string') {
          ERROR(`Not a image`, imgPath);
          continue;
        }

        thumbLinks.push({
          sourceLink: `${this.BASE_URL}${imgPath}`,
          // TODO may can detect direction.
        });
      }

      if (thumbLinks.length === 0) {
        ERROR(`No valid camera image`, r);
        continue;
      }

      const lat = r.master['latitude'];
      const lng = r.master['longitude'];
      const title = r.master['pointName'];
      const s2cellId = this.getS2CellId(lat, lng);

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks,
        lat,
        lng,
        lastIndexedAt: jsonNow(),
        title,
        // Not found
        // termsUrl:
        sourceUrl: this.BASE_URL,
      };

      super.writeCrawlJson(cameraItem);
    }
  }
}
