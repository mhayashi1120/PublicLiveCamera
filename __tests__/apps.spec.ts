import { spawnSync, } from 'child_process';

function tryTest(command: string) {
  const r = spawnSync(`./bin/${command}.ts`, ['test'], { shell: false, stdio: "pipe"});

  expect(r.status).toBe(0);
}

describe('Misc application command test', () => {
  test('simple test (unit-test interface)', () => {
    tryTest('scheduler');
    tryTest('publish');
    tryTest('crawl');
    tryTest('debug');
  });
});
