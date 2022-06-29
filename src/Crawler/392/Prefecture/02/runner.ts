import { PrefectureRunner } from 'Crawler/392/PrefectureRunner';
import {
  LiveCameraThumb,
} from '@client/Types';
import { RawLocationJson, } from 'CrawlerTypes';
import { D, VERB, WARN, ERROR, } from 'Logging';

import {
  downloadHtml, downloadDocument,
  artificialIdentity, jsonNow,
  MapPixelAllocation,
} from 'CrawlerTools';

export class Runner extends PrefectureRunner {
  public readonly LocalCodes = this.getLocalCodes();
  private readonly INDEX_URL = 'http://www.koutsu-aomori.com/cgi-bin/livecamera.cgi';
  private readonly SOURCE_URL = 'http://www.koutsu-aomori.com/Road/livecamera.html';
  private readonly TERMS_URL = 'http://www.koutsu-aomori.com/Road/copyright.html';

  protected getLocalCodes(): string[] {
    return super.getLocalCodes().concat(['02']);
  }

  // index interval is 1 day
  getIndexInterval(): number {
     return (24 * 60 * 60);
  }

  public getFriendlyName(): string {
    return '青森みち情報';
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

  protected run(): void {

    const indexSource = downloadHtml(`${this.INDEX_URL}`, {encoding: 'euc-jp'});
    const doc = indexSource.window.document;
    const anchors = doc.querySelectorAll('a');

    D('Found target elements', anchors.length);

    // 右上: NE: 奥内: top:125 left:460 41.218429, 141.260589
    // 左下: SW: 大間越: top:426 left:69 40.485797, 139.949422

    const allocator = new MapPixelAllocation({
      NE: {
        geo:{ lat: 41.218429, lng: 141.260589 },
        left: 460,
        top: 125,
      },
      SW: {
        geo: { lat: 40.485797, lng: 139.949422 },
        left: 69,
        top: 426,
      },
    });

    for (const anchor of anchors) {

      D('anchor', anchor, anchor.innerHTML);

      const img = anchor.querySelector('img');

      if (!img) {
        continue;
      }

      const top = this.maybeReadPixel(img.style.getPropertyValue('top'))
      const left = this.maybeReadPixel(img.style.getPropertyValue('left'))

      if ((typeof top !== 'number') || (typeof left !== 'number')) {
        continue;
      }

      const onclick = anchor.getAttribute('onclick');

      if (!onclick) {
        continue;
      }

      let sourceLink: string | undefined | null;

      let m: RegExpExecArray | null;

      try {
        if (m = /show_kok\(.*(https?:[^\"\']+)/.exec(onclick)) {
          sourceLink = this.readKokUrl(m[1]);
        } else if (m = /show_cam\([\"\']([^\"\']+)[\"\']/.exec(onclick)) {
          sourceLink = this.readCamUrl(m[1]);
        } else if (m = /show_nex\([\"\']([^\"\']+)[\"\']/.exec(onclick))  {
          sourceLink = this.readNexUrl(m[1]);
        } else {
          VERB('Null onclick', onclick);
          continue;
        }
      } catch (err) {
        ERROR(`Error while retrieving sub page. Continue next.`, err);
        continue;
      }

      if (!sourceLink) {
        continue;
      }
      const artificialId = artificialIdentity([`${top}`, `${left}`], 20);
      const title = img.getAttribute('title') || '';
      const geo = allocator.computeGeo(left, top);
      const thumbLinks: LiveCameraThumb[] = [];
      const s2cellId = super.getS2CellId(geo.lat, geo.lng);

      VERB(`aomori URL`, sourceLink, geo);

      thumbLinks.push({
        sourceLink,
      });

      const cameraItem: RawLocationJson = {
        state: 'raw',
        s2cellId,
        thumbLinks,
        lat: geo.lat,
        lng: geo.lng,
        lastIndexedAt: jsonNow(),
        isFuzzyLocation: true,
        termsUrl: this.TERMS_URL,
        sourceUrl: this.SOURCE_URL,
        title,
        artificialId,
      };

      super.writeCrawlJson(cameraItem);
    }
  }

  readKokUrl(url: string): string | null {
    // Canonicalize value. (Some of value has space)
    url = url.trim();

    const doc = downloadDocument(url, {encoding: 'shift_jis'});
    const imgs = doc.querySelectorAll('img');


    for (const i of imgs) {

      const src = i.getAttribute('src');

      if (!src) {
        continue;
      }

      if (src.startsWith('http://www2.thr.mlit.go.jp/aomori/roadcctv/')) {
        return src;
      }
    }

    return null;
  }

  readNexUrl(url: string): string | null {
    // Canonicalize value. (Some of value has space)
    url = url.trim();

    if (!url.match(/\.jpe?g/)) {
      return null;
    }

    // image asis
    return url;
  }

  readCamUrl(id: string): string | null {
    // Canonicalize value. (Some of value has space)
    id = id.trim();

    const TOP_LEVEL = `http://www.koutsu-aomori.com/`;
    const doc = downloadDocument(`${TOP_LEVEL}cgi-bin/popca.cgi?${id}`, {encoding: 'euc-jp'});
    const imgs = doc.querySelectorAll('img');

    if (imgs.length !== 1) {
      WARN(`Not a expected index contents`, imgs);
      return null;
    }

    const img = imgs[0];
    const src = img.getAttribute('src');

    if (!src) {
      return null;
    }

    if (!src.startsWith('../camera')) {
      return null;
    }

    const m = /\/(camera\/[^/]+\.jpe?g)/.exec(src);

    if (!m) {
      return null;
    }

    const path = m[1];

    return `${TOP_LEVEL}${path}`;
  }

}
