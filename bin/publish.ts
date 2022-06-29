#!/usr/bin/env -S ts-node -r tsconfig-paths/register

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { OpenLogging, INFO, } from 'Logging';

import { argToPositiveNumber, } from 'CommanderTools';
import {
  PubVersionFile, getIndexRootDirectory, CrawlDataDirectory,
  getDailyThumbResource, PubDirectory,
 } from 'Settings';

import { writeJson, } from 'CrawlerTools';
import { Publisher } from 'Publisher';
import { Activator } from 'Activator';
import { incDays } from 'DateTools';
import { SystemVersionJson } from '@client/Types';

function usage() {
  console.log(`usage: publish build`);
  console.log(`       publish generate-version`);
  console.log(`       publish remove-entry S2CellId`);
  console.log(`       publish prepare-daily-directory [ { -d | --days } DAYS ]`);
  console.log(`       publish expire-daily-directory [ { -p | --past-days } DAYS ] [ { -l | --limit-days } DAYS ]`);
  console.log(`       publish expire [ { -d | --days } DAYS ]`);
  console.log(``);
  console.log(` This command controls published S2 managed tree.`);
  console.log(` Mainly maintenance purpose interface of 'public' directory.`);
}

function usageExit(code?: number): never {
  usage();
  process.exit(code || 1);
}

function doRemoveEntry(args: string[]) {
  INFO('Removing items by author request', args);

  if (args.length < 1) {
    usageExit();
  }

  const publisher = new Publisher();

  for (const argId of args) {
    if (!/^[0-9]+$/.test(argId)) {
      usageExit();
    }

    const S2CellId = argId;
    const outputVersionPath = getIndexRootDirectory();

    publisher.removeFromTree(S2CellId, outputVersionPath);
  }
}

function doBuildTree(args: string[]) {
  INFO('Building tree with args', args);

  const outputVersionPath = getIndexRootDirectory();

  const publisher = new Publisher();
  const count = publisher.createTree(CrawlDataDirectory, outputVersionPath);

  INFO(`Proceeded tree in ${count}`);
}

function doGenerateVersion(_: string[]) {
  const publisher = new Publisher();
  const activator = new Activator();

  const supportedIndex = publisher.getSupportedVersions();

  const json: SystemVersionJson = {
    recent: supportedIndex[0],
    supported: supportedIndex,
    supportedIndex,
    supportedThumbs: activator.getVersions(),
  }

  writeJson(PubVersionFile, json);
}

function doPrepareDailyDirectory(args: string[]) {
  const program = new Command();

  program.option<number>('-d, --days <days>',
                         'Following days to prepare directories. Default is 5',
                         argToPositiveNumber, 5);

  program.parse(args, {from: 'user'});

  const futureDays = program.opts().days as number;
  const activator = new Activator();

  // TODO should move to Activator.
  for (const v of activator.getVersions()) {
    for (let i = 0; i <= futureDays; i++) {
      const date = incDays(i);

      const resource = getDailyThumbResource(v.targetPath, date);
      const dir = path.join(PubDirectory, resource);

      if (!fs.existsSync(dir)) {
        INFO(`Creating directory ${resource}`);
        fs.mkdirSync(dir, {recursive: true});
      }

      const placeholderFile = path.join(dir, '.placeholder');

      fs.writeFileSync(placeholderFile, '');
    }
  }
}

function doExpireDailyDirectory(args: string[]) {
  const program = new Command();

  program.option<number>('-p, --past-days <days>',
                         'Following days to expire directories. Default is 2.',
                         argToPositiveNumber, 2);
  program.option<number>('-l, --limit-days <days>',
                         'Limit of following days to expire directories. Default is 10.',
                         argToPositiveNumber, 10);

  program.parse(args, {from: 'user'});

  const pastDays = program.opts().pastDays as number;
  const limitDays = program.opts().limitDays as number;
  const activator = new Activator();

  // TODO should move to Activator.
  for (const v of activator.getVersions()) {
    for (let i = pastDays; i <= limitDays; i++) {
      const date = incDays(-i);
      const resource = getDailyThumbResource(v.targetPath, date);
      const dir = path.join(PubDirectory, resource);

      if (!fs.existsSync(dir)) {
        INFO(`Missing ${date} directory.`);
        continue;
      }

      INFO(`Deleting directory ${resource}`);
      fs.rmSync(dir, {recursive: true});
    }
  }
}

function doExpire(args: string[]) {
  const program = new Command();

  program.option<number>('-p, --past-days <days>',
                         'Expires days (default: 20)',
                         argToPositiveNumber, 20);

  program.parse(args, {from: 'user'});

  const pastDays = program.opts().pastDays as number;
  const minTime = incDays(-pastDays).getTime();

  const publisher = new Publisher();
  const publishedPath = getIndexRootDirectory();

  publisher.expireTree(publishedPath, minTime)
}

function doPublish(args: string[]) {

  const program = new Command();

  program.passThroughOptions(true);
  program.option('-d, --debug',
                 'Debug output on or not.', false);
  program.option('-V, --verbose',
                 'Verbose Debug output on or not.', false);

  program.parse(args, {from: 'user'});

  OpenLogging({
    level: program.opts().verbose ? 'verbose' :
      (program.opts().debug ?
        'debug' :
        'info'
      )
  });

  const restArgs = program.args;

  if (restArgs.length < 1) {
    usageExit();
  }

  const subCommand = restArgs[0];
  const subArgs = restArgs.slice(1);

  switch (subCommand) {
    case 'build':
      doBuildTree(subArgs);
      break;
    case 'remove-entry':
      doRemoveEntry(subArgs);
      break;
    case 'generate-version':
      doGenerateVersion(subArgs);
      break;
    case 'prepare-daily-directory':
      doPrepareDailyDirectory(subArgs);
      break;
    case 'expire-daily-directory':
      doExpireDailyDirectory(subArgs);
      break;
    case 'expire':
      doExpire(subArgs);
      break;
    default:
      usageExit();
  }
}

// This script intended to call from shell. Probablly never less than 2 ;-)
if (process.argv.length < 2) {
  usageExit();
}

doPublish(process.argv.slice(2));
