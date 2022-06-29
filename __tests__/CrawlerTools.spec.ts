import {
  validateGeoText,
  sexagesimalToFloat, floatToSexagesimal,
  joinUrl,
} from '../src/CrawlerTools';
import {
  // readJsdom,
  readFileAsJsdom,
} from '../src/CrawlerTools';

import {
  SpecDirectory,
} from '../src/Settings';

import * as path from 'path';

describe('Misc validation test', () => {
  test('simple text', () => {
    expect(validateGeoText('1.1')).toBe(1.1);
  });
});

describe('Misc basic parsing test', () => {
  test('simple html', async () => {
    // TODO should test some jsdom test is expectedly working.
    const jsdom = await readFileAsJsdom(path.join(SpecDirectory, 'testdata/0001.html'));

    console.warn('Should test jsdom', jsdom);
  });
});

describe('Misc conversion test', () => {
  test('simple sexagesimal geo', async () => {
    expect(sexagesimalToFloat(80, 5, 1)).toBeCloseTo(80.083611);

    const sexagesimal = floatToSexagesimal(80.083611);
    expect(sexagesimal[0]).toBe(80);
    expect(sexagesimal[1]).toBe(5);
    expect(sexagesimal[2]).toBeCloseTo(1);
  });
});


describe('URL handling test', () => {
  test('simple text', () => {
    expect(joinUrl('https://example.com/', 'foo')).toBe('https://example.com/foo');
    expect(joinUrl('https://example.com', 'foo')).toBe('https://example.com/foo');
    expect(joinUrl('https://example.com', './foo')).toBe('https://example.com/foo');
    expect(joinUrl('https://example.com', '../foo')).toBe('https://example.com/foo');
    expect(joinUrl('https://example.com/foo', '../hoge')).toBe('https://example.com/hoge');
    expect(joinUrl('https://example.com/foo/', '../hoge')).toBe('https://example.com/hoge');
    expect(joinUrl('https://example.com/foo', './hoge')).toBe('https://example.com/hoge');
    expect(joinUrl('https://example.com/foo/', './hoge')).toBe('https://example.com/foo/hoge');
    // Just check joinUrl (new URL()) behavior.
    expect(joinUrl('https://example.com/foo', '../../invalid.example.com')).toBe('https://example.com/invalid.example.com');
  });
});

// TODO
// - build tree
// - test commands (bin/*.ts)
// - more tests
