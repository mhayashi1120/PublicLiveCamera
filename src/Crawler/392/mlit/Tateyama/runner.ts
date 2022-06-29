import { MlitRunner } from 'Crawler/392/mlit/MlitRunner';
import {

} from '@client/Types';
import { RawLocationJson, } from 'CrawlerTypes';
import { WARN, } from 'Logging';

import {
  downloadDocument,
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
  private readonly BASE_URL = `https://www.hrr.mlit.go.jp/tateyama/bousai/`;
  private readonly INDEX_URL = `${this.BASE_URL}index.html`;
  private readonly TERMS_URL = `https://www.hrr.mlit.go.jp/tateyama/privacy/index.html`;

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['Tateyama']);
  }

  getIndexInterval(): number {
     return (24 * 60 * 60);
  }

  getActivateInterval(): number {
     return (15 * 60);
  }

  public getFriendlyName(): string {
    return '立山砂防';
  }

  public run(): void {
    const index = downloadDocument(this.INDEX_URL);
    const indexSource: Record<string, ImageItem> = {};

    for (const anchor of index.querySelectorAll('#content ul .list_img a')) {
      const a = anchor as HTMLAnchorElement;
      const href = a.getAttribute('href');

      if (!href) {
        WARN(`Unexpectedly href not found`, a);
        continue;
      }

      const pageUrl = `${this.BASE_URL}${href}`;
      const title = a.innerHTML.trim();

      const doc = downloadDocument(pageUrl);
      const img = doc.querySelector('#content img');

      if (!img) {
        WARN(`No image elemtn found in page url`, pageUrl);
        continue;
      }

      const imageLink = img.getAttribute('src');

      if (!imageLink || !imageLink.startsWith('https://www.hrr.mlit.go.jp/')) {
        WARN(`No valid image url`, imageLink);
        continue;
      }

      indexSource[title] = {
        imageUrl: imageLink,
      } as ImageItem;
    }

    const indices: IndexItem[] = [
      { title: '本宮砂防堰堤'      , lat: 36.582032, lng: 137.406260, },
      { title: '千寿ヶ原'          , lat: 36.584340, lng: 137.442231, },
      { title: '白岩砂防堰堤'      , lat: 36.548703, lng: 137.534917, },
      { title: '立山カルデラ展望台', lat: 36.564603, lng: 137.561015, },
      { title: '真川第2号砂防堰堤' , lat: 36.540168, lng: 137.550426, },
      { title: '六九谷'            , lat: 36.551592, lng: 137.569125, },
      { title: '称名滝'            , lat: 36.575179, lng: 137.520298, },
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
        termsUrl: this.TERMS_URL,
        sourceUrl: this.INDEX_URL,
        artificialId: artificialIdentity([`${e.index.title}`], 20),
        isFuzzyLocation: true,
      };

      super.writeCrawlJson(cameraItem);
    }
  }
}
