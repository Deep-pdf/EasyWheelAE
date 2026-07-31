import React from 'react';

interface StatusBarProps {
  connectionStatus: string;
  bridgeVersion: string;
  registryVersion: string;
  lastRefresh: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  connectionStatus,
  bridgeVersion,
  registryVersion,
  lastRefresh
}) => {
  return (
    <div className="panel-status-bar">
      <div className="status-left">
        <span className={`status-dot ${connectionStatus.toLowerCase() === 'connected' ? 'connected' : 'disconnected'}`}></span>
        <span className="status-text">{connectionStatus}</span>
      </div>
      <div className="status-right">
        <span>Bridge: v{bridgeVersion}</span>
        <span className="status-sep">|</span>
        <span>Registry: v{registryVersion}</span>
        <span className="status-sep">|</span>
        <span>Refreshed: {lastRefresh}</span>
      </div>
    </div>
  );
};
