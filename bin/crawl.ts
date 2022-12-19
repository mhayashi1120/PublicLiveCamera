#!/usr/bin/env -S ts-node -r tsconfig-paths/register

import { Command } from 'commander';
import { argsToRunner } from 'Factory';
import {
  OpenLogging,
  INFO,
} from 'Logging';

import { Washer } from 'Washer';
import { Activator } from 'Activator';

import { argToPositiveNumber } from 'CommanderTools';

function usage() {
  console.log(`usage: crawl index [ { -l | --limit-days } DAYS ] COUNTRY [ LOCALS ... ]`);
  console.log(`       crawl validate COUNTRY [ LOCALS ... ]`);
  console.log(`       crawl activate [ { -I | --maximum-interval } SECONDS ] COUNTRY [ LOCALS ... ]`);
  console.log(`       crawl print-id COUNTRY [ LOCALS ... ]`);
  console.log(``);
  console.log(`subcommand alias: index -> run`);
  console.log(``);
  console.log(` This command provides executor of each Crawler instance.`);
}

function usageExit(code?: number): never {
  usage();
  process.exit(code === 0 ? 0 : (code || 1));
}

function doIndex(args: string[]) {
  const program = new Command();

  program.passThroughOptions(true);
  program.option('-l, --limit-days',
                 'Limit of activated days',
                 argToPositiveNumber, 10);

  program.parse(args, {from: 'user'});

  const limitDays = program.opts().limitDays as number;

  const restArgs = program.args;
  const runner = argsToRunner(restArgs);
  const crawlerName = runner.getFriendlyName();

  INFO(`Prepare to crawller on ${crawlerName}`);

  runner.createIndex(limitDays);

}

function doActivate(args: string[]): void {
  const program = new Command();

  program.passThroughOptions(true);
  program.option('-I, --maximum-interval <seconds>',
                 'Interval seconds each activate thumbnail',
                 argToPositiveNumber, 0);
  program.option('--verbose-download',
                 'Output verbose download while downloading image');

  program.parse(args, {from: 'user'});

  const maximumInterval = program.opts()['maximumInterval'] as number;
  const verbDownload = !!program.opts()['verboseDownload'];

  const restArgs = program.args;

  const runner = argsToRunner(restArgs);
  const crawlerName = runner.getFriendlyName();

  INFO(`Prepare to activate runner ${crawlerName}`);

  const path = runner.computeRecipeRoot();
  const activatorOpts = {
    maximumInterval,
    downloadVerbose: verbDownload,
  };
  const activator = new Activator(activatorOpts);

  activator.activateLocals(path);
}

function doValidate(args: string[]) {
  const runner = argsToRunner(args);
  const crawlerName = runner.getFriendlyName();

  INFO(`Prepare to validate runner ${crawlerName}`);

  const washer = new Washer();
  const path = runner.computeRecipeRoot();

  washer.checkLocalDuplicates(path);
}

function doPrintId(args: string[]): void {
  const program = new Command();

  program.parse(args, {from: 'user'});

  const runner = argsToRunner(args);
  const runnerId = runner.getRunnerId();

  console.log(`id: ${runnerId}`);
}

function doCrawl(args: string[]): void {

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
    case 'run':
    case 'index':
      doIndex(subArgs);
      break;
    case 'activate':
      doActivate(subArgs);
      break;
    case 'validate':
      doValidate(subArgs);
      break;
    case 'print-id':
      doPrintId(subArgs);
      break;
    default:
      usage();
  }
}

// This script intended to call from shell. Probablly never less than 2 ;-)
if (process.argv.length < 2) {
  usageExit();
}

doCrawl(process.argv.slice(2));
