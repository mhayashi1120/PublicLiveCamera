import { S2CellId, } from 's2-geometry';

export interface BaseLocationJson {
  state: 'raw' | 'activated',
}

/**
 * TODO
 */
export interface RawLiveCameraThumb {
  /**
   * Image url
   */
  sourceLink: string;
  /**
   * 0 <= Degrees from North < 360 if supplied from upstream.
   */
  direction?: number;
  /**
   * This should be added when `sourceLink` field is frequently rewrite
   * by indexing.
   */
  artificialThumbId?: number;
}

/**
 * TODO
 * Almost same fields as CameraLocationJson. These fields transfer to
 * a CameraLocationJson.
 */
export interface RawLocationJson extends BaseLocationJson {
  /**
   * level30
   */
  s2cellId: S2CellId;
  /**
   * level30
   */
  thumbLinks: RawLiveCameraThumb[];
  /**
   * Last indexed by crawler. Serialized by UTC time.
   */
  lastIndexedAt: string;
  /**
   * Source geo
   */
  lat: number;
  /**
   * Source geo
   */
  lng: number;
  /**
   * TODO more descrpition
   */
  artificialId?: string | undefined;
  /**
   * Control never create cache. this value prior than `mustCache`
   */
  neverCache?: boolean | undefined;
  /**
   * Control thumbnail cache must be created.
   */
  mustCache?: boolean | undefined;
  /**
   * TOS Resource URL (TODO Remove optional after release)
   */
  termsUrl?: string | undefined;
  /**
   * Maybe index pages
   */
  sourceUrl: string | undefined;
  /**
   * Human readable name.
   */
  title?: string | undefined;
  /**
   * Camera location (lat, lng) may point to wrong place.
   * source html or json doesnot have exact location.
   */
  isFuzzyLocation?: boolean | undefined;
  /**
   * This camera is no need activation.
   * should use with `assumedActivationAt`
   */
  neverActivate?: boolean | undefined;
  /**
   * Activation is done assumed at this time.
   */
  assumedActivationAt?: string | undefined;
}

/**
 * Optional fields of RawLocationJson
 */
export const RawLocationJsonOptionals: string[] = [
  'artificialId',
  'neverCache',
  'mustCache',
  'termsUrl',
  'sourceUrl',
  'title',
  'isFuzzyLocation',
  'neverActivate',
  'assumedActivationAt',
];

export interface ActivatedLiveCameraThumb extends RawLiveCameraThumb {
  /**
   * MD5 hash source contents.
   */
  sourceHash?: string;
  /**
   * hash time source contents.
   */
  sourceCheckedAt?: string;
  /**
   * link to local repository cache maybe.
   */
  cacheLink?: string;
  /**
   * @deprecated
   */
  cacheTime?: string;
  /**
   * cached Time
   */
  cacheAt?: string;
}

export interface ActivatedLocationJson extends RawLocationJson {
  artificialId?: string;
  /**
   * Thumbnail links the location camera has.
   */
  thumbLinks: ActivatedLiveCameraThumb[];
  /**
   * foreign site reject CORS (default false)
   */
  isRejectCORS?: boolean;
  /**
   * any Link is active or not.
   */
  isActive: boolean;
  /**
   * Image is last checked by crawler.
   */
  lastActivatedAt: string;
}

/**
 * TODO
 */
export interface ManualCrawlEntry extends ManualLocationSource {
  /**
   * set true after work is done. should not set roughly set the value
   */
  strictWork?: true,
  /**
   * Image url
   */
  url: string;
  /**
   * Old s2cellid to migrate Location
   */
  migrateS2CellId?: string;
}

/**
 * TODO
 */
export type ManualTargetDatabase = ManualCrawlEntry[];

/**
 * Denote simple index pages that hold `allImageCount` `img` tags
 * and each `IndexNoLocationImage` point
 */
export interface IndexNoLocationTargets {
  allImageCount: number;
  targets: IndexNoLocationImage[];
}

/**
 * TODO
 */
export interface IndexNoLocationImage extends ManualLocationSource {
  /**
   * Set to true after `lat`, `lng` is correctly investigated.
   * this is unset or false means `CameraLocationJson.isFuzzyLocation` will be true.
   */
  strictWork?: boolean,
  index: number;
}

export type NoIndexSinglePageDatabase = NoIndexSinglePageUrlLocation[];

export interface NoIndexSinglePageUrlLocation extends ManualLocationSource {
  url: string;
  strictWork?: boolean;
}

export type IndexNoLocationDatabase = IndexNoLocationTargets;


export interface FullyManualImage extends ManualLocationSource {
  indexUrl: string;
  imageUrl: string;
  direction?: number;
}

export interface ManualLocationSource {
  lat: number;
  lng: number;
  title?: string;
}

export type FullyManualImageDatabase = FullyManualImage[];

export type DomainRule = DomainContainer | string | RegExp;

// TODO FIXME just support prefixed asterisk "*.com", "*.lg.jp"
export class DomainContainer {

  private suffix: string | null = null;
  constructor(private pattern: string) {
    if (pattern.startsWith('*')) {
      this.suffix = pattern.substring(1);
    }
  }

  isMatch(host: string) {
    if (this.suffix) {
      return host.endsWith(this.suffix);
    } else {
      return host === this.pattern;
    }
  }
}

export class DomainMatcher {

  constructor(
    private readonly rule: DomainRule,
  ) {
  }

  isMatch(host: string): boolean {
    if (this.rule instanceof DomainContainer) {
      return this.rule.isMatch(host);
    } else if (typeof this.rule === 'string') {
      return this.rule === host;
    } else if (this.rule instanceof RegExp) {
      return this.rule.test(host);
    } else {
      throw new Error(`Assertion. Not yet suported rule.`);
    }
  }
}
