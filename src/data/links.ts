import rawShortcuts from './shortcuts.json';
import rawSubdomains from './subdomains.json';
import shortcutSnapshot from './shortcut-availability.json';
import subdomainSnapshot from './subdomain-availability.json';
import { selectLiveSites } from './live-sites';
import type { IconName } from './icons';

interface Shortcut { id: string; title: string; path: string; site: string; icon: IconName }
interface Subdomain { id: string; title: string; site: string }

export const shortcuts = selectLiveSites(rawShortcuts as Shortcut[], shortcutSnapshot.projects);
export const subdomains = selectLiveSites(rawSubdomains as Subdomain[], subdomainSnapshot.projects);
