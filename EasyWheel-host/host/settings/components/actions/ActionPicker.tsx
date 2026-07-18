import React, { useState, useMemo } from 'react';
import type { ActionDefinition } from '../../types';
import { SearchBar } from '../ui/SearchBar';
import { Modal } from '../ui/Modal';

interface ActionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  actions: ActionDefinition[];
  onSelect: (actionId: string) => void;
  currentActionId?: string;
}

export function ActionPicker({
  isOpen,
  onClose,
  actions,
  onSelect,
  currentActionId,
}: ActionPickerProps): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Extract unique categories from library
  const categories = useMemo(() => {
    const cats = new Set<string>();
    cats.add('All');
    actions.forEach((a) => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats);
  }, [actions]);

  // Filter actions based on category & search string
  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      const matchesCategory = selectedCategory === 'All' || action.category === selectedCategory;
      const matchesSearch =
        action.display_name.toLowerCase().includes(search.toLowerCase()) ||
        action.description.toLowerCase().includes(search.toLowerCase()) ||
        action.id.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [actions, selectedCategory, search]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Sector Action"
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search actions by name, description or ID..."
        />

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5 border-b border-zinc-800 pb-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-brand-primary/10 border-brand-primary text-brand-primary font-medium'
                  : 'bg-zinc-800/40 border-zinc-700/50 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1">
          {filteredActions.map((action) => {
            const isActive = action.id === currentActionId;
            return (
              <div
                key={action.id}
                onClick={() => {
                  onSelect(action.id);
                  onClose();
                }}
                className={`flex flex-col text-left p-3 rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-brand-primary/10 border-brand-primary shadow-sm'
                    : 'bg-zinc-950/30 border-zinc-800 hover:bg-zinc-800/40 hover:border-zinc-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-zinc-200 text-sm">{action.display_name}</span>
                  <span className="text-[9px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                    {action.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-2 min-h-[2rem]">
                  {action.description}
                </p>
                <span className="text-[10px] text-zinc-600 font-mono mt-2 select-all">
                  ID: {action.id}
                </span>
              </div>
            );
          })}

          {filteredActions.length === 0 && (
            <div className="col-span-full py-8 text-center text-zinc-500">
              No actions match your search.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
