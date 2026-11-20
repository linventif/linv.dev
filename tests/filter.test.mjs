import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesProject, normalize } from '../src/scripts/filter.ts';

test('search ignores accents, case and typographic apostrophes', () => {
  assert.equal(normalize('Création Garry’s Mod'), 'creation garry s mod');
  assert.equal(matchesProject('Création avec Garry’s Mod', 'gaming', "Garry's creation", 'all'), true);
});
test('category and all query words must match together', () => {
  assert.equal(matchesProject('Fichiers sur réseau local', 'tools', 'reseau fichiers', 'tools'), true);
  assert.equal(matchesProject('Fichiers sur réseau local', 'tools', 'reseau fichiers', 'apps'), false);
  assert.equal(matchesProject('Fichiers sur réseau local', 'tools', 'fichiers discord', 'all'), false);
});
test('empty searches display the selected collection', () => {
  assert.equal(matchesProject('Open Process', 'apps', '  ', 'all'), true);
  assert.equal(matchesProject('Open Process', 'apps', '', 'apps'), true);
  assert.equal(matchesProject('Open Process', 'apps', '', 'gaming'), false);
});
