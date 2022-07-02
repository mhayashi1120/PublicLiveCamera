import {
  CacheDirectoryName,
  PubDirectoryName,
} from 'Settings';

export interface BaseTaskJson {
  id: string;
  taskType: 'root' | 'sub';
  friendlyName?: string;
  command: string;
  args: string[];
  createdAt: string;
  reservedAt: string;
  affectedOn?: WorkingType[];
  affectedOnCache?: string;
  interval: number;
  // TODO no need?
  lastExecutedAt?: string;
}

export interface RootTaskJson extends BaseTaskJson {
  taskType: 'root';
}

export interface SubTaskJson extends BaseTaskJson {
  taskType: 'sub';
  delay: number;
  rootId: string;
  isRepeat: boolean;
}

export type WorkingType = 'cache' | 'public';

export function isWorkingType(x: any): x is WorkingType {
  if (typeof x !== 'string') {
    return false;
  }

  // TODO how to get from WorkingType type
  return ['cache', 'public'].includes(x);
}

export const WorkingDatabase: Record<WorkingType, string> = {
  'cache': CacheDirectoryName,
  'public': PubDirectoryName,
};
