import { BasePublisher } from './BasePublisher';

import { VersionJson } from '@client/Types';
import { getIndexRootResource } from 'Settings';

import {
  getLevel,
  NodeSegment,
  getAncestors,
  getChildId,
} from '@client/S2Utility';

class Core {
  // TODO Now adjusting.
  // This is system constant. If change the value, then need full construct `data` directory.
  public static readonly LEAF_COUNT = 15;

  public static readonly PUBLISH_VERSION_SEMVER = '0.5.1';
  public static readonly PUBLISH_VERSION_KEY = 'e43a6bd6';
  public static readonly PUBLISH_VERSION_AT = new Date('2022-02-11 15:00:00');
}

/**
 * Version 0.5.1 just change SYSTEM_NOTCH
 */
export class Publisher051 extends BasePublisher {
  constructor() {
    super({
      LeafCount: 15,
      VersionKey: Core.PUBLISH_VERSION_KEY,
      getLevel: getLevel,
      NodeSegment: NodeSegment,
      getAncestors: getAncestors,
      getChildId: getChildId,
    });
  }

  getVersion(): VersionJson {
    const v: VersionJson = {
      semver: Core.PUBLISH_VERSION_SEMVER,
      releasedAt: Core.PUBLISH_VERSION_AT,
      targetPath: getIndexRootResource(Core.PUBLISH_VERSION_KEY),
    };

    return v;
  }

}
