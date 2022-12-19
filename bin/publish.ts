#!/usr/bin/env -S ts-node -r tsconfig-paths/register

import { Command } from 'commander';
import { OpenLogging, INFO, } from 'Logging';

import { argToPositiveNumber, } from 'CommanderTools';
import {
  PubVersionFile, getIndexRootDirectory, CrawlDataDirectory,
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
  console.log(`       publish expire [ { -d | --days } DAYS ]`);
  console.log(``);
  console.log(` This command controls published S2 managed tree.`);
  console.log(` Mainly maintenance purpose interface of 'public' directory.`);
}

function usageExit(code?: number): never {
  usage();
  process.exit(code === 0 ? 0 : (code || 1));
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
