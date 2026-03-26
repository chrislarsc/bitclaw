import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createBitclawPaths, ensureBitclawDirs } from './config.js';
import type { InboundUserMessage } from './types.js';

function mkTempPaths() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bitclaw-photo-test-'));
  const paths = createBitclawPaths(tempDir);
  ensureBitclawDirs(paths);
  return paths;
}

// Replicate the orchestrator's photo-handling logic for testing
function processPhotoMessage(paths: ReturnType<typeof createBitclawPaths>, message: InboundUserMessage): string | null {
  let text = message.text;
  if (message.photos?.length) {
    for (const photo of message.photos) {
      const dest = path.join(paths.mediaDir, photo.filename);
      fs.writeFileSync(dest, photo.buffer);
      text += `\n[Photo attached — view with Read tool at /media/${photo.filename}]`;
    }
  }
  return text.trim() ? text : null;
}

test('photo message saves file and appends reference', () => {
  const paths = mkTempPaths();
  const message: InboundUserMessage = {
    text: 'What is this?',
    photos: [{ buffer: Buffer.from([0xff, 0xd8]), filename: '123_abc.jpg' }],
  };

  const result = processPhotoMessage(paths, message);

  assert.ok(result);
  assert.ok(result.includes('What is this?'));
  assert.ok(result.includes('[Photo attached — view with Read tool at /media/123_abc.jpg]'));
  assert.ok(fs.existsSync(path.join(paths.mediaDir, '123_abc.jpg')));

  const saved = fs.readFileSync(path.join(paths.mediaDir, '123_abc.jpg'));
  assert.deepEqual([...saved], [0xff, 0xd8]);

  fs.rmSync(paths.homeDir, { recursive: true });
});

test('photo without caption produces reference only', () => {
  const paths = mkTempPaths();
  const message: InboundUserMessage = {
    text: '',
    photos: [{ buffer: Buffer.from([0xff]), filename: '456_def.jpg' }],
  };

  const result = processPhotoMessage(paths, message);

  assert.ok(result);
  assert.ok(result.includes('/media/456_def.jpg'));
  assert.ok(fs.existsSync(path.join(paths.mediaDir, '456_def.jpg')));

  fs.rmSync(paths.homeDir, { recursive: true });
});

test('text-only message returns text unchanged', () => {
  const paths = mkTempPaths();
  const message: InboundUserMessage = { text: 'Hello' };

  const result = processPhotoMessage(paths, message);

  assert.equal(result, 'Hello');
  assert.equal(fs.readdirSync(paths.mediaDir).length, 0);

  fs.rmSync(paths.homeDir, { recursive: true });
});

test('empty message returns null', () => {
  const paths = mkTempPaths();
  const message: InboundUserMessage = { text: '' };

  const result = processPhotoMessage(paths, message);
  assert.equal(result, null);

  fs.rmSync(paths.homeDir, { recursive: true });
});
