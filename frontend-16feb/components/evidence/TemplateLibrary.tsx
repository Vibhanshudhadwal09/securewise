'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star } from 'lucide-react';
import type { EvidenceTemplate } from '@/types/evidence';
import { getEvidenceTemplates, getTemplateCategories } from '@/lib/api/evidence-templates';

type CategoryItem = { category: string; count: number };

export default function TemplateLibrary(props: { onSelect: (template: EvidenceTemplate) => void; tenantId?: string }) {
  const { onSelect, tenantId } = props;
  const [templates, setTemplates] = useState<EvidenceTemplate[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<EvidenceTemplate | null>(null);
  const [sort, setSort] = useState('popular');
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [tplResp, catResp] = await Promise.allSettled([
        getEvidenceTemplates(undefined, tenantId),
        getTemplateCategories(tenantId),
      ]);
      const tplItems = tplResp.status === 'fulfilled' ? tplResp.value?.items || [] : [];
      const catItems = catResp.status === 'fulfilled' ? catResp.value?.items || [] : [];
      if (!cancelled) {
        setTemplates(tplItems);
        setCategories(catItems);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (activeCategory !== 'all' && t.category !== activeCategory) return false;
      if (!q) return true;
      return (
        t.template_name.toLowerCase().includes(q) ||
        String(t.subcategory || '').toLowerCase().includes(q) ||
        String(t.description || '').toLowerCase().includes(q)
      );
    });
  }, [templates, activeCategory, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === 'az') {
      list.sort((a, b) => a.template_name.localeCompare(b.template_name));
    } else if (sort === 'recent') {
      list.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')));
    }
    return list;
  }, [filtered, sort]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
          <div className="text-sm font-semibold text-gray-700">Categories</div>
          <button
            type="button"
            className={`w-full text-left rounded-md px-3 py-2 text-sm ${
              activeCategory === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => setActiveCategory('all')}
          >
            All templates
          </button>
          {categories.map((c) => (
            <button
              key={c.category}
              type="button"
              className={`w-full text-left rounded-md px-3 py-2 text-sm ${
                activeCategory === c.category ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => setActiveCategory(c.category)}
            >
              {c.category.toUpperCase()} <span className="text-xs text-gray-400">({c.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-9 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="flex-1 min-w-[220px] rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Search templates"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="popular">Sort: Popular</option>
            <option value="recent">Sort: Recent</option>
            <option value="az">Sort: A-Z</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`tpl-skel-${idx}`} className="h-32 rounded-lg border border-gray-200 bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            No templates found for this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sorted.map((t) => (
              <Card key={t.id} className="p-4 flex flex-col gap-3 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-gray-900">{t.template_name}</div>
                  <div className="flex items-center gap-2">
                    <Badge>{t.category.toUpperCase()}</Badge>
                    <button
                      type="button"
                      className={`rounded-full border p-1 ${
                        favorites.includes(t.id) ? 'border-yellow-300 bg-yellow-50 text-yellow-600' : 'border-gray-200 text-gray-400'
                      }`}
                      aria-label="Favorite template"
                      onClick={() =>
                        setFavorites((prev) =>
                          prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                        )
                      }
                    >
                      <Star size={14} />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 min-h-[36px]">{t.description || 'No description'}</div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">{t.subcategory || 'General'}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      onClick={() => setPreview(t)}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      onClick={() => onSelect(t)}
                    >
                      Use
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{preview?.template_name || 'Template preview'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3 text-sm text-gray-600">
              <div>{preview?.description || 'No description available.'}</div>
              <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                <div className="font-semibold mb-2">Default configuration</div>
                <pre className="whitespace-pre-wrap">{JSON.stringify(preview?.default_config || {}, null, 2)}</pre>
              </div>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
