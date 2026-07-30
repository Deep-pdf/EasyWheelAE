import React, { useState, useEffect, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Modal } from '../ui/Modal';

export interface AECommand {
  id: string;
  name: string;
  category: string;
  type: string;
  commandId: number;
  description: string;
}

interface CommandPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (cmdId: string) => void;
  currentCommandId: string | null;
}

// Memory cache to load commands once per app execution
let cachedCommands: AECommand[] | null = null;

export function CommandPicker({
  isOpen,
  onClose,
  onSelectCommand,
  currentCommandId,
}: CommandPickerProps): React.JSX.Element {
  const [commands, setCommands] = useState<AECommand[]>([]);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Load and cache After Effects commands
  useEffect(() => {
    if (!isOpen) return;

    if (cachedCommands) {
      setCommands(cachedCommands);
      return;
    }

    setLoading(true);
    invoke<AECommand[]>('get_command_registry')
      .then((data) => {
        cachedCommands = data;
        setCommands(data);
      })
      .catch((err) => {
        console.error('Failed to load command registry:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  // Focus the search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter commands by name, category, or description
  const filteredCommands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [commands, search]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = itemRefs.current[selectedIndex];
    if (activeEl && listRef.current) {
      const container = listRef.current;
      const top = activeEl.offsetTop;
      const bottom = top + activeEl.offsetHeight;
      const viewTop = container.scrollTop;
      const viewBottom = viewTop + container.offsetHeight;

      if (top < viewTop) {
        container.scrollTop = top;
      } else if (bottom > viewBottom) {
        container.scrollTop = bottom - container.offsetHeight;
      }
    }
  }, [selectedIndex]);

  // Handle keydown navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredCommands.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        onSelectCommand(selected.id);
        onClose();
      }
    }
  };

  const handleSelectItem = (cmd: AECommand) => {
    onSelectCommand(cmd.id);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign After Effects Command"
      size="lg"
    >
      <div className="flex flex-col gap-4 text-left">
        {/* Search Input bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-10 pr-10 py-3 bg-zinc-950/80 border border-zinc-800 focus:border-brand-primary rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all duration-150 shadow-inner"
            placeholder="Search by name, category, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto max-h-[50vh] pr-1 space-y-1"
        >
          {loading ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Loading command registry...
            </div>
          ) : filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              const isCurrentlyAssigned = cmd.id === currentCommandId;
              
              return (
                <button
                  key={cmd.id}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  onClick={() => handleSelectItem(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-primary/10 border-brand-primary/60 text-zinc-100 shadow-sm'
                      : isCurrentlyAssigned
                      ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-200'
                      : 'bg-transparent border-transparent hover:bg-zinc-900/20 hover:border-zinc-800/40 text-zinc-400'
                  }`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 flex-shrink-0 text-sm ${isSelected ? 'text-brand-primary' : 'text-zinc-600'}`}>
                    ⭐
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span className={`font-semibold text-sm truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>
                        {cmd.name}
                      </span>
                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded border ${
                        isSelected 
                          ? 'bg-brand-primary/20 border-brand-primary/30 text-brand-primary' 
                          : 'bg-zinc-850 border-zinc-800 text-zinc-500'
                      }`}>
                        {cmd.category}
                      </span>
                    </div>
                    {cmd.description && (
                      <p className={`text-xs mt-0.5 line-clamp-1 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {cmd.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-12 text-center text-zinc-500 text-sm">
              No matching commands found.
            </div>
          )}
        </div>

        {/* Footer instructions */}
        <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-800/50 pt-3 select-none">
          <div className="flex gap-3">
            <span><kbd className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 mr-1">↑↓</kbd> Navigate</span>
            <span><kbd className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 mr-1">Enter</kbd> Select</span>
            <span><kbd className="bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 mr-1">Esc</kbd> Close</span>
          </div>
          {filteredCommands.length > 0 && (
            <span>
              {selectedIndex + 1} of {filteredCommands.length} command{filteredCommands.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
