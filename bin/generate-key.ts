#!/usr/bin/env -S ts-node -r tsconfig-paths/register

import { Command } from 'commander';
// import { D, INFO, ERROR, } from 'Logging';

function usage() {
  console.log(`usage: generate-key LENGTH`);
}

function usageExit(code?: number): never {
  usage();
  process.exit(code || 1);
}

function doGenerate(args: string[]) {
  if (args.length < 1) {
    usageExit();
  }

  const lengthArg = args[0];
  if (!/^([0-9]{1,5})$/.test(lengthArg)) {
    usageExit();
  }

  const length = parseInt(lengthArg);
  const res = [];

  for (let i = 0; i < length; i++) {
    const byte = Math.trunc(Math.random() * 256);

    res.push(byte.toString(16).padStart(2, '0'));
  }

  console.log(res.join(''));

}

// This script intended to call from shell. Probablly never less than 2 ;-)
if (process.argv.length < 2) {
  usageExit();
}

const program = new Command();

program.parse(process.argv.slice(2), {from: 'user'});

doGenerate(program.args);
