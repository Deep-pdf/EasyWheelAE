import React from 'react';
import { Command } from '../../types/Command';

interface CommandDetailsProps {
  selectedSectorIndex: number | null;
  assignedCommand: Command | null;
  onAssignClick: () => void;
  onClearClick: () => void;
  onResetClick: () => void;
}

export const CommandDetails: React.FC<CommandDetailsProps> = ({
  selectedSectorIndex,
  assignedCommand,
  onAssignClick,
  onClearClick,
  onResetClick
}) => {
  if (selectedSectorIndex === null) {
    return (
      <div className="command-details-container empty">
        <div className="section-title">Command Details</div>
        <div className="no-selection-msg">
          Select a sector on the wheel preview to view and edit details.
        </div>
      </div>
    );
  }

  return (
    <div className="command-details-container">
      <div className="section-title">Command Details</div>
      <div className="details-header-row">
        <span className="sector-number-badge">Sector {selectedSectorIndex + 1}</span>
      </div>
      
      <div className="details-grid">
        <div className="details-field">
          <span className="field-label">Assigned Command</span>
          <span className={`field-value ${assignedCommand ? 'has-val' : 'no-val'}`}>
            {assignedCommand ? assignedCommand.name : 'Empty'}
          </span>
        </div>
        
        <div className="details-field">
          <span className="field-label">Category</span>
          <span className="field-value">
            {assignedCommand ? assignedCommand.category : '—'}
          </span>
        </div>

        <div className="details-field full-width">
          <span className="field-label">Description</span>
          <span className="field-description">
            {assignedCommand ? assignedCommand.description : 'No command assigned to this sector.'}
          </span>
        </div>

        <div className="details-field">
          <span className="field-label">Execution Type</span>
          <span className="field-value-badge">Native</span>
        </div>
      </div>

      <div className="details-actions">
        <div className="actions-row">
          <button 
            className="details-btn btn-primary"
            onClick={onAssignClick}
          >
            Assign Command
          </button>
          <button 
            className="details-btn btn-secondary"
            onClick={onClearClick}
            disabled={!assignedCommand}
          >
            Clear Command
          </button>
        </div>
        <div className="actions-row">
          <button 
            className="details-btn btn-secondary"
            onClick={onResetClick}
          >
            Reset to Default
          </button>
          <button 
            className="details-btn btn-save"
            disabled
            title="Save Changes (Disabled - Phase 2)"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
