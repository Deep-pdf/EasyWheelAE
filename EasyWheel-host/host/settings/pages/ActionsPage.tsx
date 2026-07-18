import React, { useState, useMemo } from 'react';
import { useConfig } from '../context/ConfigContext';
import { PageLayout } from '../components/layout/PageLayout';
import { SearchBar } from '../components/ui/SearchBar';

export function ActionsPage(): React.JSX.Element {
  const { config } = useConfig();
  const [search, setSearch] = useState('');

  const actionLibrary = config?.action_library || [];

  // Filter actions based on search input
  const filteredActions = useMemo(() => {
    return actionLibrary.filter((action) => {
      return (
        action.display_name.toLowerCase().includes(search.toLowerCase()) ||
        action.description.toLowerCase().includes(search.toLowerCase()) ||
        action.id.toLowerCase().includes(search.toLowerCase()) ||
        action.category.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [actionLibrary, search]);

  // Group filtered actions by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, typeof filteredActions> = {};
    filteredActions.forEach((action) => {
      const cat = action.category || 'Uncategorized';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(action);
    });
    return groups;
  }, [filteredActions]);

  if (!config) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Loading actions...
      </div>
    );
  }

  return (
    <PageLayout
      title="Action Library"
      description="Browse all available radial shortcut actions registered in EasyWheel Host."
    >
      <div className="flex flex-col gap-5 text-left">
        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search actions by name, category, or ID..."
          className="max-w-md"
        />

        {/* Grouped Lists */}
        <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-1">
          {Object.entries(groupedActions).map(([category, list]) => (
            <div key={category} className="space-y-3">
              {/* Category Header */}
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
                {category} ({list.length})
              </h3>

              {/* Action grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {list.map((action) => (
                  <div
                    key={action.id}
                    className="p-4 bg-zinc-950/20 border border-zinc-800 rounded-xl flex items-start gap-4 hover:border-zinc-700/50 transition-colors"
                  >
                    {/* Icon placeholder */}
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold flex-shrink-0">
                      {action.display_name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <h4 className="font-semibold text-zinc-200 text-sm truncate">{action.display_name}</h4>
                        <span className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-mono">
                          {action.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 min-h-[2rem]">
                        {action.description}
                      </p>
                      <div className="mt-3 flex justify-between items-center text-[10px] text-zinc-600 font-mono">
                        <span>ID: {action.id}</span>
                        <span className="bg-zinc-900/60 px-1.5 py-0.5 rounded text-zinc-500">Read-Only</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedActions).length === 0 && (
            <div className="py-12 text-center text-zinc-500 text-sm">
              No actions match your search criteria.
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
