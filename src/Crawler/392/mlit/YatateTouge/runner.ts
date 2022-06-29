import { MlitRunner } from 'Crawler/392/mlit/MlitRunner';
import {

} from '@client/Types';
import { RawLocationJson, NoIndexSinglePageDatabase, } from 'CrawlerTypes';
import { WARN } from 'Logging';

import { readSingleImagePage, jsonNow, } from 'CrawlerTools';

export class Runner extends MlitRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly INDEX_URL = `http://www.thr.mlit.go.jp/noshiro/yatatenavi/`;

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['YatateTouge']);
  }

  getIndexInterval(): number {
     return (24 * 60 * 60);
  }

  getActivateInterval(): number {
     return (15 * 60);
  }

  public getFriendlyName(): string {
    return '矢立NAVI';
  }

  public run(): void {

    const db: NoIndexSinglePageDatabase = [
      { title: '大館市早口'    , lat: 40.270886, lng: 140.439595 , url: 'http://www.thr.mlit.go.jp/noshiro/yatatenavi/sub/akita_hayakuchi.html'        },
      { title: '大館市釈迦内'  , lat: 40.311224, lng: 140.570459 , url: 'http://www.thr.mlit.go.jp/noshiro/yatatenavi/sub/akita_syakanai.html'         },
      { title: '大館市陣場'    , lat: 40.408782, lng: 140.611952 , url: 'http://www.thr.mlit.go.jp/noshiro/yatatenavi/sub/akita_jinba.html'            },
      { title: '矢立峠秋田側'  , lat: 40.445705, lng: 140.634217 , url: 'http://www.thr.mlit.go.jp/noshiro/yatatenavi/sub/akita_yatate.html'           },
      { title: '矢立峠青森側'  , lat: 40.449855, lng: 140.635151 , url: 'http://www.thr.mlit.go.jp/noshiro/yatatenavi/sub/aomori_yatate.html'          },
      { title: '碇ヶ関踏田切'  , lat: 40.481649, lng: 140.623826 , url: 'http://www.thr.mlit.go.jp/noshiro/yatatenavi/sub/aomori_ikarigaseki.html'     },
      { title: '大鰐唐牛'      , lat: 40.483557, lng: 140.623585 , url: 'http://www.thr.mlit.go.jp/noshiro/yatatenavi/sub/aomori_oowni.html'           },
      { title: '弘前大橋'      , lat: 40.557337, lng: 140.543464 , url: 'http://www.thr.mlit.go.jp/noshiro/yatatenavi/sub/aomori_hirosakioohashi.html' },
      { title: '弘前津賀野'    , lat: 40.717344, lng: 140.580553 , url: 'http://www.thr.mlit.go.jp/noshiro/yatatenavi/sub/aomori_hirosakitugano.html'  },
    ];

    for (const e of db) {

      const s2cellId = super.getS2CellId(e.lat, e.lng);
      const imageUrl = readSingleImagePage(e.url);

      if (!imageUrl) {
        WARN(`No image url on ${e.url}`);
        continue;
      }

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks: [
          {
            sourceLink: imageUrl,
          },
        ],
        lat: e.lat,
        lng: e.lng,
        lastIndexedAt: jsonNow(),
        title: e.title,
        // No terms URL
        // termsUrl:
        sourceUrl: this.INDEX_URL,
      };

      super.writeCrawlJson(cameraItem);
    }
  }
}
