export declare type S2CellKey = string;
export declare type S2CellId = string;

export declare type S2QuadList = [ S2CellKey, S2CellKey, S2CellKey, S2CellKey ];
export declare type S2QuadLatLng = [ S2.L.LatLng, S2.L.LatLng, S2.L.LatLng, S2.L.LatLng ];
export declare type S2QuadCell = [ S2.S2Cell, S2.S2Cell, S2.S2Cell, S2.S2Cell ];
export declare type S2XYZ = [ number, number, number ];
export declare type S2UV = [ number, number ];
export declare type S2FaceUV = [ S2Face, S2UV ];
export declare type S2Face = number;
export declare type S2ST = [ number, number ];
export declare type S2IJ = [ number, number ];

// Declare *Fn as functions, to share duplicated api.
declare type KeyToIdFn = (key: S2CellKey) => S2CellId;
declare type IdToKeyFn = (id: S2CellId) => S2CellKey;
declare type FacePosLevelToIdFn = (faceN: number, posS: string, levelN: number) => S2CellId;
declare type LatLngToNeighborKeysFn = (lat: number, lng: number, level: number) => S2QuadList;
declare type BothSideStepKeyFn = (key: S2CellKey) => S2CellKey;
declare type LatLngToKeyFn = (lat: number, lng: number, level: number) => S2CellKey;
declare type IdToLatLngFn = (id: S2CellId) => S2.L.LatLng;
declare type KeyToLatLngFn = (key: S2CellKey) => S2.L.LatLng;

export declare namespace S2 {
  var latLngToKey: LatLngToKeyFn;
  var latLngToQuadkey: LatLngToKeyFn;
  var keyToLatLng: KeyToLatLngFn;
  var idToLatLng: IdToLatLngFn;
  var latLngToNeighborKeys: LatLngToNeighborKeysFn;
  // TODO probablly wrong entry
  // declare FromLatLng(latLng: S2.L.LatLng, level: number): S2QuadList;
  var prevKey: BothSideStepKeyFn;
  var nextKey: BothSideStepKeyFn;
  function stepKey(key: S2CellKey, num: number): S2CellKey;
  var facePosLevelToId: FacePosLevelToIdFn;
  var fromFacePosLevel: FacePosLevelToIdFn;
  function LatLngToXYZ(latLng: S2.L.LatLng): S2XYZ;
  function XYZToLatLng(xyz: S2XYZ): S2.L.LatLng;
  function XYZToFaceUV(xyz: S2XYZ): S2FaceUV;
  function FaceUVToXYZ(face: S2Face, uv: S2UV): S2XYZ;
  function STToUV(st: S2ST): S2UV;
  function UVToST(uv: S2UV): S2ST;
  function STToIJ(st: S2ST, order: number): S2IJ;
  function IJToST(ij: S2IJ ,order: number, offsets: [number, number]): S2ST;

  var toCellId: KeyToIdFn;
  var keyToId: KeyToIdFn;
  var toId: KeyToIdFn;
  var fromKey: KeyToIdFn;
  var idToKey: IdToKeyFn;
  var toKey: IdToKeyFn;
  var fromId: IdToKeyFn;
  var fromCellId: IdToKeyFn;
  var toHilbertQuadkey: IdToKeyFn;
  var FACE_BITS: number;
  var MAX_LEVEL: number;
  var POS_BITS: number;

  class S2Cell {
    static FromHilbertQuadKey(hilbertQuadkey: S2CellKey): S2.S2Cell;
    static FromLatLng(latLng: S2.L.LatLng, level: number): S2.S2Cell;
    static FromFaceIJ(face: S2Face, ij: S2IJ, level: number): S2.S2Cell;
    static idToLatLng: IdToLatLngFn;
    static keyToId: KeyToIdFn;
    static idToKey: IdToKeyFn;
    static toKey: IdToKeyFn;
    static toHilbertQuadkey: IdToKeyFn;
    static facePosLevelToId: FacePosLevelToIdFn;
    static latLngToNeighborKeys: LatLngToNeighborKeysFn;
    static prevKey: BothSideStepKeyFn;
    static nextKey: BothSideStepKeyFn;
    static latLngToKey: LatLngToKeyFn;
    static keyToLatLng: KeyToLatLngFn;

    toString(): string;
    getLatLng(): S2.L.LatLng;
    getCornerLatLngs(): S2QuadLatLng;

    getFaceAndQuads(): [number, S2QuadList];
    toHilbertQuadkey(): S2CellKey;
    getNeighbors(): S2QuadCell;
  }

  namespace L {
    class LatLng {
      static DEG_TO_RAD: number;
      static RAD_TO_DEG: number;
      constructor(
        public lat: number,
        public lng: number,
        noWrap: boolean,
      );
    }
  }
}
