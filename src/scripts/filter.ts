export function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[’']/g, ' ').trim();
}
export function matchesProject(text: string, category: string, query: string, selected: string): boolean {
  return (selected === 'all' || category === selected) && normalize(query).split(/\s+/).every(word => normalize(text).includes(word));
}
