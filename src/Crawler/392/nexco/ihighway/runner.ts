import { JapanRunner } from 'Crawler/392/JapanRunner';
import {

} from '@client/Types';
import { RawLocationJson, } from 'CrawlerTypes';
import { WARN } from 'Logging';

import { downloadJson, jsonNow, } from 'CrawlerTools';

import { LocationHintDatabase, trySearchLocation } from 'GeoTools';

export class Runner extends JapanRunner {
  public readonly LocalCodes = this.getLocalCodes();

  private readonly TOP_URL = 'https://ihighway.jp/';
  private readonly INDEX_URL = `${this.TOP_URL}pcsite/map/`;
  private readonly INDEX_JSON_URL = `${this.TOP_URL}datas/json/cameraInfo.json`;

  protected getLocalCodes(): string[] {
    return ['nexco', 'ihighway'];
  }

  getIndexInterval(): number {
     return (24 * 60 * 60);
  }

  getActivateInterval(): number {
     return (15 * 60);
  }

  public getFriendlyName(): string {
    return 'ハイウェイ交通情報';
  }

  public run(): void {

    const indexJson = downloadJson(this.INDEX_JSON_URL);

    const db: LocationHintDatabase = {
      locations: [
        { title: '滋賀・福井県境付近',    lat: 35.896227, lng: 136.211158, },
        { title: '伊吹PA付近',            lat: 35.332507, lng: 136.393846, },
        { title: '大津IC付近',            lat: 34.996497, lng: 135.869884, },
        { title: '法隆寺〜郡山間',        lat: 34.605258, lng: 135.763167, },
        { title: '摂津北〜摂津南間',      lat: 34.771525, lng: 135.563872, },
        { title: '大飯高浜〜小浜西間',    lat: 35.445677, lng: 135.598611, },
        { title: '伊川谷〜玉津間',        lat: 34.680818, lng: 135.001777, },
        { title: '小坂PA付近',            lat: 40.344412, lng: 140.730537, },
        { title: '花輪SA付近',            lat: 40.185192, lng: 140.802169, },
        { title: '岩手山SA付近',          lat: 39.914562, lng: 141.046515, },
        { title: '小野IC〜差塩PA間',      lat: 37.238945, lng: 140.676992, },
        { title: '談合坂SA付近',          lat: 35.629367, lng: 139.045528, },
        { title: '深川〜旭川鷹栖間',      lat: 43.793310, lng: 142.280250, },
        { title: '北広島〜恵庭間',        lat: 42.931547, lng: 141.531580, },
        { title: '朝里〜銭函間',          lat: 43.151659, lng: 141.116805, },
        { title: '由仁PA〜夕張IC間  ',    lat: 42.908907, lng: 141.987756, },
        { title: 'トマム〜十勝清水間',    lat: 43.059475, lng: 142.779048, },
        { title: '板野〜引田間',          lat: 34.208000, lng: 134.399808, },
        { title: '津田寒川〜志度間',      lat: 34.300564, lng: 134.214966, },
        { title: '笹ヶ峰トンネル付近',    lat: 33.898304, lng: 133.632702, },
        { title: '杉津PA（新潟方面）',    lat: 35.732813, lng: 136.112517, },
        { title: '胎内BS',                lat: 38.078941, lng: 139.385998, },
        { title: '中之島見附IC〜栄PA間',  lat: 37.571123, lng: 138.886982, },
        { title: '上方BS',                lat: 37.464060, lng: 138.795496, },
        { title: '有磯海SA付近',          lat: 36.783620, lng: 137.409939, },
        { title: '石川・富山県境付近',    lat: 36.604295, lng: 136.793899, },
        { title: '杉津PA（米原方面）',    lat: 35.732446, lng: 136.114882, },
        { title: '滋賀・福井県境付近',    lat: 35.590320, lng: 136.186446, },
        { title: '六日町IC〜大和PA間',    lat: 37.109272, lng: 138.904621, },
        { title: '湯沢IC〜塩沢石打IC間',  lat: 36.975557, lng: 138.809268, },
        { title: '妙高高原IC〜妙高SA間',  lat: 36.897135, lng: 138.205434, },
        { title: '中郷IC〜新井PA間',      lat: 37.002420, lng: 138.207715, },
        { title: '城端SA付近',            lat: 36.502176, lng: 136.874159, },
        { title: '飛騨白川PA',            lat: 36.274368, lng: 136.894373, },
        { title: '西条〜志和間',          lat: 34.460571, lng: 132.707138, },
        { title: '駒ヶ岳SA付近',          lat: 35.712964, lng: 137.907372, },
        { title: '伊吹PA付近',            lat: 35.332540, lng: 136.391516, },
        { title: '亀山JCT〜土山SA',       lat: 34.915683, lng: 136.388710, },
        { title: '鳥栖JCT付近(熊本方面)', lat: 33.392819, lng: 130.538052, },
        { title: '鳥栖JCT付近(長崎方面)', lat: 33.395837, lng: 130.535901, },
        { title: '天間BS付近',            lat: 33.329389, lng: 131.419300, },
        { title: '天神山TN付近',          lat: 33.151702, lng: 129.757585, },
      ],
    };

    for (const areaKey in indexJson) {
      const j1 = indexJson[areaKey];


      if (typeof j1 !== 'object') {
        WARN(`Not an object `, j1);
        continue;
      }

      for (const k in j1) {
        const j2 = j1[k];

        if (!Array.isArray(j2)) {
          WARN(`Not an array `, j2);
          continue;
        }

        for (const item of j2) {
          const id = item['id'];
          const title = item['title'];
          const resultJson = trySearchLocation(title, db);

          if (!resultJson) {
            WARN(`No unique result for ${title}`);
            continue;
          }

          const imageUrl = `${this.TOP_URL}camera/webcam${id}-00.jpg`;
          const s2cellId = super.getS2CellId(resultJson.location.lat, resultJson.location.lng);
          const cameraItem: RawLocationJson = {
            state: 'raw',
            s2cellId,
            thumbLinks: [
              {
                sourceLink: imageUrl,
              },
            ],
            lat: resultJson.location.lat,
            lng: resultJson.location.lng,
            lastIndexedAt: jsonNow(),
            title,
            // No terms URL
            // termsUrl:
            sourceUrl: this.INDEX_URL,
            isFuzzyLocation: true,
          };

          if (typeof resultJson.direction === 'number') {
            cameraItem.thumbLinks[0].direction = resultJson.direction;
          }

          super.writeCrawlJson(cameraItem);
        }
      }
    }
  }
}
