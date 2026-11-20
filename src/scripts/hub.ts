import { matchesProject } from './filter';

const search = document.querySelector<HTMLInputElement>('#project-search');
const cards = [...document.querySelectorAll<HTMLElement>('[data-project]')];
const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-filter]')];
const counter = document.querySelector('#result-count');
const clear = document.querySelector<HTMLButtonElement>('#clear-filters');
const empty = document.querySelector<HTMLElement>('#empty-state');
let selected = 'all';

function update(syncUrl = true): void {
  const query = search?.value ?? '';
  let visible = 0;
  for (const card of cards) {
    card.hidden = !matchesProject(card.dataset.search ?? '', card.dataset.category ?? '', query, selected);
    if (!card.hidden) visible++;
  }
  filters.forEach(button => {
    const active = button.dataset.filter === selected;
    button.classList.toggle('filter-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (counter) counter.textContent = `${visible} site${visible > 1 ? 's' : ''}`;
  const active = Boolean(query.trim() || selected !== 'all');
  if (clear) clear.hidden = !active;
  if (empty) empty.hidden = visible !== 0;
  if (syncUrl) {
    const url = new URL(window.location.href);
    query.trim() ? url.searchParams.set('q', query.trim()) : url.searchParams.delete('q');
    selected !== 'all' ? url.searchParams.set('categorie', selected) : url.searchParams.delete('categorie');
    window.history.replaceState(null, '', url);
  }
}
function readUrl(): void {
  const params = new URLSearchParams(window.location.search);
  if (search) search.value = params.get('q') ?? '';
  const requested = params.get('categorie');
  selected = filters.some(button => button.dataset.filter === requested) ? requested! : 'all';
  update(false);
}
function reset(): void {
  if (search) search.value = '';
  selected = 'all';
  update();
  search?.focus();
}
filters.forEach(button => button.addEventListener('click', () => {
  selected = button.dataset.filter ?? 'all';
  update();
}));
search?.addEventListener('input', () => update());
clear?.addEventListener('click', reset);
document.querySelector('#reset-search')?.addEventListener('click', reset);
window.addEventListener('popstate', readUrl);
document.addEventListener('keydown', event => {
  const editing = event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable);
  if ((event.key === '/' && !editing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
    event.preventDefault();
    search?.focus();
  }
  if (event.key === 'Escape' && event.target === search) reset();
});
readUrl();

const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle');
function syncThemeButton(): void {
  const light = document.documentElement.dataset.theme === 'linv-light';
  toggle?.setAttribute('aria-label', `Activer le thème ${light ? 'sombre' : 'clair'}`);
  toggle?.setAttribute('aria-pressed', String(light));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f6f7f9' : '#141517');
}
toggle?.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'linv-light' ? 'linv-dark' : 'linv-light';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('linv-theme', theme); } catch {}
  syncThemeButton();
});
syncThemeButton();
