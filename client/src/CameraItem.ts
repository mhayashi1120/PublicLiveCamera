import { S2, S2CellId, } from 's2-geometry';

export class CameraItem {
  constructor(
    public readonly lat: number,
    public readonly lng: number,
  ) {
  }

  getAncestors(): S2CellId[] {
    console.log('TODO geo', S2.latLngToKey(1, 1, 10));

    // TODO compute nodes from root to lat,lng
    // Result array ordered from root to leaf
    return [];
  }
}
