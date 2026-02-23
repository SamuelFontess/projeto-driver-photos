export type BreadcrumbItem = { id: string | null; name: string };

export type ViewMode = 'grid' | 'list';

export type FileBrowserScope =
  | { type: 'user' }
  | { type: 'family'; familyId: string };
