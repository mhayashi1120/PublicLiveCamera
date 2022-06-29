#!/usr/bin/env ts-node

async function doConvert() {
  const buffers = [];
  for await (const chunk of process.stdin) buffers.push(chunk);
  const buffer = Buffer.concat(buffers);
  const text = buffer.toString();

  const fromJson = JSON.parse(text);
  const toJson = [];

  for (const f of fromJson) {
    const t = {
      "code": f["Numeric code"],
      aliases: [
        f["English Short name"],
        f["French Short name"],
        f["Alpha2 Code"],
        f["Alpha3 Code"],
      ],
    };

    toJson.push(t);
  }

  console.log(JSON.stringify(toJson));
}

doConvert()
