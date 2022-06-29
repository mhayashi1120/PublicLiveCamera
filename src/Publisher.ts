import { S2CellId } from 's2-geometry';

import {  } from 'Logging';

import { BasePublisher } from 'Publish/BasePublisher';
import { Publisher050 } from 'Publish/Publisher050';
import { Publisher051 } from 'Publish/Publisher051';

import { VersionJson } from '@client/Types';

export class Publisher {
  // Ordered by the newest version of publisher
  private readonly publishers: BasePublisher[] = [];

  constructor(
  ){
    this.publishers.push(new Publisher051());
    this.publishers.push(new Publisher050());
  }

  removeFromTree(leafId: S2CellId, rootDir: string): void {
    for (const p of this.publishers.slice(1)) {
      p.removeFromTree(leafId, rootDir);
    }

    this.publishers[0].removeFromTree(leafId, rootDir);
  }

  createTree(fromDir: string, toRoot: string): number {
    for (const p of this.publishers.slice(1)) {
      p.createTree(fromDir, toRoot);
    }

    return this.publishers[0].createTree(fromDir, toRoot);
  }

  expireTree(publishRootDir: string, limitTime: number): number {
    for (const p of this.publishers.slice(1)) {
      p.expireTree(publishRootDir, limitTime);
    }

    return this.publishers[0].expireTree(publishRootDir, limitTime);
  }

  getSupportedVersions(): VersionJson[] {

    const supportedIndex: VersionJson[] = [];

    for (const p of this.publishers) {
      supportedIndex.push(p.getVersion());
    }

    return supportedIndex;
  }

}
