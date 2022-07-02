#!/usr/bin/env -S ts-node -r tsconfig-paths/register

import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';
import { Command } from 'commander';

import { argToSeconds, argToString, } from 'CommanderTools';
import { spawn, } from 'child_process';
import { argsToRunner } from 'Factory';
import { artificialIdentity, readAsJson, writeJson, writeText, } from 'CrawlerTools';
import {
  RootTaskJson,
  BaseTaskJson,
  SubTaskJson,
  isWorkingType, WorkingType, WorkingDatabase,
} from 'SchedulerTypes';

import workflowTemplate from 'Template/workflow';

import { OpenLogging, D, ERROR, INFO, VERB, WARN, } from 'Logging';
import { incSeconds, } from 'DateTools';

import {
  ScheduleQueueDirectoryName,
  ScheduleQueueDirectory,
  GithubWorkflowDirectory,
} from 'Settings';

import { Core } from 'Core';

interface TaskItem {
  json: BaseTaskJson;
  taskFile: string;
}

let forceMhnetAction: boolean = false;

function usage() {
  console.log(`usage: scheduler run [ { -t | --timeout } SECONDS ] [ -F | --force-mhnet-action ] ROOT_ID [ ... ]`);
  console.log(`       scheduler add [ { -i | --interval } SECOND ] [ { -d | --delay } SECONDS ] \\`);
  console.log(`            [ { -a | --affected-on } TARGETS ]`);
  console.log(`            command [ args... ]`);
  console.log(`       scheduler add-subtask [ { -i | --interval } SECONDS ] [ { -d | --delay } SECONDS ] \\`);
  console.log(`            [ --no-repeat ] [ { -R | --root-id } ROOT_ID ] \\`);
  console.log(`            [ { -a | --affected-on } TARGETS ]`);
  console.log(`            command [ args... ]`);
  console.log(`       scheduler refresh-workflow [ -A | --all ] [ ROOT_ID ... ]`);
  console.log(`       scheduler remove [ -A | --all-subordinate ] TASK_ID [ ... ]`);
  console.log(`       scheduler add-crawler COUNTRY [ LOCALS ... ]`);
  console.log(``);
  console.log(` This command controls lazy schedule of tasks work on the Github Action.`);
  console.log(` 'add-crawler' subcommand is an utility to wrap all in one task register.`);

}

function usageExit(code?: number): never {
  usage();
  process.exit(code || 1);
}

function argToRootId(v: string, p: string): string {
  const value = argToString(v, p);

  if (!value || value === 'root') {
    throw new Error(`Not a valid id ${value}`);
  }

  return value;
}

function readAllTasks(rootId: string): TaskItem[] {
  const res: TaskItem[] = [];
  const topdir = path.join(ScheduleQueueDirectory, rootId);

  if (!fs.existsSync(topdir)) {
    return res;
  }

  for (const fn of fs.readdirSync(topdir)) {

    if (!fn.match(/\.json$/)) {
      continue;
    }

    const file = path.join(topdir, fn)
    const json = readAsJson(file) as BaseTaskJson;

    const item: TaskItem = {
      json,
      taskFile: file,
    };

    res.push(item);
  }

  return res;
}

function readTasks(rootId: string): TaskItem[] {
  const now = new Date().getTime();
  const res: TaskItem[] = [];
  const allTasks = readAllTasks(rootId);

  for (const task of allTasks) {

    const reservedTime = new Date(task.json.reservedAt);

    if (now < reservedTime.getTime()) {
      continue;
    }

    if (task.json.taskType === 'root') {
      return [task];
    }

    res.push(task);
  }

  return res;
}

function readRootTask(rootId: string): TaskItem {
  const taskDir = path.join(ScheduleQueueDirectory, rootId);

  if (!fs.existsSync(taskDir)) {
    throw new Error(`Not found ${rootId} on the queue.`);
  }

  const taskFile = path.join(taskDir, 'root.json');

  if (!fs.existsSync(taskFile)) {
    throw new Error(`Not found ${rootId} on the queue.`);
  }

  const json = readAsJson(taskFile);

  const task = {
    taskFile,
    json,
  };

  return task;
}

function getNow(): number {
  return new Date().getTime();
}

function generateRandomId(): string {
  // Whatever the source is random ;-)
  return artificialIdentity([Math.random().toString()], 20);
}

import { Readable } from 'stream';

function prepareFilter(reader: Readable, prefix: string, printer: (prefix: string, chunk: string) => void): void {
  let rStdout = ''

  reader.on('data', chunk => {
    rStdout += chunk;
    const lines = rStdout.split('\n');

    while (lines.length > 1) {
      const line = lines.shift()!;

      printer(prefix, line);
    }

    rStdout = lines.shift()!;
  });

  reader.on('end', () => {
    if (rStdout === '') {
      return;
    }

    printer(prefix, rStdout);
  });
}


async function asyncSpawn(command: string, args: string[]): Promise<number> {
  const r = spawn(command, args, { shell: false, stdio: "pipe"});

  prepareFilter(r.stdout, '|', console.log);
  prepareFilter(r.stderr, '!', console.error);

  // TODO should call reject any error (e.g. call script not found)
  return new Promise((resolve, reject) => {
    r.on('close', code => {
      if (code === null) {
        reject(code);
      } else {
        resolve(code);
      }
    });
  });
}

async function execCommand(command: string, args: string[]): Promise<void> {
  VERB('executing', command, args);

  // TODO should use `spawn` and filter it
  const result = await asyncSpawn(command, args);

  if (result !== 0) {
    ERROR(`Failed exit command ${command} ${args}`, result);
    throw new Error(`Failed exit command ${command} ${args}`);
  }
}

function shouldMhnetAction(): boolean {
  return isGithubAction() || forceMhnetAction;
}

function isGithubAction(): boolean {
  return ('GITHUB_WORKFLOW' in process.env);
}

async function executeTask(task: BaseTaskJson) {
  const startTime = getNow();

  INFO(`Task "${task.command}" starting with ${task.args} .`);

  await execCommand(task.command, task.args);

  const endTime = getNow();
  const seconds = (endTime- startTime) / 1000;

  INFO(`Task ${task.id} spent ${seconds} seconds`)
}

async function maybeReserveNextTask(now: number, task: TaskItem) {
  const json = task.json;

  if (json.taskType === 'sub') {
    const subJson = json as SubTaskJson;
    if (!subJson.isRepeat) {
      fs.rmSync(task.taskFile);
      return;
    }
  }

  const nextReserveTime = incSeconds(json.interval, new Date(now));

  json.reservedAt = nextReserveTime.toISOString();

  writeJson(task.taskFile, task.json);
}

async function execRun(args: string[]) {
  const program = new Command();

  program.passThroughOptions(true);
  // 10 min
  program.option('-t, --timeout <seconds>',
                 'Terminate scheduler after the seconds',
                 argToSeconds , (10 * 60));
  program.option('-F, --force-mhnet-action',
                 'Force git commit and pull on the working copy like working on Github Action',
                 false);

  const timeoutSec = program.opts().timeout as number;

  program.parse(args, {from: 'user'});

  forceMhnetAction = program.opts().forceMhnetAction as boolean;

  const restArgs = program.args;

  if (restArgs.length === 0) {
    usageExit();
  }

  const startTime = new Date();
  const timeoutTime = incSeconds(timeoutSec, startTime);
  let successCount: number = 0;
  let failedCount: number = 0;

  for (const rootId of restArgs) {
    const [s, f] = await runTask(rootId, timeoutTime);

    successCount += s;
    failedCount += f;
  }

  const endTime = new Date();
  const spentSec = (endTime.getTime() - startTime.getTime()) / 1000;

  INFO(`All task spent ${spentSec} Success: ${successCount} Failed: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  }
}


async function createArchive(dirs: string[]): Promise<string> {
  const archiveFile = tmp.fileSync();
  const rootDir = process.env['GITHUB_WORKSPACE']!;

  await execCommand('tar', ['cJf', archiveFile.name, '-C', rootDir, ScheduleQueueDirectoryName, ...dirs])

  return archiveFile.name;
}

async function expandArchive(archive: string): Promise<void> {
  const rootDir = process.env['GITHUB_WORKSPACE']!;

  await execCommand('tar', ['xf', archive, '-C', rootDir]);
}

async function runFtpCommand(commands: string): Promise<void> {
  const host = process.env['PUBLISH_SERVER_HOST']!;
  const port = process.env['PUBLISH_SERVER_PORT']!;
  const user = process.env['PUBLISH_SERVER_USER']!;
  const sshConfigFile = process.env['SSH_CONFIG_FILE']!;
  const sshKeyFile = process.env['SSH_KEY_FILE']!;
  const batchFile = tmp.fileSync();

  writeText(batchFile.name, commands);

  await execCommand('sftp', ['-b', batchFile.name, '-P', port, '-F', sshConfigFile, '-i', sshKeyFile, `${user}@${host}`]);
}

async function pullCache(rootId: string): Promise<void> {
  if (!shouldMhnetAction()) {
    return;
  }

  const localFile = tmp.fileSync();
  const ftpBatch = `
get /persistent/PublishLiveCamera/${rootId}.tar.xz ${localFile.name}
` ;

  await runFtpCommand(ftpBatch);

  await expandArchive(localFile.name);
}

async function pushCache(rootId: string, dirs: string[]): Promise<void> {
  if (!shouldMhnetAction()) {
    return;
  }

  const archiveFile = await createArchive(dirs);
  const ftpBatch = `
put ${archiveFile} /upload/PublishLiveCamera/${rootId}.tar.xz
`;

  await runFtpCommand(ftpBatch);
}

async function runTask(rootId: string, timeoutTime: Date): Promise<[number, number]> {

  await pullCache(rootId);

  let tasks: TaskItem[] = [];
  let now: number;
  let taskDone = 0;
  let taskSucceeded = 0;
  let taskFailed = 0;

  while (true) {

    now = getNow();

    if (tasks.length === 0) {
      tasks = readTasks(rootId);

      if (tasks.length === 0) {
        break;
      }
    }

    if (timeoutTime.getTime() < now) {
      WARN(`Task runner is timed out now`, now);
      throw new Error(`Time is out ${timeoutTime}`);
    }

    const task = tasks[0];

    try {
      await executeTask(task.json);
      taskSucceeded++;
    } catch (err) {
      ERROR(`Error while executing id:${task.json.id}`, err);
      taskFailed++;
    }

    taskDone++;

    tasks = tasks.slice(1);
    now = getNow();

    await maybeReserveNextTask(now, task);

    if (task.json.affectedOn) {
      // 1. pull(merge)
      // 2. commit
      // 3. push
      //   -> 4. rejected
      //      -> pararell process existing. abort the schedule. all changes is aborted.

      const dirs = task.json.affectedOn.map(a => WorkingDatabase[a]);

      await pushCache(task.json.id, dirs);
    }


    now = getNow();
  }

  INFO(`${taskDone} task is done. Success: ${taskSucceeded} Failed: ${taskFailed}`);

  return [taskSucceeded, taskFailed]
}

function writeSubTask(subTask: SubTaskJson) {
  const subTaskFn = `${subTask.id}.json`;
  const subTaskFile = path.join(ScheduleQueueDirectory, subTask.rootId, subTaskFn);

  D(`New sub task file is ${subTaskFn}`);

  writeJson(subTaskFile, subTask);
}

function writeRootTask(json: BaseTaskJson) {
  const rootId = json.id;
  const fn = `root.json`;
  const file = path.join(ScheduleQueueDirectory, rootId, fn);

  writeJson(file, json);
}

function reserveRootTask(time: Date, interval: number, command: string, args: string[], affectedOn: WorkingType[], friendlyName?: string, cacheId?: string): string {
  const id = generateRandomId();
  const json: RootTaskJson = {
    id,
    friendlyName,
    interval,
    taskType: 'root',
    command,
    args,
    affectedOn: affectedOn,
    affectedOnCache: cacheId,
    createdAt: new Date().toISOString(),
    reservedAt: time.toISOString(),
  };

  writeRootTask(json);

  return id;
}

function doAddSubTask(args: string[]) {
  const program = new Command();

  program.passThroughOptions(true);
  program.option('-d, --delay <seconds>',
                 'Delay seconds to execute',
                 argToSeconds, 0);
  program.option('-i, --interval <seconds>',
                 'Interval seconds to execute',
                 argToSeconds, (1 * 60 * 60)); // default 1 hour
  program.option('--no-repeat',
                 'Not repeat the sub task.', true);
  program.requiredOption('-R, --root-id <root-id>',
                         'Root task id the request task is subordinated.',
                         argToRootId);
  program.option('-a, --affected-on <TARGETS>',
                 'Affected types separated by comma.',
                 argToWorkingTypes, []);

  program.parse(args, {from: 'user'});

  const rootId = program.opts().rootId as string;

  if (!rootId) {
    throw new Error(`Root Id must be supplied`);
  }

  const restArgs = program.args;
  const interval = program.opts().interval as number;
  const delay = program.opts().delay as number;
  const command = restArgs[0];
  const commandArgs = restArgs.slice(1);

  registerSubTask(rootId, delay, interval, command, commandArgs, !program.opts().noRepeat, program.opts().affectedOn as WorkingType[]);

  refreshGithubActionWorkflow(rootId);
}

function registerSubTask(rootId: string, delay: number, interval: number, command: string, commandArgs: string[], isRepeat: boolean, affectedOn: WorkingType[]) {
  // read just check rootId existing.
  readRootTask(rootId);

  const subTask: SubTaskJson = {
    id: generateRandomId(),
    taskType: 'sub',
    rootId,
    delay,
    interval,
    command,
    args: commandArgs,
    createdAt: new Date().toISOString(),
    reservedAt: incSeconds(delay).toISOString(),
    isRepeat,
    affectedOn,
  };

  writeSubTask(subTask);
}

function doAddCrawler(args: string[]) {
  const program = new Command();

  program.passThroughOptions(true);

  program.parse(args, {from: 'user'});

  const restArgs = program.args;
  const runner = argsToRunner(restArgs);

  const activateInterval = runner.getActivateInterval();
  const activatingInterval = runner.getActivatingInterval();
  const indexingInterval = runner.getIndexInterval();
  const name = runner.getFriendlyName();

  INFO(`Adding ${name} crawler`);

  const crawlArgs = ['index', ...restArgs];

  const randomDelay = (Math.random() * 60) + 60;
  const reservedTime = incSeconds(randomDelay);
  const cacheId = runner.getRunnerId();
  const id = reserveRootTask(reservedTime, indexingInterval, './bin/crawl.ts', crawlArgs, ['cache'], name, cacheId);

  const validateArgs = ['validate', ...restArgs];

  registerSubTask(id, 1, activateInterval, './bin/crawl.ts', validateArgs, true, ['cache']);

  const activateOptionalArgs: string[] = [
    ...(activatingInterval > 0 ? [ '-I', `${activatingInterval}`] : []),
  ];
  const activateArgs = ['activate', ...activateOptionalArgs, ...restArgs];

  registerSubTask(id, 2, activateInterval, './bin/crawl.ts', activateArgs, true, ['cache', 'public']);

  refreshGithubActionWorkflow(id);
}

function argToWorkingTypes(v: string, _: WorkingType[]): WorkingType[] {
  const res: WorkingType[] = [];

  for (const s of v.split(',')) {
    if(!isWorkingType(s)) {
      throw new Error(`Not a valid WorkingType ${s}`);
    }
    res.push(s);
  }

  return res;
}

function doAddTask(args: string[]) {
  const program = new Command();

  program.passThroughOptions(true);
  program.option('-d, --delay <seconds>',
                 'Delay seconds to execute',
                 argToSeconds, 0);
  program.option('-i, --interval <seconds>',
                 'Interval seconds to execute',
                 argToSeconds, (1 * 60 * 60)); // default 1 hour
  program.option('-a, --affected-on <TARGETS>',
                 'Affected types separated by comma.',
                 argToWorkingTypes, []);
  program.option('-n, --name <NAME>',
                 'Task name to display friendly.',
                 argToString, null);

  program.parse(args, {from: 'user'});

  const interval = program.opts().interval as number;

  if (interval < Core.CAUTION_INTERVAL_SECONDS) {
    throw new Error(`Failed to set interval:${interval} too many execution.`);
  }

  const delay = program.opts().delay as number;
  const reservedTime = incSeconds(delay);
  const restArgs = program.args;
  const friendlyName = program.opts().name;

  const id = reserveRootTask(reservedTime, interval, restArgs[0], restArgs.slice(1), program.opts().affectedOn as WorkingType[], friendlyName);

  refreshGithubActionWorkflow(id)

  INFO(`Created task as id:${id}`);
}

function refreshGithubActionWorkflow(id: string) {
  const tasks = readAllTasks(id);
  const workflowFile = path.join(GithubWorkflowDirectory, `${id}.yml`);

  if (tasks.length === 0) {
    if (fs.existsSync(workflowFile)) {
      fs.rmSync(workflowFile);
    }
    return;
  }

  let runIntervalMin = Number.MAX_VALUE;
  let workflowName: string | undefined = undefined;

  for (const t of tasks) {
    runIntervalMin = Math.max(Math.min(Math.trunc(t.json.interval / 60), runIntervalMin), 5);

    // TODO reconsider. Currently just root task have friendly name.
    if (t.json.taskType === 'root') {
      workflowName = workflowName || t.json.friendlyName;
    }
  }

  const template = workflowTemplate({
    taskId: id,
    workflowName,
    runIntervalMin,
  });

  INFO(`Writing ${workflowFile}`);
  writeText(workflowFile, template);
}

function doRemoveTask(args: string[]) {
  const program = new Command();

  program.passThroughOptions(true);
  program.option('-A, --all-subordinate', 'Purge all sub tasks.', false);

  program.parse(args, {from: 'user'});

  const restArgs = program.args;

  if (restArgs.length < 1) {
    usageExit();
  }

  for (const rootId of restArgs) {
    if (program.opts().allSubordinate) {
      const taskDir = path.join(ScheduleQueueDirectory, rootId);

      INFO(`Deleting task directory ${taskDir}`);
      fs.rmSync(taskDir, {recursive: true});
    } else {
      const task = readRootTask(rootId);

      INFO(`Deleting task file ${task.taskFile}`);
      fs.rmSync(task.taskFile);
    }

    refreshGithubActionWorkflow(rootId);
  }
}

function doRefreshWorkflow(args: string[]) {
  const program = new Command();

  program.passThroughOptions(true);
  program.option('-A, --all', 'Refresh all root tasks.', false);

  program.parse(args, {from: 'user'});

  let rootIdList: string[] = program.args;

  if (program.opts().all) {
    if (rootIdList.length > 0) {
      usageExit();
    }

    rootIdList = [];

    for (const a of fs.readdirSync(ScheduleQueueDirectory)) {
      const file = path.join(ScheduleQueueDirectory, a, `root.json`);

      if (!fs.existsSync(file)) {
        continue;
      }

      rootIdList.push(a);
    }
  }

  for (const rootId of rootIdList) {
    refreshGithubActionWorkflow(rootId);
  }
}

async function doSchedule(args: string[]) {

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
    case 'add':
      doAddTask(subArgs);
      break;
    case 'add-subtask':
      doAddSubTask(subArgs);
      break;
    case 'add-crawler':
      doAddCrawler(subArgs);
      break;
    case 'remove':
      doRemoveTask(subArgs);
      break;
    case 'run':
      await execRun(subArgs);
      break;
    case 'refresh-workflow':
      doRefreshWorkflow(subArgs);
      break;
    default:
      usageExit();
  }
}

// This script intended to call from shell. Probablly never less than 2 ;-)
if (process.argv.length < 2) {
  usageExit();
}

doSchedule(process.argv.slice(2));

// TODO  check code style and flow
