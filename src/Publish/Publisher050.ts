
import { BasePublisher } from './BasePublisher';

import { VersionJson } from '@client/Types';
import { getIndexRootResource } from 'Settings';

import {
  getLevel,
  NodeSegment,
  getAncestors,
  getChildId,
} from '@client/S2Utility3';

class Core {
  // TODO Now adjusting.
  // This is system constant. If change the value, then need full construct `data` directory.
  public static readonly LEAF_COUNT = 15;

  // TODO obsolete
  public static readonly PUBLISH_VERSION = 4;

  public static readonly PUBLISH_VERSION_SEMVER = '0.5.0';
  public static readonly PUBLISH_VERSION_KEY = 'efdd3462';
  public static readonly PUBLISH_VERSION_AT = new Date('2022-01-27 19:00:00');
}

export class Publisher050 extends BasePublisher {
  constructor() {
    super({
      LeafCount: Core.LEAF_COUNT,
      VersionKey: Core.PUBLISH_VERSION_KEY,
      getLevel: getLevel,
      NodeSegment: NodeSegment,
      getAncestors: getAncestors,
      getChildId: getChildId,
    });
  }

  getVersion(): VersionJson {
    const v: VersionJson = {
      value: Core.PUBLISH_VERSION,
      key: Core.PUBLISH_VERSION_KEY,
      semver: Core.PUBLISH_VERSION_SEMVER,
      releasedAt: Core.PUBLISH_VERSION_AT,
      targetPath: getIndexRootResource(Core.PUBLISH_VERSION_KEY),
    };

    return v;
  }
}
