function buildCronGuru(min: number, source: number): string {
  const segments: string[] = ['*', '*', '*', '*', '*'];
  let i: number;
  const hourPart = source % 24;
  const minPart = source % 60;

  if ((i = Math.trunc(min / (24 * 60))) > 0) {
    segments[2] = `*/${i}`;
    segments[1] = `${hourPart}`;
    segments[0] = `${minPart}`;
  } else if ((i = Math.trunc(min / 60)) > 0) {
    segments[1] = `*/${i}`;
    segments[0] = `${minPart}`;
    // TODO generate some of digest generation
    // Math.trunc(60 * Math.random());
  } else if ((i = Math.trunc(min)) > 0) {
    segments[0] = `*/${i}`;
  } else {
    throw new Error(`Assertion`);
  }

  return segments.join(' ');
}

import { sha512 } from 'js-sha512';

function buildGenerateSource(s: string): number {
  var hash = sha512.create();

  hash.update(s);

  const hex = hash.hex();

  const hexValue = hex.substring(0, 10);

  return parseInt(hexValue, 16);
}

export default (x: {
  // Accept 10min to 1day. (5min not works correctly. TODO need adjustment)
  // https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule
  runIntervalMin: number,
  // Friendly name that displays on https://github.com/mhayashi1120/PublicLiveCamera/actions
  workflowName?: string,
  // Identify the task
  taskId: string,
}) => {

  // Clamp
  let min = Math.min(Math.max(x.runIntervalMin, 10), (60 * 24));
  const generationSource = buildGenerateSource(x.taskId);
  const cronTask = buildCronGuru(min, generationSource);

  // TODO should escape in yml syntax
  const taskName = x.workflowName || x.taskId;

  return `
name: Scheduler task ${taskName}

on:
  schedule:
    - cron: '${cronTask}'

jobs:
  scheduledTask:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    env:
      LIVECAMERA_GOOGLE_API_TOKEN: \${{ secrets.GOOGLE_API_TOKEN }}
      PUBLISH_SERVER_HOST: \${{ secrets.PUBLISH_SERVER_HOST }}
      PUBLISH_SERVER_PORT: \${{ secrets.PUBLISH_SERVER_PORT }}
      PUBLISH_SERVER_USER: \${{ secrets.PUBLISH_SERVER_USER }}
      SSH_KEY_FILE: \${GITHUB_WORKSPACE}/.ssh/id_ecdsa
      SSH_CONFIG_FILE: \${GITHUB_WORKSPACE}/.ssh/config
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Check OS environment
        run: |
          which ip && ip address
          which ip && ip route
      - name: Setup global environment
        run: |
          echo \${GITHUB_WORKSPACE}/node_modules/.bin >> \${GITHUB_PATH}
      - name: Setup git environment
        run: |
          git config --global user.email "mhayashi1120"
          git config --global user.name "Github Action workflow auto build"
      - name: Setup sync environment
        run: |
          echo "\${{ secrets.PUBLISH_SERVER_SSH_KEY }}" > \${SSH_KEY_FILE}
          echo "" > \${SSH_CONFIG_FILE}
          echo "IdentitiesOnly=true" >> \${SSH_CONFIG_FILE}
      - name: Prepare packages
        run: |
          npm install
      - name: Run Task Scheduler
        run: |
         npm run schedule -- ${x.taskId}
`;
  }
