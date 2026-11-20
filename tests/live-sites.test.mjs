import test from 'node:test';
import assert from 'node:assert/strict';
import { selectLiveSites } from '../src/data/live-sites.ts';

test('a public repository never substitutes for a live website', () => {
  const candidates = [
    { id: 'repository-only', repository: 'https://github.com/linventif/example' },
    { id: 'website-down', site: 'https://down.example' },
    { id: 'website-up', site: 'https://up.example' },
  ];
  const availability = {
    'repository-only': { repository: { public: true } },
    'website-down': { site: { status: 'offline' }, repository: { public: true } },
    'website-up': { site: { status: 'online' } },
  };
  assert.deepEqual(selectLiveSites(candidates, availability).map(site => site.id), ['website-up']);
});

test('blocked, failed and unverified sites are omitted', () => {
  const statuses = ['blocked', 'offline', 'error', 'online'];
  const candidates = [...statuses, 'unknown'].map(id => ({ id, site: `https://${id}.example` }));
  const availability = Object.fromEntries(statuses.map(status => [status, { site: { status } }]));
  assert.deepEqual(selectLiveSites(candidates, availability).map(site => site.id), ['online']);
});

test('all sites down produces an empty directory', () => {
  assert.deepEqual(selectLiveSites([{ id: 'down', site: 'https://down.example' }], { down: { site: { status: 'offline' } } }), []);
});
