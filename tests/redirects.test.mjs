import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRedirects } from '../scripts/generate-redirects.ts';

test('shortcuts use exact paths, optional trailing slash, and identical Pages/Nginx destinations', () => {
  const output = generateRedirects([
    { path: '/github', site: 'https://github.com/linventif' },
    { path: '/cc-by-sa-4.0', site: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  ], []);
  assert.match(output.pages, /^\/github https:\/\/github\.com\/linventif 302$/m);
  assert.match(output.pages, /^\/github\/ https:\/\/github\.com\/linventif 302$/m);
  assert.match(output.nginxShortcuts, /location = \/github \{\n    return 302 "https:\/\/github\.com\/linventif";/);
  assert.match(output.pages, /^\/cc-by-sa-4\.0 /m);
  for (const legacy of ['creations', 'docs', 'colors', 'social', 'terms']) {
    assert.ok(output.pages.includes(`/${legacy} /#projets 302\n`));
    assert.ok(output.pages.includes(`/${legacy}/ /#projets 302\n`));
    assert.ok(!output.nginxShortcuts.includes(`location = /${legacy} `));
  }
});

test('only explicitly configured subdomains redirect and path preservation retains encoded request URI', () => {
  const output = generateRedirects([], [
    { site: 'https://gmi.linv.dev', redirect: { target: 'https://gmod-integration.com/', preservePath: true } },
    { site: 'https://discord.linv.dev', redirect: { target: 'https://discord.gg/EkVPk9y', preservePath: false } },
    { site: 'https://open-process.linv.dev' },
  ]);
  assert.match(output.nginxSubdomains, /server_name gmi\.linv\.dev;\n    return 302 "https:\/\/gmod-integration\.com\$request_uri";/);
  assert.match(output.nginxSubdomains, /server_name discord\.linv\.dev;\n    return 302 "https:\/\/discord\.gg\/EkVPk9y";/);
  assert.equal(output.nginxSubdomains.match(/\$request_uri/g)?.length, 1);
  assert.ok(!output.nginxSubdomains.includes('server_name _'));
  assert.ok(!output.nginxSubdomains.includes('*.linv.dev'));
  assert.ok(!output.nginxSubdomains.includes('open-process.linv.dev'));
  assert.ok(!output.nginxSubdomains.includes('unknown.linv.dev'));
  assert.ok(!output.nginxSubdomains.includes('%24request_uri'));
  assert.deepEqual(output.cloudflareCsv.trim().split('\n'), [
    'https://gmi.linv.dev/,https://gmod-integration.com/,302,TRUE,FALSE,TRUE,TRUE',
    'http://gmi.linv.dev/,https://gmod-integration.com/,302,TRUE,FALSE,TRUE,TRUE',
    'https://discord.linv.dev/,https://discord.gg/EkVPk9y,302,FALSE,FALSE,TRUE,FALSE',
    'http://discord.linv.dev/,https://discord.gg/EkVPk9y,302,FALSE,FALSE,TRUE,FALSE',
  ]);
});

test('URLs are quoted for CSV and encoded URI components stay encoded', () => {
  const output = generateRedirects([{ path: '/encoded', site: 'https://example.com/a%2Fb?literal=%24request_uri' }], [
    { site: 'https://links.linv.dev', redirect: { target: 'https://example.com/?items=a,b&literal=%24request_uri', preservePath: false } },
  ]);
  assert.ok(output.nginxShortcuts.includes('a%2Fb?literal=%24request_uri'));
  assert.ok(output.nginxSubdomains.includes('literal=%24request_uri'));
  assert.ok(output.cloudflareCsv.includes('"https://example.com/?items=a,b&literal=%24request_uri",302,FALSE,FALSE,TRUE,FALSE'));
});

test('invalid and ambiguous mappings fail before producing configuration', () => {
  for (const site of ['http://example.com/', 'https://user:pass@example.com/', 'https://example.com:8443/', 'https://example.com/\nlocation', 'https://example.com/\\injection', 'https://example.com/$request_uri']) {
    assert.throws(() => generateRedirects([{ path: '/test', site }], []));
  }
  for (const path of ['/test;return', '/test\n', '/test/', '/Test', '/test/child', '/docs']) {
    assert.throws(() => generateRedirects([{ path, site: 'https://example.com/' }], []));
  }
  for (const site of ['https://linv.dev', 'https://linv.dev.example.com', 'https://evil.example', 'https://*.linv.dev', 'https://foo.linv.dev/path', 'https://foo.linv.dev?query=yes']) {
    assert.throws(() => generateRedirects([], [{ site }]));
  }
  assert.throws(() => generateRedirects([{ path: '/same', site: 'https://example.com/' }, { path: '/same', site: 'https://example.org/' }], []));
  assert.throws(() => generateRedirects([], [{ site: 'https://foo.linv.dev', redirect: { target: 'https://foo.linv.dev/', preservePath: true } }]));
  assert.throws(() => generateRedirects([], [{ site: 'https://foo.linv.dev', redirect: { target: 'https://example.com/?a=b', preservePath: true } }]));
});
