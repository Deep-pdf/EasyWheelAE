import React, { useState, useEffect, useRef } from 'react';
import { Command } from '../../types/Command';
import { CategorySidebar } from '../CategorySidebar/CategorySidebar';
import { CommandCard } from './CommandCard';
import { MockCommandRegistry } from '../../services/MockCommandRegistry';

interface CommandPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (command: Command) => void;
  selectedCommandId: string | null;
}

export const CommandPicker: React.FC<CommandPickerProps> = ({
  isOpen,
  onClose,
  onSelectCommand,
  selectedCommandId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Filter commands based on search and category
  const filteredCommands = MockCommandRegistry.search(searchQuery, selectedCategory);

  // Reset focus index when results change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery, selectedCategory]);

  // Focus input on mount
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setSearchQuery('');
      setSelectedCategory('All');
    }
  }, [isOpen]);

  // Keyboard navigation within the picker
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const next = prev + 1;
        return next < filteredCommands.length ? next : prev;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const next = prev - 1;
        return next >= 0 ? next : -1;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredCommands.length) {
        onSelectCommand(filteredCommands[focusedIndex]);
      } else if (filteredCommands.length > 0) {
        onSelectCommand(filteredCommands[0]);
      }
    }
  };

  // Scroll focused card into view
  useEffect(() => {
    if (focusedIndex >= 0 && listContainerRef.current) {
      const children = listContainerRef.current.children;
      if (children[focusedIndex]) {
        (children[focusedIndex] as HTMLElement).scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [focusedIndex]);

  if (!isOpen) return null;

  return (
    <div className="picker-modal-overlay" onClick={onClose}>
      <div 
        className="picker-modal-content" 
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="picker-header">
          <div className="search-box-wrapper">
            <svg viewBox="0 0 24 24" className="search-icon">
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="picker-search-input"
              placeholder="Search command name, category, or description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="picker-close-btn" onClick={onClose} title="Close picker (Esc)">
            ✕
          </button>
        </div>

        <div className="picker-body">
          <CategorySidebar
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />

          <div className="picker-results-pane">
            <div className="results-count">
              Found {filteredCommands.length} commands
            </div>
            <div 
              className="picker-scroll-list" 
              ref={listContainerRef}
            >
              {filteredCommands.length > 0 ? (
                filteredCommands.map((command, idx) => (
                  <CommandCard
                    key={command.id}
                    command={command}
                    isSelected={command.id === selectedCommandId || idx === focusedIndex}
                    onSelect={() => onSelectCommand(command)}
                  />
                ))
              ) : (
                <div className="no-results-msg">
                  No commands match your filter criteria.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="picker-footer">
          <span className="kb-help">Press ↑↓ to navigate, Enter to select, Esc to close.</span>
        </div>
      </div>
    </div>
  );
};
