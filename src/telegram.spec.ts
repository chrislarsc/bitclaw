import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadPhoto } from './telegram.js';

test('downloadPhoto calls getFile and fetches the file', async () => {
  const fakeBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes

  const mockApi = {
    getFile: async (fileId: string) => {
      assert.equal(fileId, 'test-file-id');
      return { file_id: 'test-file-id', file_path: 'photos/file_42.jpg' };
    },
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input.toString();
    assert.ok(url.includes('/file/bot'));
    assert.ok(url.endsWith('photos/file_42.jpg'));
    // Ensure token is in the URL (required by Telegram API)
    assert.ok(url.includes('test-token'));
    return new Response(fakeBuffer);
  };

  try {
    const result = await downloadPhoto(mockApi as never, 'test-token', 'test-file-id');
    assert.ok(Buffer.isBuffer(result));
    assert.equal(result.length, fakeBuffer.length);
    assert.equal(result[0], 0xff);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('downloadPhoto throws when file_path is missing', async () => {
  const mockApi = {
    getFile: async () => ({ file_id: 'x' }),
  };

  await assert.rejects(
    () => downloadPhoto(mockApi as never, 'token', 'file-id'),
    { message: 'No file_path in getFile response' },
  );
});

test('downloadPhoto throws on HTTP error', async () => {
  const mockApi = {
    getFile: async () => ({ file_id: 'x', file_path: 'photos/file.jpg' }),
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 403 });

  try {
    await assert.rejects(
      () => downloadPhoto(mockApi as never, 'token', 'file-id'),
      { message: 'Photo download failed: HTTP 403' },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
