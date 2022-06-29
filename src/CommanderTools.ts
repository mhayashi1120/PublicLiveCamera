export function argToString(v: string, _: string | null): string  | null {
  return v;
}

// TODO should test
export function argToSeconds(s: string, _: number): number {
  let res = 0;

  let m;

  if (m = /^([0-9]+)$/.exec(s)) {
    const sec = parseInt(m[1]);

    return sec;
  }

  while (s.length > 0) {
    s = s.trimStart();

    if (m = /^([0-9]+)(w|weeks?)/.exec(s)) {
      const week = parseInt(m[1]);

      res += week * 7 * 24 * 60 * 60;
      s = s.substring(m[0].length);
    } else if (m = /^([0-9]+)(d|days?)/.exec(s)) {
      const day = parseInt(m[1]);

      res += day * 24 * 60 * 60;
      s = s.substring(m[0].length);
    } else if (m = /^([0-9]+)(h|hours?)/.exec(s)) {
      const hour = parseInt(m[1]);

      res += hour * 60 * 60;
      s = s.substring(m[0].length);
    } else if (m = /^([0-9]+)(m|min|minutes?)/.exec(s)) {
      const min = parseInt(m[1]);

      res += min * 60;
      s = s.substring(m[0].length);
    } else if (m = /^([0-9]+)(s|sec|seconds?)/.exec(s)) {
      const sec = parseInt(m[1]);

      res += sec;
      s = s.substring(m[0].length);
    } else {
      throw new Error(`Unable parse schedule text ${s}`);
    }
  }

  return res;
}

export function argToPositiveNumber(v: string, _: number): number {
  if (!/^[0-9]+$/.test(v)) {
    throw new Error(`Not a valid number ${v}`);
  }

  // TODO consider the restriction
  if (v.length > 10) {
    throw new Error(`Too long number text. ${v}`);
  }

  return parseInt(v);
}
