import { S2CellKey, S2CellId, } from 's2-geometry';

/**
 * Version information
 */
export interface VersionJson {
  /**
   * Sequence version
   * @deprecated should use `semver`
   */
  value?: number;
  /**
   * string with hex. (Currently 8 chars)
   * @deprecated should use `semver`
   */
  key?: string;
  /**
   * version string
   */
  semver: string;
  /**
   * Path which point to the server resource (e.g. 'thumb/1', 'index/1.0.0')
   */
  targetPath: string;
  /**
   * last upgraded date
   */
  releasedAt: Date;
}

/**
 * System top level version information
 */
export interface SystemVersionJson {
  /**
   * The newest version
   * @deprecated
   */
  recent: VersionJson;
  /**
   * Supported versions ordered by semver descendant
   * @deprecated
   */
  supported: VersionJson[];
  /**
   * Supported versions ordered by semver descendant
   */
  supportedIndex: VersionJson[];
  /**
   * Supported versions ordered by semver descendant
   */
  supportedThumbs: VersionJson[];
}

/**
 * Denote Github Action status
 * TODO, FIXME just prepare typings. Highly possible changed future.
 */
export interface ActionStatusJson {
  /**
   * Friendly task name
   */
  taskName: string;
  /**
   * URL to display action current status
   */
  statusBadgeUrl: string;
  /**
   * URL to display action
   */
  actionUrl: string;
}

// TODO more strict
export function isS2CellNodeJson(x: any): x is S2CellNodeJson{
  return 's2cellId' in x;
}

export function isParentGroupJson(n: CameraNodeBaseJson): n is CellParentNodeJson {
  return isCellRootJson(n) || isCellGroupJson(n);
}

export function isCellRootJson(n: CameraNodeBaseJson): n is CameraRootJson {
  return 'type' in n && n['type'] === 'root';
}

export function isCellLeafGroupJson(n: CameraNodeBaseJson): n is CellLeafGroupJson {
  return 'type' in n && n['type'] === 'leaf';
}

export function isCellGroupJson(n: CameraNodeBaseJson): n is CellGroupJson {
  return 'type' in n && n['type'] === 'group';
}

export interface LiveCameraThumb {
  /**
   * Thumb link
   * @deprecated
   */
  link?: string;
  /**
   * Locally cached Thumbnail link
   */
  cacheLink?: string;
  /**
   * cached Time
   * @deprecated
   */
  cacheTime?: string;
  /**
   * cached Time
   */
  cacheAt?: string;
  /**
   * Source link image url.
   */
  sourceLink: string;
  /**
   * should use `CameraLocationJson.sourceUrl`
   * @deprecated
   */
  sourceUrl?: string;
  /**
   * 0 <= Degrees from North < 360 if supplied from upstream.
   */
  direction?: number;
}

export interface CameraLocationJson {
  /**
   * level30
   */
  s2cellId: S2CellId;
  /**
   * Source geo
   */
  lat: number;
  /**
   * Source geo
   */
  lng: number;
  /**
   * Link is active or not.
   * `active` means any thumbnail is active and optionaly image can handle by ImageMagick.
   */
  isActive: boolean;
  /**
   * Last indexed by crawler. Serialized by UTC time.
   */
  lastIndexedAt: string;
  /**
   * Last checked by crawler. Serialized by UTC time. on Github Action.
   * @deprecated
   */
  lastActivated?: string;
  /**
   * Image is last checked by crawler. Serialized by UTC time.
   */
  lastActivatedAt: string;
  /**
   * TOS Resource URL (maybe undefined if not supplied.)
   */
  termsUrl?: string | undefined;
  /**
   * URL that hold index html rather than `sourceLink` field.
   * e.g. sourceLink has "image/2022-01-01/030405938.jpg" value that may have been changed frequently.
   *     on this case, client app should link to the parent index page.
   * TODO, FIXME this optional mark will be removed
   */
  sourceUrl?: string;
  /**
   * Title text of the image
   */
  title?: string;
  /**
   * Link that control loadType 'simple' link
   * @deprecated should use thumbLinks
   */
  link?: string;
  /**
   * Links that is shown to user.
   */
  thumbLinks: LiveCameraThumb[];
  /**
   * foreign site reject CORS (default false)
   */
  isRejectCORS?: boolean;
  /**
   * Fuzzy means not supplied exact latitude and longitude from source site.
   */
  isFuzzyLocation?: boolean;
}

export interface CameraNodeBaseJson {
  type: 'root' | 'group' | 'leaf';
  /**
   * Segments path include the segment.
   */
  nodeSegments: string[];
}

// TODO should use this
export interface CellParentNodeJson extends CameraNodeBaseJson {
  type: 'root' | 'group';
  count: number;
  children: string[]
}

// TODO rename CameraRootJson -> CellRootJson
export interface CameraRootJson extends CellParentNodeJson {
  type: 'root';
  // TODO lat,lng
}

export interface S2CellNodeJson {
  s2cellId: S2CellId;
  s2cellKey: S2CellKey;
  s2cellLevel: number;
}

export interface CameraNodeJson extends CameraNodeBaseJson, S2CellNodeJson {
  type: 'leaf' | 'group';
}

export interface CellGroupJson extends CellParentNodeJson, CameraNodeJson {
  type: 'group';
  s2cellLat: number;
  s2cellLng: number;
}

// TODO
export interface CellLeafGroupJson extends CameraNodeJson, CameraNodeJson {
  type: 'leaf';
  members: CameraLocationJson[];
}

// TODO not used?
export type CameraDatabase = CameraNodeJson[];
