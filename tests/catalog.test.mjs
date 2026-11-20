import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const catalog = JSON.parse(await readFile(new URL('../src/data/projects.json', import.meta.url), 'utf8'));
const snapshot = JSON.parse(await readFile(new URL('../src/data/availability.json', import.meta.url), 'utf8'));

test('the requested websites are included in the candidate catalogue', () => {
  for (const id of ['gmod-integration', 'open-process', 'portfolio']) {
    const project = catalog.find(project => project.id === id);
    assert.ok(project?.site);
  }
});
test('each candidate has a unique identity, HTTPS site and verification result', () => {
  assert.equal(new Set(catalog.map(project => project.id)).size, catalog.length);
  for (const project of catalog) {
    assert.ok(project.sources.length > 0, project.id);
    assert.equal(new URL(project.site).protocol, 'https:');
    for (const value of [project.site, project.repository, ...project.sources].filter(Boolean)) {
      assert.equal(new URL(value).protocol, 'https:');
    }
    const availability = snapshot.projects[project.id];
    assert.ok(availability, project.id);
    assert.ok(['online', 'blocked', 'offline', 'error'].includes(availability.site?.status), project.id);
  }
});
test('personal monitoring and administration domains are not destinations', () => {
  const hosts = catalog.flatMap(project => [project.site, project.repository].filter(Boolean)).map(url => new URL(url).hostname);
  for (const privateHost of ['pool.linv.dev', 'banana.linv.dev', 'dokploy.linv.dev', 'cloud.linv.dev', 'github.com', 'steamcommunity.com']) {
    assert.ok(!hosts.includes(privateHost));
  }
});
