import { spawnSync, } from 'child_process';

function path(command: string): string {
  return `./bin/${command}.ts`;
}

function tryTest(command: string) {
  const r = spawnSync(path(command), ['test'], { shell: false, stdio: "pipe"});

  test(`Calling ${command} test`, () => {
    expect(r.status).toBe(0);
  });
}

describe('Misc application command test', () => {
  describe('simple test (unit-test interface)', () => {
    // This spec is introduced for `Commander` library misunderstanding
    tryTest('scheduler');
    tryTest('publish');
    tryTest('crawl');
    tryTest('debug');
  });
  test('generate-key', () => {
    const r = spawnSync(path('generate-key'), ['10'], { shell: false, stdio: "pipe"});

    expect(r.status).toBe(0);
    // TODO fixme what is this comma?
    expect(/^,[0-9a-f]+\n,$/.test(r.output.toString().trim())).toBeTruthy();

  });
});
