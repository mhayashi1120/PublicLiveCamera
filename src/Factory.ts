import { AbstractRunner } from 'AbstractRunner';

import * as fs from 'fs';
import * as path from 'path';

import {
  INFO, D, ERROR, VERB,
} from 'Logging';

interface LocalCodeEntry {
  code: string;
  aliases: string[];
  children?: LocalCodeEntry[];
}

import { MasterDirectory, CrawlerScriptDirectory, } from 'Settings';

type LocalPathDatabase = (LocalCodeEntry | LocalPathEntry)[]
type LocalCodeDatabase = LocalCodeEntry[]

import { readAsJson } from './IOTools';

interface LocalPathEntry {
  path: string;
}

function isPathEntry(e: any): e is LocalPathEntry {
  return 'path' in e;
}

function fuzzyMatchEntry(e: LocalCodeEntry, text: string): boolean {
  for (const a of e.aliases) {

    if (a.includes(text)) {
      return true;
    }
  }

  return false;
}

function exactMatchEntry(e: LocalCodeEntry, text: string): boolean {
  if (e.code === text) {
    return true;
  }

  for (const a of e.aliases) {
    if (a === text) {
      return true;
    }
  }

  return false;
}

function searchCode(db: LocalCodeDatabase, text: string): string {
  const e = searchCodeEntry(db, text);

  return e.code;
}

function searchCodeEntry(db: LocalCodeDatabase, text: string): LocalCodeEntry {

  const fuzzyEntries = [];

  for (const e of db) {
    if (exactMatchEntry(e, text)) {
      return e;
    }

    if (fuzzyMatchEntry(e, text)) {
      fuzzyEntries.push(e);
    }
  }

  if (fuzzyEntries.length === 1) {
    return fuzzyEntries[0];
  } else if (fuzzyEntries.length > 1) {
    ERROR(`Multiple entries on`, db);
    throw new Error(`Matches found but not exact an entry ${fuzzyEntries}`);
  } else {
    ERROR(`No entry on`, db);
    throw new Error(`Not found for ${text}`);
  }
}

function readJsonMaster(path: string): LocalPathDatabase {
  if (!fs.existsSync(path)) {
    return [];
  }

  return readAsJson(path) as LocalPathDatabase;
}

function readMasterTable(localPath: string, derived?: LocalCodeEntry[]): LocalCodeDatabase {
  const jsonPath = path.join(MasterDirectory, 'Crawler', localPath);

  D(`Loading database from ${jsonPath} with ${derived}`);

  let db :LocalPathDatabase = readJsonMaster(jsonPath);

  if (derived) {
    db.push(
      {
        path: derived.map(c => c.code).join('/'),
      },
    );
  }

  const table = [] as LocalCodeDatabase;

  for (const e of db) {
    if (isPathEntry(e)) {
      const p = e as LocalPathEntry;
      const codes = p.path.split('/');
      const codeEntry: LocalCodeEntry = {
        code: codes[0],
        aliases: [],
      };

      if (1 < codes.length) {
        const children = codes.slice(1).map(c => {
          return {
            code: c,
            aliases: [],
          };
        });

        codeEntry.children = children;
      }

      table.push(codeEntry);
    } else {
      table.push(e);
    }
  }

  VERB(`Table is loaded.`, table);

  return table;
}

function findCountryCode(text: string) {
  const db = readMasterTable('index.json');

  return searchCode(db, text);
}

function splitLocalCodes(args: string[]): string[] {
  let res: string[] = [];

  for (const a of args) {
    const l = a.split('/');

    res = res.concat(l);
  }

  return res;
}

function getCrawlRunner(path: string): AbstractRunner {
  try {
    const { Runner } = require(path);

    const runner = new Runner() as AbstractRunner;

    return runner;
  } catch (err) {
    console.error(`Failed to load ${path}`);
    throw err;
  }
}

export function argsToRunner(args: string[]) {
  if (args.length < 1) {
    throw new Error(`Not a valid args ${args}`);
  }

  const countryCode = findCountryCode(args[0]);

  let codes: string[] = [countryCode];
  let parent;

  for (const local of splitLocalCodes(args.slice(1))) {
    const localPath = codes.join('/');
    const db = readMasterTable(`${localPath}/index.json`, parent);
    const localEntry = searchCodeEntry(db, local);

    codes.push(localEntry.code);
    parent = localEntry.children;
  }

  const localPath = codes.join('/');
  // Relative path from the script
  const entryScript = path.join(CrawlerScriptDirectory, `${localPath}/runner.ts`);

  INFO(`Resolved path ${args} -> ${entryScript}`);

  const runner = getCrawlRunner(entryScript);

  return runner;
}
