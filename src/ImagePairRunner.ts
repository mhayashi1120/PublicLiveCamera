// import { AbstractRunner } from './AbstractRunner';

import { ManualTargetDatabase, } from './CrawlerTypes';

/**
 * Collaborate with AbstractRunner
 */
export class ImagePairRunner {
  public runManual(db: ManualTargetDatabase) {
    for (const entry of db) {
      console.log('TODO', entry);
    }
  }
}
