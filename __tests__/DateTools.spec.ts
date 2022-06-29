import {
  compareTimeString,
} from '../src/DateTools';

function toAt(d: Date): string {
  return d.toISOString();
}


describe('Misc date test', () => {
  test('simple text', () => {
    expect(compareTimeString(toAt(new Date(1)), toAt(new Date(2)))).toBe(-1);
    expect(compareTimeString(toAt(new Date(1)), toAt(new Date(1)))).toBe(0);
    expect(compareTimeString(toAt(new Date(1)), toAt(new Date(0)))).toBe(1);
  });
});
