export type BreadcrumbItem = { id: string | null; name: string };

export type ViewMode = 'grid' | 'list';

export type FileBrowserScope =
  | { type: 'user' }
  | { type: 'family'; familyId: string };

export function resolveFamilyId(scope: FileBrowserScope): string | undefined {
  return scope.type === 'family' ? scope.familyId : undefined;
}
