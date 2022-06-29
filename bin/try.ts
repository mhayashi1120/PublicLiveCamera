#!/usr/bin/env -S ts-node -r tsconfig-paths/register

import iconv from 'iconv-lite';
import * as fs from 'fs';

function decodeBuffer(buffer: Buffer, coding?: string): string {
  if (coding && ['shift_jis', 'euc-jp'].includes(coding)) {
    return iconv.decode(buffer, coding);
  } else {
    const binary = Uint8Array.from(buffer);
    const decoder = new TextDecoder();

    return decoder.decode(binary);
  }
}


const text = decodeBuffer(fs.readFileSync('/home/masa/data/src/PublicLiveCamera/working/__cache__/007.html'), 'shift_jis');


console.log('buf', text);
