import { ManualLocationSource, }  from 'CrawlerTypes';
import { RawLocationJson } from 'CrawlerTypes';

import { S2 } from 's2-geometry';
import URLParse from 'url-parse';
import { jsonNow, downloadFile, downloadText, } from 'CrawlerTools';
import { ERROR } from 'Logging';

export interface CanonVBC60 extends ManualLocationSource {
  openUrl: string;
  indexUrl: string;
  imageUrlPrefix: string;
  parameterName: string;
}

function safeReadIndex(item: CanonVBC60): string | null {
  try {
    // Just check index url is active
    downloadFile(item.indexUrl);

    const realIndex = downloadText(item.openUrl);

    const m = realIndex.match(/^s:=(.*)$/m)

    if (!m) {
      return null;
    }

    const url = new URLParse(item.imageUrlPrefix, true);
    const sessionId = m[1];

    url.query[item.parameterName] = sessionId;

    return url.toString();
  } catch (err) {
    ERROR(`Error while retrieving ${item}`, err);
    return null;
  }
}

export function getS2CellId(lat: number, lng: number) {
  const key = S2.latLngToKey(lat, lng, S2.MAX_LEVEL);

  return S2.keyToId(key);
}

export function generateLocation(db: CanonVBC60[]): RawLocationJson[] {

    const res: RawLocationJson[] = [];

    for (const item of db) {

      const imageUrl = safeReadIndex(item);

      if (!imageUrl) {
        ERROR(`No valid image source on ${item.indexUrl}`);
        continue;
      }

      const s2cellId = getS2CellId(item.lat, item.lng);

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks: [
          {
            sourceLink: imageUrl,
            // To detect just one thumbnail
            artificialThumbId: 1,
          },
        ],
        lat: item.lat,
        lng: item.lng,
        // No terms found
        // termsUrl: this.TERMS_URL,
        lastIndexedAt: jsonNow(),
        sourceUrl: item.indexUrl,
        title: item.title,
      };

      res.push(cameraItem);
    }

    return res;
  }
