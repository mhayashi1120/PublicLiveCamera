import { S2, S2CellKey, S2CellId,} from 's2-geometry';

// This value control key segment length except root level node.
// e.g. S2cellKey: '1/012301234' split to -> ['1', '012', '301', '234']
//  TODO improve terms. Root level? face? iij?
const SYSTEM_LEVEL_NOTCH: number = 1;
const NOTCH_SPLITTER_RE = new RegExp(`[0-3]{1,${SYSTEM_LEVEL_NOTCH}}`, 'g');

export function getIdLevel(id: S2CellId): number {
  const key = S2.idToKey(id);

  return getLevel(key);
}

export function getLevel(key: S2CellKey): number {
  const parts = key.split('/');

  // TODO other S2 interface?
  return parts[1].length;
}

/*
 * This system now use no all level. Only 3 notch to suppress deep nest.
 */
export function getAncestors(leafId: S2CellId): S2CellId[] {
  const level = getIdLevel(leafId);

  if (level !== S2.MAX_LEVEL) {
    throw new Error(`Unexpected level of id ${level}`);
  }

  const latLng = S2.idToLatLng(leafId);
  const result: S2CellId[] = [];

  for (let lv = SYSTEM_LEVEL_NOTCH; lv < S2.MAX_LEVEL; lv += SYSTEM_LEVEL_NOTCH) {
    const key = S2.latLngToKey(latLng.lat, latLng.lng, lv);
    const id = S2.keyToId(key);

    result.push(id);
  }

  result.push(leafId);

  return result;
}

/**
 * This interface used with rebuild tree node
 */
export function getChildId(currentNodeId: S2CellId, leafId: S2CellId): S2CellId {
  const currentNodeKey = S2.idToKey(currentNodeId);
  const leafKey = S2.idToKey(leafId);

  const childKey = leafKey.substring(0, currentNodeKey.length + SYSTEM_LEVEL_NOTCH)

  return S2.keyToId(childKey);
}

/**
 * @deprecated should use NodeSegment
 */
export type Segments = string[];

/**
 * @deprecated should use NodeSegment
 */
export function segmentsIsAncestor(s: Segments, descendant: Segments): boolean {
  if (s.length === descendant.length) {
    return false;
  }

  return segmentsIsDescendant(descendant, s);
}

/**
 * @deprecated should use NodeSegment
 */
export function segmentsIsDescendant(s: Segments, ancestor: Segments): boolean {
  if (s.length <= ancestor.length) {
    return false;
  }

  for (let i = 0; i < ancestor.length; i++) {
    if (s[i] !== ancestor[i]) {
      return false;
    }
  }

  return true;
}

export function segmentsListEquals(s1: Segments[], s2: Segments[]): boolean {
  if (s1.length !== s2.length) {
    return false;
  }

  for (let i = 0; i < s1.length; i++) {
    if (!segmentsEquals(s1[i], s2[i]))  {
      return false;
    }
  }

  return true;
}

/**
 * @deprecated should use NodeSegment
 */
export function segmentsEquals(s1: Segments, s2: Segments): boolean {

  if (s1.length !== s2.length) {
    return false;
  }

  for (let i = 0; i < s1.length; i++) {
    if (s1[i] !== s2[i])  {
      return false;
    }
  }

  return true;
}

/**
 * Guessed segment list to display on the map bouding.
 * TODO Maybe changed future release.
 * @params lat1 NorthEast lat
 * @params lng1 NorthEast lng
 * @params lat2 SouthWest lat
 * @params lng2 SouthWest lng
 * @deprecated should use getNodeSegments()
 */
export function getSegmentList(lat1: number, lng1: number, lat2: number, lng2: number): Segments[] {
  const ns = getNodeSegments(lat1, lng1, lat2, lng2);

  return ns.map(n => n.segments);
}

/**
 * Guessed segment list to display on the map bouding.
 * TODO Maybe changed future release.
 * @params lat1 NorthEast lat
 * @params lng1 NorthEast lng
 * @params lat2 SouthWest lat
 * @params lng2 SouthWest lng
 */
export function getNodeSegments(lat1: number, lng1: number, lat2: number, lng2: number): NodeSegment[] {
  // 15 is enough to max level (enough to be nearly)
  let level = 15;

  for (let l = level; 0 < l ; l--) {
    const me = S2.latLngToKey(lat1, lng1, l);
    const myNeighbors = S2.latLngToNeighborKeys(lat1, lng1, l);
    const him = S2.latLngToKey(lat2, lng2, l);
    const hisNeighbors = S2.latLngToNeighborKeys(lat2, lng2, l);

    if (me === him) {
      return [
        new NodeSegment(me),
        ...myNeighbors.map(k => new NodeSegment(k)),
      ];
    }

    if (myNeighbors.includes(him) || hisNeighbors.includes(me)) {
      const keys = Array.from(new Set([me, ...myNeighbors, ...hisNeighbors]));

      return keys.map(k => new NodeSegment(k));
    }
  }

  // Return forcibly roots level
  return [0,1,2,3,4,5].map(r => NodeSegment.FromSegment([`${r}`]));
}

/**
 * Almost same as S2 level. Not like S2,  introduce level 0 to handle root level segments.
 */
export function getSegmentLevel(segments: Segments): number {
  if (segments.length === 0) {
    throw new Error(`Empty segment is invalid.`);
  }

  if (segments.length === 1) {
    return 0;
  }

  return segments.slice(1).join('').length;
}

/**
 * @deprecated should use NodeSegment
 */
export function idToSegments(id: S2CellId): Segments {
  const key = S2.idToKey(id);

  return splitSegment(key);
}

/**
 * @deprecated should use NodeSegment
 */
export function splitSegment(key: S2CellKey): Segments {
  const [root, branch]  = key.split('/') as [string, string];

  const branchParts = branch.match(NOTCH_SPLITTER_RE);

  if (!branchParts) {
    throw new Error(`Unexpectedly unmatched to key ${key}`);
  }

  const seg = [root, ...branchParts];

  return seg;
}

/**
 * @deprecated should use NodeSegment
 */
export function parentSegment(segments: Segments): Segments {
  if (segments.length === 0) {
    throw new Error(`Segments is empty`);
  }

  return segments.slice(0, segments.length - 1);
}

/**
 * @deprecated should use NodeSegment
 */
export function concatSegment(segments: Segments, child: string): Segments {
  return [...segments, child];
}

/**
 * @deprecated should use NodeSegment
 */
export function buildPath(segments: Segments): string {
  return segments.join('/');
}

export type S2RootKey = string;
export type S2CellExtendKey = S2CellKey | S2RootKey;

export function isS2RootKey(s: string): s is S2RootKey {
  return /^([0-5])\/$/.test(s);
}

/**
 * TODO just introduce new class About Segments class
 * TODO should test
 */
export class NodeSegment {

  public readonly segments: Segments;

  /**
   * Extended S2 level
   */
  public readonly S2Level: number;

  public static FromSegment(segments: Segments): NodeSegment {
    return new NodeSegment(`${segments[0]}/${segments.slice(1).join('')}`);
  }

  public static FromS2CellId(id: S2CellId): NodeSegment {
    return new NodeSegment(S2.idToKey(id));
  }

  constructor (
    public readonly key: S2CellExtendKey,
  ) {
    const m = /^([0-5])\/$/.exec(key);
    if (m) {
      this.segments = [m[1]];
      this.S2Level = 0;
    } else {
      this.segments = splitSegment(key);
      this.S2Level = getSegmentLevel(this.segments);
    }
  }

  public toId(): S2CellId {
    return S2.keyToId(this.key);
  }

  public concatSegment(child: string): NodeSegment {
    return NodeSegment.FromSegment(concatSegment(this.segments, child));
  }

  public buildPath(): string {
    return buildPath(this.segments);
  }

  public parentSegment(): NodeSegment {
    return NodeSegment.FromSegment(parentSegment(this.segments));
  }

  public isDescendant(node: NodeSegment): boolean {
    return segmentsIsDescendant(node.segments, this.segments);
  }

  public isAncestor(node: NodeSegment): boolean {
    return segmentsIsAncestor(node.segments, this.segments);
  }

  public equals(node: NodeSegment): boolean {
    return segmentsEquals(node.segments, this.segments);
  }
}

export function nodeSegmentsEquals(s1: NodeSegment[], s2: NodeSegment[]): boolean {
  if (s1.length !== s2.length) {
    return false;
  }

  for (let i = 0; i < s1.length; i++) {
    if (!(s1[i].equals(s2[i])))  {
      return false;
    }
  }

  return true;
}
