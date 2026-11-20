import rawProjects from './projects.json';
import snapshot from './availability.json';
import { selectLiveSites } from './live-sites';
import type { IconName } from './icons';

const categoryDefinitions = [
  { id: 'all', label: 'Tous les sites' },
  { id: 'apps', label: 'Applications' },
  { id: 'tools', label: 'Outils & dev' },
  { id: 'gaming', label: 'Garry’s Mod' },
  { id: 'experiments', label: 'Expérimentations' },
] as const;
export type Category = Exclude<(typeof categoryDefinitions)[number]['id'], 'all'>;
export interface Project {
  id: string;
  title: string;
  description: string;
  category: Category;
  icon: IconName;
  tags: string[];
  site: string;
  sources: string[];
}
export const checkedAt = snapshot.checkedAt;
export const projects = selectLiveSites(rawProjects as Project[], snapshot.projects);
export const categories = categoryDefinitions.filter(category =>
  category.id === 'all' || projects.some(project => project.category === category.id)
);
