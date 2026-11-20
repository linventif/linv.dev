import { readFile, writeFile } from 'node:fs/promises';
import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';

type SiteStatus = 'online' | 'blocked' | 'offline' | 'error';
type SiteAvailability = {
  status: SiteStatus;
  httpStatus?: number;
  finalUrl?: string;
  addresses: string[];
};
type RepositoryAvailability = { public: boolean | null; httpStatus?: number };
type ProjectAvailability = {
  site?: SiteAvailability;
  repository?: RepositoryAvailability;
};
type Availability = {
  checkedAt: string;
  projects: Record<string, ProjectAvailability>;
};
type Project = { id: string; title: string; site?: string; repository?: string };

const projectsFile = new URL('../src/data/projects.json', import.meta.url);
const availabilityFile = new URL('../src/data/availability.json', import.meta.url);
const timeoutMs = 12_000;
const concurrency = 4;
const maxRedirects = 5;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const siteStatuses = new Set<SiteStatus>(['online', 'blocked', 'offline', 'error']);

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function httpsUrl(value: unknown, label: string): URL {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} : URL manquante.`);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} : URL invalide.`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    throw new Error(`${label} : une URL HTTPS sans identifiants ni port personnalisé est requise.`);
  }
  return url;
}

function repositoryEndpoint(value: unknown, label: string): URL {
  const url = httpsUrl(value, label);
  const parts = url.pathname.replace(/\/$/, '').split('/').filter(Boolean);
  if (url.hostname !== 'github.com' || parts.length !== 2 || url.search || url.hash) {
    throw new Error(`${label} : utiliser https://github.com/propriétaire/dépôt.`);
  }
  const [owner, rawName] = parts;
  if (!owner || !rawName) throw new Error(`${label} : propriétaire et nom du dépôt sont requis.`);
  const name = rawName.replace(/\.git$/, '');
  if (!/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(owner) || !/^[\w.-]+$/.test(name) || name === '.' || name === '..') {
    throw new Error(`${label} : propriétaire ou nom de dépôt invalide.`);
  }
  return new URL(`https://api.github.com/repos/${owner}/${name}`);
}

function parseProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) throw new Error('projects.json doit contenir un tableau.');
  const seen = new Set<string>();
  return value.map((entry, index) => {
    if (!object(entry) || typeof entry.id !== 'string' || !entry.id.trim() || typeof entry.title !== 'string' || !entry.title.trim()) {
      throw new Error(`Projet ${index + 1} : id et title sont requis.`);
    }
    if (seen.has(entry.id)) throw new Error(`Identifiant de projet dupliqué : ${entry.id}.`);
    seen.add(entry.id);
    if (entry.site !== undefined) httpsUrl(entry.site, `${entry.id} / site`);
    if (entry.repository !== undefined) repositoryEndpoint(entry.repository, `${entry.id} / repository`);
    return entry as Project;
  });
}

async function readJson(file: URL): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`${file.pathname.split('/').at(-1)} : JSON invalide.`);
    throw new Error(`${file.pathname.split('/').at(-1)} est absent ou illisible.`);
  }
}

function validHttpStatus(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599);
}

function validateAvailability(value: unknown, projects: Project[]): asserts value is Availability {
  if (!object(value) || typeof value.checkedAt !== 'string' || !Number.isFinite(Date.parse(value.checkedAt)) || !object(value.projects)) {
    throw new Error('availability.json : checkedAt et projects sont requis.');
  }
  for (const project of projects) {
    const result = value.projects[project.id];
    if (!object(result)) throw new Error(`Instantané manquant pour ${project.id}.`);
    if (project.site) {
      const site = result.site;
      if (!object(site) || !siteStatuses.has(site.status as SiteStatus) || !Array.isArray(site.addresses) || !site.addresses.every(address => typeof address === 'string' && isIP(address)) || !validHttpStatus(site.httpStatus)) {
        throw new Error(`État du site manquant ou invalide pour ${project.id}.`);
      }
      if (site.finalUrl !== undefined) httpsUrl(site.finalUrl, `${project.id} / finalUrl`);
    }
    if (project.repository) {
      const repository = result.repository;
      if (!object(repository) || ![true, false, null].includes(repository.public as boolean | null) || !validHttpStatus(repository.httpStatus)) {
        throw new Error(`État du dépôt manquant ou invalide pour ${project.id}.`);
      }
    }
  }
}

// Redirects may only visit HTTPS hosts explicitly present in the catalogue.
async function get(url: URL, allowedHosts: Set<string>, signal: AbortSignal, github = false): Promise<{ status: number; url: string }> {
  let current = url;
  for (let redirects = 0; ; redirects++) {
    if (!allowedHosts.has(current.hostname)) throw new Error('Redirection hors des domaines autorisés.');
    const response = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers: {
        'User-Agent': 'linv-portfolio-availability-checker',
        ...(github ? { Accept: 'application/vnd.github+json' } : {}),
      },
    });
    const location = response.headers.get('location');
    const status = response.status;
    await response.body?.cancel();
    if (!redirectStatuses.has(status) || !location) return { status, url: current.href };
    if (redirects >= maxRedirects) throw new Error('Trop de redirections.');
    current = httpsUrl(new URL(location, current).href, 'Redirection');
  }
}

async function addressesFor(hostname: string, signal: AbortSignal): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  const resolver = new Resolver({ timeout: timeoutMs, tries: 1 });
  const cancel = () => resolver.cancel();
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    const results = await Promise.allSettled([
      resolver.resolve4(hostname),
      resolver.resolve6(hostname),
      resolver.resolveCname(hostname),
    ]);
    signal.throwIfAborted();
    const addresses = results.slice(0, 2).flatMap(result => result.status === 'fulfilled' ? result.value : []);
    return [...new Set(addresses)].sort();
  } finally {
    signal.removeEventListener('abort', cancel);
    resolver.cancel();
  }
}

async function checkSite(value: string, allowedHosts: Set<string>): Promise<SiteAvailability> {
  let addresses: string[] = [];
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const url = httpsUrl(value, 'Site');
    addresses = await addressesFor(url.hostname, signal);
    if (!addresses.length) return { status: 'offline', addresses };
    const response = await get(url, allowedHosts, signal);
    const httpStatus = response.status;
    const status: SiteStatus = httpStatus === 401 || httpStatus === 403 ? 'blocked'
      : httpStatus >= 200 && httpStatus < 400 ? 'online'
      : httpStatus === 404 || httpStatus === 410 ? 'offline'
      : 'error';
    return { status, httpStatus, finalUrl: response.url, addresses };
  } catch (error) {
    // An off-catalogue redirect is a scan limitation, rather than proof of downtime.
    const status: SiteStatus = error instanceof TypeError || signal.aborted ? 'offline' : 'error';
    return { status, addresses };
  }
}

async function checkRepository(value: string): Promise<RepositoryAvailability> {
  let apiResult: RepositoryAvailability = { public: null };
  try {
    const response = await get(repositoryEndpoint(value, 'Dépôt'), new Set(['api.github.com']), AbortSignal.timeout(timeoutMs), true);
    apiResult = {
      public: response.status >= 200 && response.status < 300 ? true : response.status === 404 ? false : null,
      httpStatus: response.status,
    };
    if (response.status !== 403 && response.status !== 429) return apiResult;
  } catch {
    // A public HTML page can still establish visibility when the API is unavailable.
  }
  try {
    const endpoint = repositoryEndpoint(value, 'Dépôt');
    const publicUrl = new URL(endpoint.pathname.replace(/^\/repos\//, '/'), 'https://github.com');
    const response = await get(publicUrl, new Set(['github.com']), AbortSignal.timeout(timeoutMs));
    if (response.status === 404) return { public: false, httpStatus: 404 };
    if (response.status === 200) {
      const finalUrl = new URL(response.url);
      const owner = finalUrl.pathname.split('/')[1]?.toLowerCase();
      const reservedPaths = new Set(['login', 'oauth', 'sessions', 'session', 'settings', 'account', 'accounts', 'signup', 'orgs', 'organizations', 'users', 'apps', 'marketplace', 'features', 'topics', 'collections', 'search', 'pricing', 'enterprise', 'security', 'notifications', 'explore', 'codespaces', 'sponsors']);
      // This also excludes login/oauth, account pages, and other non-repository redirects.
      repositoryEndpoint(finalUrl.href, 'Dépôt final');
      if (owner && !reservedPaths.has(owner)) return { public: true, httpStatus: 200 };
    }
    return { public: null, httpStatus: response.status };
  } catch {
    return apiResult;
  }
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check') || args.length > 1) {
    throw new Error('Utilisation : node scripts/scan-projects.ts [--check]');
  }
  const projects = parseProjects(await readJson(projectsFile));
  const sites = projects.filter(project => project.site).length;
  const repositories = projects.filter(project => project.repository).length;
  if (args.includes('--check')) {
    const snapshot = await readJson(availabilityFile);
    validateAvailability(snapshot, projects);
    console.log(`Validation : ${projects.length} projets, ${sites} sites et ${repositories} dépôts. Instantané du ${snapshot.checkedAt}.`);
    return;
  }

  const allowedHosts = new Set(projects.filter(project => project.site).map(project => httpsUrl(project.site, 'Site').hostname));
  const results: Record<string, ProjectAvailability> = Object.create(null);
  const tasks: Array<() => Promise<void>> = [];
  for (const project of projects) {
    const result: ProjectAvailability = {};
    results[project.id] = result;
    if (project.site) tasks.push(async () => { result.site = await checkSite(project.site!, allowedHosts); });
    if (project.repository) tasks.push(async () => { result.repository = await checkRepository(project.repository!); });
  }
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (next < tasks.length) {
      const task = tasks[next++];
      if (task) await task();
    }
  }));
  const snapshot: Availability = { checkedAt: new Date().toISOString(), projects: results };
  await writeFile(availabilityFile, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  const online = Object.values(results).filter(result => result.site?.status === 'online').length;
  const publicRepositories = Object.values(results).filter(result => result.repository?.public === true).length;
  console.log(`Disponibilité enregistrée : ${online}/${sites} sites accessibles, ${publicRepositories}/${repositories} dépôts publics. Les autres résultats peuvent être bloqués ou inconnus.`);
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : 'Échec de la vérification.');
  process.exitCode = 1;
});
