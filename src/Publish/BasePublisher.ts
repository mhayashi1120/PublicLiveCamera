import * as path from 'path';
import * as fs from 'fs';

import { VersionJson } from '@client/Types';

import { NodeSegment as NODE_SEGMENT } from '@client/S2Utility3';

import {
  CameraLocationJson,
  CameraRootJson, CameraNodeJson, CellGroupJson, CellLeafGroupJson,
  isCellLeafGroupJson,
  LiveCameraThumb,
} from '@client/Types';

import { S2, S2CellId, S2CellKey, } from 's2-geometry';
import { D, INFO, ERROR, } from 'Logging';
import {
  readAsJson, writeJson,
} from 'CrawlerTools';

import { ActivatedLiveCameraThumb, ActivatedLocationJson, RawLocationJson, } from 'CrawlerTypes';

interface CoreSettings {
  LeafCount: number;
  VersionKey: string;
  getLevel: (key: S2CellKey) => number,
  NodeSegment: typeof NODE_SEGMENT,
  getAncestors: (leafId: S2CellId) => S2CellId[],
  getChildId: (currentNodeId: S2CellId, leafId: S2CellId) => S2CellId,
}

/**
 * Generate version 0.5.0, 0.5.1
 */
export class BasePublisher {
  constructor(
    private core: CoreSettings,
  ){
  }

  private addRootCount(s2cellId: S2CellId, rootDir: string, inc: number) {
    const node = this.core.NodeSegment.FromS2CellId(s2cellId);
    const segments = node.segments;
    const rootId = segments[0];
    const childSegment = segments[1];
    const file = path.join(rootDir, `${rootId}.json`);
    const json = readAsJson(file) as CameraRootJson;

    json.count += inc;
    if (inc > 0) {
      if (!json.children.includes(childSegment)) {
        json.children.push(childSegment);
        json.children = json.children.sort(this.compareChildren);
      }
    } else {
      const childJsonFile = path.join(rootDir, `${rootId}/${childSegment}.json`);
      if (!fs.existsSync(childJsonFile)) {
        const childIndex = json.children.indexOf(childSegment);

        if (childIndex < 0) {
          ERROR(`Unexpectedly not found child segment entry ${node.key} ${rootId}/${childSegment}`);
        } else {
          json.children.splice(childIndex, 1);
        }
      }
    }

    writeJson(file, json);
  }

  private ensureInTree(j: CameraLocationJson, rootDir: string): void {
    const ancestors = this.core.getAncestors(j.s2cellId);

    if (this.ensureInNode(j, ancestors, rootDir)) {
      this.addRootCount(j.s2cellId, rootDir, 1);
    }
  }


  removeFromTree(leafId: S2CellId, rootDir: string): void {
    const ancestors = this.core.getAncestors(leafId);
    const dir = path.join(rootDir, this.core.VersionKey);

    if (this.removeFromNode(leafId, ancestors, dir)) {
      this.addRootCount(leafId, dir, -1);
    }
  }

  private ensureRoots(rootDir: string): void {
    for (const rootId of [0, 1, 2, 3, 4, 5]) {
      const file = path.join(rootDir, `${rootId}.json`);

      if (fs.existsSync(file)) {
        continue;
      }

      const json: CameraRootJson = {
        type: 'root',
        children: [],
        count: 0,
        nodeSegments: [`${rootId}`],
      };

      writeJson(file, json);
    }
  }

  private removeFromNode(leafId: S2CellId, idTree: S2CellId[], root: string): boolean {
    if (idTree.length === 0) {
      throw new Error(`Unable reach bottom of recursion. id must be found on the tree.`);
    }

    const id = idTree[0];
    const node = this.core.NodeSegment.FromS2CellId(id);
    const segmentPath = node.buildPath();
    const segmentBasename = path.join(root, `${segmentPath}`);
    const jsonPath = `${segmentBasename}.json`;

    if (!fs.existsSync(jsonPath)) {
      ERROR(`Requested ${jsonPath} not exists. Ignoring.`);
      return false;
    }

    const json = readAsJson(jsonPath) as CameraNodeJson;

    if (json.type === 'leaf') {
      const leafNode = json as CellLeafGroupJson;
      if (leafNode.members.find(m => m.s2cellId === leafId)) {
        leafNode.members = leafNode.members.filter(m => m.s2cellId !== leafId);

        if (leafNode.members.length === 0) {
          fs.rmSync(jsonPath);
        }

        return true;
      }

      //TODO this must be found?
      ERROR(`Unexpectedly id:${leafId} is not found on the tree. But just ignoring.`);
      return false;
    } else if (json.type === 'group') {
      const groupNode = json as CellGroupJson;
      const childIds = idTree.slice(1);

      if (!this.removeFromNode(leafId, childIds, root)) {
        return false;
      }

      const childId = childIds[0];
      const childNode = this.core.NodeSegment.FromS2CellId(childId);
      const childSegments = childNode.segments;
      const childSegment = childSegments[childSegments.length - 1];
      const childIndex = groupNode.children.indexOf(childSegment);

      if (childIndex < 0 ) {
        throw new Error(`Must be found index ${childId} on ${childSegment}`);
      }

      groupNode.count--;
      const childDir = path.join(segmentBasename, childSegment);

      if (!fs.existsSync(childDir)) {
        groupNode.children.splice(childIndex, 1);
      }

      if (groupNode.count === 0) {
        // Never happen here
        ERROR(`Assert. Never group member is 0.`);
      } else if (groupNode.count < this.core.LeafCount) {
        const newLeafNode: CellLeafGroupJson = {
          type: 'leaf',
          s2cellId: groupNode.s2cellId,
          s2cellKey: groupNode.s2cellKey,
          s2cellLevel: groupNode.s2cellLevel,
          nodeSegments: groupNode.nodeSegments,
          members: [],
        };

        INFO(`Rebuilding child node on ${childNode.key}`);

        for (const childSegment of groupNode.children) {
          const file = path.join(segmentBasename, `${childSegment}.json`);
          const nodeJson = readAsJson(file) as CameraNodeJson;

          if (!isCellLeafGroupJson(nodeJson)) {
            throw new Error(`Unexpectedly not a leaf group on ${segmentPath} / ${childSegment}`);
          }

          const leafNode = nodeJson as CellLeafGroupJson;

          newLeafNode.members = newLeafNode.members.concat(leafNode.members);

          INFO(`Deleting child segment on ${segmentBasename}`);
          fs.rmdirSync(segmentBasename, { recursive: true });
        }

        // Overwrite existing group -> leaf
        writeJson(jsonPath, newLeafNode);
      } else {
        writeJson(jsonPath, groupNode);
      }
      return true;
    } else {
      throw new Error(`Not a supported node type:${json.type}`);
    }
  }

  createTree(fromDir: string, toDir: string): number {
    const toRoot = path.join(toDir, this.core.VersionKey);

    this.ensureRoots(toRoot);

    return this.createBranch(fromDir, toRoot);
  }

  private createBranch(fromDir: string, toRootDir: string): number {
    let count: number = 0;

    for (const fn of fs.readdirSync(fromDir)) {
      const file = path.join(fromDir, fn);
      const stat = fs.statSync(file);

      if (file.endsWith('.json')) {
        const sourceJson = readAsJson(file) as RawLocationJson;

        if (sourceJson.state !== 'activated') {
          continue;
        }

        const activeJson = sourceJson as ActivatedLocationJson;

        // Never activated the item. ignore to publish.
        if (!activeJson.lastActivatedAt) {
          continue;
        }

        const cameraJson: CameraLocationJson = {
          s2cellId: activeJson.s2cellId,
          lat: activeJson.lat,
          lng: activeJson.lng,
          isActive: activeJson.isActive,
          lastIndexedAt: activeJson.lastIndexedAt,
          lastActivatedAt: activeJson.lastActivatedAt,
          termsUrl: activeJson.termsUrl,
          sourceUrl: activeJson.sourceUrl,
          title: activeJson.title,
          link: activeJson.thumbLinks[0].sourceLink,
          thumbLinks: activeJson.thumbLinks.map(t => this.truncateRawCameraThumb(t)),
          isRejectCORS: activeJson.isRejectCORS,
          isFuzzyLocation: activeJson.isFuzzyLocation,
        };

        this.ensureInTree(cameraJson, toRootDir);

        count++;
      } else if (stat.isDirectory()) {
        count += this.createBranch(file, toRootDir);
      }
    }

    return count;
  }

  private truncateRawCameraThumb(thumb: ActivatedLiveCameraThumb): LiveCameraThumb {
    const l: LiveCameraThumb = {
      cacheTime: thumb.cacheAt,
      cacheAt: thumb.cacheAt,
      cacheLink: thumb.cacheLink,
      link: thumb.sourceLink,
      sourceLink: thumb.sourceLink,
      direction: thumb.direction,
    };

    if (!l.cacheTime) {
      delete l.cacheTime;
    }
    if (!l.cacheAt) {
      delete l.cacheAt;
    }
    if (!l.cacheLink) {
      delete l.cacheLink;
    }
    if (!l.direction) {
      delete l.direction;
    }

    return l;
  }

  expireTree(publishRootDir: string, limitTime: number): number {
    const dir = path.join(publishRootDir, this.core.VersionKey);

    return this.expireIndexDirectory(dir, dir, limitTime);
  }

  private expireIndexDirectory(publishRootDir: string, dir: string, limitTime: number): number {
    let count: number = 0;
    const shouldExpire: string[] = [];

    for (const fn of fs.readdirSync(dir)) {
      const file = path.join(dir, fn);
      const stat = fs.statSync(file);
      if (file.endsWith('.json')) {
        const json = readAsJson(file) as CameraNodeJson;

        if (json.type === 'leaf') {
          const leaf = json as CellLeafGroupJson;

          for (const l of leaf.members) {
            const lastIndexedTime = new Date(l.lastIndexedAt);

            if (limitTime < lastIndexedTime.getTime()) {
              continue;
            }

            INFO(`Purging leafId: ${l.s2cellId} from tree.`);
            shouldExpire.push(l.s2cellId);
          }
        }
      } else if (stat.isDirectory()) {
        count += this.expireIndexDirectory(publishRootDir, file, limitTime);
      }
    }

    for (const id of shouldExpire) {
      this.removeFromTree(id, publishRootDir);
      count++;
    }

    return count;
  }

  /**
   *
   * @return return true if newly added.
   */
  private ensureInNode(j: CameraLocationJson, idTree: S2CellId[], root: string): boolean {
    if (idTree.length === 0) {
      throw new Error(`Unable reach bottom of recursion. id must be found on the tree.`);
    }

    const id = idTree[0];
    const segment = this.core.NodeSegment.FromS2CellId(id);
    const segmentPath = segment.buildPath();
    const jsonPath = path.join(root, `${segmentPath}.json`);
    let isAdded = false;
    const json: CameraNodeJson = fs.existsSync(jsonPath) ?
      readAsJson(jsonPath) as CameraNodeJson :
      {
        type: 'leaf',
        nodeSegments: segment.segments,
        s2cellId: id,
        s2cellKey: segment.key,
        s2cellLevel: this.core.getLevel(segment.key),
        members: [],
      } as CameraNodeJson;

    if (json.type === 'leaf') {
      const leaf = json as CellLeafGroupJson;
      const index = leaf.members.findIndex(m => m.s2cellId === j.s2cellId);

      if (index >= 0) {
        D(`Replacing current leaf member ${j.s2cellId}`);
        leaf.members[index] = j;
      } else {
        // Add members the json if not exists.
        leaf.members.push(j);
        isAdded = true;
      }

      if (leaf.members.length < this.core.LeafCount) {
        writeJson(jsonPath, leaf);
        return isAdded;
      }

      INFO(`Rebuilding node to children on ${segment.key}`);

      const newChildren: Record<S2CellId, CellLeafGroupJson> = {};

      for (const m of leaf.members) {
        const childId = this.core.getChildId(leaf.s2cellId, m.s2cellId);
        let child: CellLeafGroupJson;
        if (childId in newChildren) {
          child = newChildren[childId];
        } else {
          const childNode = this.core.NodeSegment.FromS2CellId(childId);
          child = {
            type: 'leaf',
            s2cellId: childId,
            s2cellKey: childNode.key,
            s2cellLevel: this.core.getLevel(childNode.key),
            nodeSegments: childNode.segments,
            members: [],
          };
          newChildren[childId] = child;
        }

        child.members.push(m);
      }

      const latLng = S2.idToLatLng(leaf.s2cellId);

      const newGroup: CellGroupJson = {
        type: 'group',
        s2cellId: leaf.s2cellId,
        s2cellKey: leaf.s2cellKey,
        s2cellLevel: leaf.s2cellLevel,
        s2cellLat: latLng.lat,
        s2cellLng: latLng.lng,
        nodeSegments: segment.segments,
        children: [],
        count: leaf.members.length,
      };

      // First commit children.
      for (const childId in newChildren) {
        const child = newChildren[childId];
        const childSegs = child.nodeSegments;
        const childNode = this.core.NodeSegment.FromSegment(childSegs);
        const segmentPath = childNode.buildPath();
        const childPath = path.join(root, `${segmentPath}.json`);
        const lastSegment = childSegs[childSegs.length - 1];

        writeJson(childPath, child);

        if (!newGroup.children.includes(lastSegment)) {
          newGroup.children.push(lastSegment);
        }
      }

      newGroup.children = newGroup.children.sort(this.compareChildren);

      // Make parent after the children is succeeded
      writeJson(jsonPath, newGroup);

      return isAdded;
    } else if (json.type === 'group') {
      const group = json as CellGroupJson;

      if (!this.ensureInNode(j, idTree.slice(1), root)) {
        return false;
      }

      const childId = idTree[1];
      const childNode = this.core.NodeSegment.FromS2CellId(childId);
      const segments = childNode.segments;
      const lastSegment = segments[segments.length - 1];
      group.count++;
      if (!group.children.includes(lastSegment)) {
        group.children.push(lastSegment);
        group.children = group.children.sort(this.compareChildren);
      }

      writeJson(jsonPath, group);

      return true;
    } else {
      throw new Error(`Not a supported node type:${json.type}`);
    }
  }

  private compareChildren(x1: string, x2: string): number {
    if (x1 === x2) {
      return 0;
    }

    if (x1 < x2) {
      return -1;
    }

    return 1;
  }

  getVersion(): VersionJson {
    throw new Error(`Not implemented.`);
  }
}
