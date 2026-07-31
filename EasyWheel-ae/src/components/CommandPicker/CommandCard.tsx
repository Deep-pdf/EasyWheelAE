import React from 'react';
import { Command } from '../../types/Command';

interface CommandCardProps {
  command: Command;
  isSelected: boolean;
  onSelect: () => void;
}

export const CommandCard: React.FC<CommandCardProps> = ({
  command,
  isSelected,
  onSelect
}) => {
  return (
    <div 
      className={`command-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="card-icon-area">
        <div className="adobe-icon-placeholder" data-category={command.category.toLowerCase()}>
          {command.name.substring(0, 2).toUpperCase()}
        </div>
      </div>
      <div className="card-info-area">
        <div className="card-header-line">
          <span className="card-command-name">{command.name}</span>
          <span className="card-command-category">{command.category}</span>
        </div>
        <div className="card-description">{command.description}</div>
      </div>
    </div>
  );
};
