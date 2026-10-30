import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ANDROID_PACKAGE, STORE_URL } from '../links';

test('the store link points at the package in app.json', () => {
  const app = JSON.parse(readFileSync(new URL('../../../app.json', import.meta.url), 'utf8'));
  assert.equal(app.expo.android.package, ANDROID_PACKAGE);
  assert.ok(STORE_URL.endsWith(ANDROID_PACKAGE));
});
