import { MlitRunner } from 'Crawler/392/mlit/MlitRunner';
import {

} from '@client/Types';
import { RawLocationJson, } from 'CrawlerTypes';
import { WARN, } from 'Logging';

import { downloadDocument,
 jsonNow, artificialIdentity,
 } from 'CrawlerTools';

interface IndexItem {
  title: string;
  lat: number;
  lng: number;
}

interface ImageItem {
  imageUrl: string;
}

interface ItemPair {
  name: string;
  index: IndexItem;
  image: ImageItem;
}

export class Runner extends MlitRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly BASE_URL = `https://www.hrr.mlit.go.jp/kanazawa/`;
  private readonly INDEX_URL = `${this.BASE_URL}hakusansabo/02livecam/index.html`;

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['Hakusan']);
  }

  getIndexInterval(): number {
     return (24 * 60 * 60);
  }

  getActivateInterval(): number {
     return (15 * 60);
  }

  public getFriendlyName(): string {
    return '白山砂防';
  }

  public run(): void {
    const index = downloadDocument(this.INDEX_URL, { encoding: 'shift_jis' });
    const indexSource: Record<string, ImageItem> = {};

    for (const menu of index.querySelectorAll('div[id ^= "menu"]')) {
      const t = menu.querySelector('table') as HTMLTableElement;

      const td = t.querySelector('tr td');
      const img = t.querySelector('img');

      if (!td || !img) {
        WARN(`Unexpectedly element not found`, td, img);
        continue;
      }

      const mTitle = /^([^<]+)</.exec(td.innerHTML);

      if (!mTitle) {
        WARN(`No title`, td.innerHTML);
        continue;
      }

      const title = mTitle[1].trim();
      const imageUrl = img.getAttribute('src');

      if (!imageUrl) {
        WARN(`No image`, img);
        continue;
      }

      if (!imageUrl.startsWith('../../')) {
        WARN(`Invalid image url`, imageUrl);
        continue;
      }

      const imageLink = this.BASE_URL + imageUrl.substring(6);
      indexSource[title] = {
        imageUrl: imageLink,
      } as ImageItem;
    }

    const indices: IndexItem[] = [
      { title: "弥陀ヶ原"   , lat: 36.145153, lng: 136.763147, },
      { title: "別当出合"   , lat: 36.124889, lng: 136.739944, },
      { title: "白山遠景"   , lat: 36.119669, lng: 136.713513, },
      { title: "市ノ瀬"     , lat: 36.115599, lng: 136.705708, },
      { title: "百万貫の岩" , lat: 36.132496, lng: 136.660377, },
      { title: "風嵐"       , lat: 36.165095, lng: 136.638051, },
      { title: "深瀬大橋"   , lat: 36.231779, lng: 136.639779, },
      { title: "東二口"     , lat: 36.285765, lng: 136.643329, },
      { title: "中ノ川上流" , lat: 36.230619, lng: 136.764791, },
      { title: "中ノ川中流" , lat: 36.237197, lng: 136.760225, },
      { title: "中ノ川下流" , lat: 36.250741, lng: 136.750484, },
      { title: "三ツ又"     , lat: 36.255755, lng: 136.743269, },
      { title: "猿花"       , lat: 36.260080, lng: 136.730525, },
      { title: "御鍋堰堤"   , lat: 36.272361, lng: 136.695490, },
      { title: "瀬戸堰堤"   , lat: 36.282014, lng: 136.661287, },
      { title: "濁澄橋"     , lat: 36.298909, lng: 136.640425, },
    ];

    const db: ItemPair[] = [];

    for (const index of indices) {
      const image = indexSource[index.title];

      if (!image) {
        WARN(`No image item found on ${index.title}`);
        continue;
      }

      db.push({
        name: index.title,
        index,
        image,
      });
    }

    for (const e of db) {

      const s2cellId = super.getS2CellId(e.index.lat, e.index.lng);

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks: [
          {
            sourceLink: e.image.imageUrl,
          },
        ],
        lat: e.index.lat,
        lng: e.index.lng,
        lastIndexedAt: jsonNow(),
        title: e.index.title,
        // No terms URL
        // termsUrl:
        sourceUrl: this.INDEX_URL,
        artificialId: artificialIdentity([`${e.index.title}`], 20),
        isFuzzyLocation: true,
      };

      super.writeCrawlJson(cameraItem);
    }
  }
}
