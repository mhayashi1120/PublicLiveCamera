#!/usr/bin/env -S ts-node -r tsconfig-paths/register

import { S2 } from 's2-geometry';
import { Command, CommanderError } from 'commander';

import { doTest, } from 'CommanderTools';

function usage() {
  console.log(`usage: debug id2key key [ ... ]`);
  console.log(`       debug key2id id [ ... ]`);
  console.log(`       debug key2geo key [ ... ]`);
  console.log(`       debug id2geo id [ ... ]`);
  console.log(`       debug geo2id [ { -l | --level } <S2CellLevel> ] geo [ ... ]`);
  console.log(``);
  console.log(` This command provides api of S2 interface`);
}

function usageExit(code?: number): never {
  usage();
  process.exit(code === 0 ? 0 : (code || 1));
}


function doKeyToId(args: string[]) {
  if (args.length < 1) {
    usageExit();
  }

  for (const key of args) {
    console.log(S2.keyToId(key));
  }
}

function doIdToKey(args: string[]) {
  if (args.length < 1) {
    usageExit();
  }

  for (const id of args) {
    console.log(S2.idToKey(id));
  }
}

function doKeyToGeo(args: string[]) {
  if (args.length < 1) {
    usageExit();
  }

  for (const key of args) {
    const geo = S2.keyToLatLng(key);

    console.log(formatLatLng(geo));
  }
}

function doIdToGeo(args: string[]) {
  if (args.length < 1) {
    usageExit();
  }

  for (const id of args) {
    const key = S2.idToKey(id);
    const geo = S2.keyToLatLng(key);

    console.log(formatLatLng(geo));
  }
}

function doGeoToId(opts: any, remainArgs: string[]) {
  if (remainArgs.length < 1) {
    usageExit();
  }

  const s2CellLevel = opts.level || 30;

  for (const geoText of remainArgs) {
    const latLng = parseGeoText(geoText);
    const key = S2.latLngToKey(latLng.lat, latLng.lng, s2CellLevel);
    const id = S2.keyToId(key);

    console.log(id);
  }
}

function parseGeoText(s: string): S2.L.LatLng {
  const [latText, lngText] = s.split(',');

  const lat = parseFloatText(latText);
  const lng = parseFloatText(lngText);

  return {lat, lng};
}

function parseFloatText(s: string): number {
  const m = /^([-+]?[0-9]+(\.[0-9]+)?)$/.exec(s.trim());

  if (!m) {
    throw new Error(`Not a valid float text ${s}`);
  }

  return parseFloat(m[1]);
}

function formatLatLng(latLng: S2.L.LatLng): string {
  return `${latLng.lat.toFixed(6)},${latLng.lng.toFixed(6)}`;
}

function doDebug() {

  const program = new Command();

  program.passThroughOptions(true);

  program.command('help')
  // TODO not yet supported
  // .argument('[subcommand]')
    .action((_opts, _helpCommand) => {
      program.outputHelp();
    });


  program.command('id2key')
    .argument('id...')
    .action((ids, _opts, _) => {
      doIdToKey(ids);
    });

  program.command('key2id')
    .argument('key...')
    .action((keys, _opts, _) => {
      doKeyToId(keys);
    });

  program.command('key2geo')
    .argument('key...')
    .action((keys, _opts, _) => {
      doKeyToGeo(keys);
    });

  program.command('id2geo')
    .argument('id...')
    .action((ids, _opts, _) => {
      doIdToGeo(ids);
    });

  program.command('geo2id')
    .argument('geo...')
    .option('-l, --level <S2CellLevel>', 'S2 Cell Level (default 30)')
    .action((geos, opts, _) => {
      doGeoToId(opts, geos);
    });

  program.command('test')
    .action((opts, _) => {
      doTest(opts);
    });

  // TODO now testing the subcommand via commander.
  // program.command('help2')
  //   .option('-A', "print all help2")
  //   .argument('<subcommand>')
  //   .action((_, _o, command) => command.outputHelp());

  program.exitOverride((_err: CommanderError) => {
    // TODO workaround fix. maybe no need exit here
    usageExit();
  });

  program.parse();
}

doDebug();
