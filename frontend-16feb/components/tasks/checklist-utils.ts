export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export const CHECKLIST_MAX_ITEMS = 50;
export const CHECKLIST_MAX_TEXT = 500;

export function createChecklistId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `chk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function parseChecklist(raw: any): ChecklistItem[] {
  if (!raw) return [];
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.warn('Failed to parse checklist JSON', err);
      return [];
    }
  }

  const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  const seen = new Set<string>();

  return items.map((entry: any) => {
    const text =
      typeof entry === 'string'
        ? entry
        : typeof entry?.text === 'string'
          ? entry.text
          : String(entry?.text ?? '');
    let id = typeof entry?.id === 'string' ? entry.id : '';
    if (!id || seen.has(id)) {
      id = createChecklistId();
    }
    seen.add(id);
    return {
      id,
      text,
      completed: Boolean(entry?.completed),
    } satisfies ChecklistItem;
  });
}

export function sanitizeChecklist(items: ChecklistItem[]) {
  const seen = new Set<string>();
  const normalized = items.map((item) => {
    let id = String(item.id || '');
    if (!id || seen.has(id)) {
      id = createChecklistId();
    }
    seen.add(id);
    return {
      id,
      text: String(item.text || '').trim(),
      completed: Boolean(item.completed),
    } satisfies ChecklistItem;
  });

  const trimmed = normalized.filter((item) => item.text.length > 0);

  if (trimmed.some((item) => item.text.length > CHECKLIST_MAX_TEXT)) {
    return { items: trimmed, error: 'Checklist item text is too long (max 500 characters)' };
  }

  if (trimmed.length > CHECKLIST_MAX_ITEMS) {
    return { items: trimmed, error: 'Maximum 50 checklist items allowed' };
  }

  return { items: trimmed };
}

export function serializeChecklist(items: ChecklistItem[]) {
  return items.length ? { items } : null;
}

export function getChecklistProgress(items: ChecklistItem[]) {
  const total = items.length;
  const completed = items.filter((item) => item.completed).length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
}
