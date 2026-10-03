#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const formatter = new URL('../app/javascript/lib/formatProjectDate.ts', import.meta.url).href;
const cases = [
  ['2026-10-03T00:05:00Z', '10/3/2026'],
  ['2026-10-02T23:55:00Z', '10/2/2026'],
  ['2026-12-31T23:55:00-10:00', '1/1/2027'],
];

for (const timeZone of ['UTC', 'Pacific/Honolulu', 'Asia/Tokyo']) {
  for (const locale of ['en_US.UTF-8', 'de_DE.UTF-8']) {
    const program = `
      import { formatProjectDate } from ${JSON.stringify(formatter)};
      console.log(JSON.stringify(${JSON.stringify(cases)}.map(([value]) => formatProjectDate(value))));
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
      encoding: 'utf8',
      env: { ...process.env, TZ: timeZone, LANG: locale, LC_ALL: locale },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), cases.map(([, expected]) => expected), `${timeZone}/${locale}`);
  }
}

console.log('Project dates match across three time zones and two locales');
