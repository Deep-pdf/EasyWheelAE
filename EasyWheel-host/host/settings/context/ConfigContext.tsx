import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppConfig, GlobalSettings, Profile } from '../types';
import { getConfig, saveConfig, reloadConfig as ipcReloadConfig } from '../../ipc/settings';

export type SettingsPage = 'general' | 'profiles' | 'actions' | 'appearance' | 'about';

interface ConfigContextProps {
  config: AppConfig | null;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  activePage: SettingsPage;
  setActivePage: (page: SettingsPage) => void;
  updateGlobal: (global: Partial<GlobalSettings>) => void;
  addProfile: (profile: Profile) => boolean;
  updateProfile: (name: string, updated: Partial<Profile>) => boolean;
  deleteProfile: (name: string) => void;
  saveChanges: () => Promise<boolean>;
  reload: () => Promise<void>;
  clearError: () => void;
}

const ConfigContext = createContext<ConfigContextProps | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<AppConfig | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<SettingsPage>('general');

  // Load configuration on mount
  const fetchConfig = useCallback(async () => {
    try {
      const data = await getConfig();
      setConfig(data);
      setOriginalConfig(JSON.parse(JSON.stringify(data)));
      setDirty(false);
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Failed to load configuration: ${msg}`);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Check if current config differs from original config
  useEffect(() => {
    if (config && originalConfig) {
      const isDifferent = JSON.stringify(config) !== JSON.stringify(originalConfig);
      setDirty(isDifferent);
    } else {
      setDirty(false);
    }
  }, [config, originalConfig]);

  const updateGlobal = useCallback((updatedFields: Partial<GlobalSettings>) => {
    setConfig((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        global: {
          ...prev.global,
          ...updatedFields,
        },
      };
    });
  }, []);

  const addProfile = useCallback((profile: Profile): boolean => {
    let success = false;
    setConfig((prev) => {
      if (!prev) return null;

      // Duplicate profile check
      const exists = prev.profiles.some(
        (p) => p.name.toLowerCase() === profile.name.toLowerCase()
      );
      if (exists) {
        setError(`Profile "${profile.name}" already exists.`);
        return prev;
      }

      success = true;
      setError(null);
      return {
        ...prev,
        profiles: [...prev.profiles, profile],
      };
    });
    return success;
  }, []);

  const updateProfile = useCallback((name: string, updatedFields: Partial<Profile>): boolean => {
    let success = false;
    setConfig((prev) => {
      if (!prev) return null;

      // Name rename conflict check
      if (updatedFields.name && updatedFields.name.toLowerCase() !== name.toLowerCase()) {
        const nameConflict = prev.profiles.some(
          (p) => p.name.toLowerCase() === updatedFields.name?.toLowerCase()
        );
        if (nameConflict) {
          setError(`A profile with name "${updatedFields.name}" already exists.`);
          return prev;
        }
      }

      success = true;
      setError(null);
      return {
        ...prev,
        profiles: prev.profiles.map((p) => {
          if (p.name.toLowerCase() === name.toLowerCase()) {
            return {
              ...p,
              ...updatedFields,
            };
          }
          return p;
        }),
      };
    });
    return success;
  }, []);

  const deleteProfile = useCallback((name: string) => {
    setConfig((prev) => {
      if (!prev) return null;
      // Cannot delete Desktop profile
      if (name.toLowerCase() === 'desktop') {
        setError('The default Desktop profile cannot be deleted.');
        return prev;
      }
      setError(null);
      return {
        ...prev,
        profiles: prev.profiles.filter((p) => p.name.toLowerCase() !== name.toLowerCase()),
      };
    });
  }, []);

  const saveChanges = useCallback(async (): Promise<boolean> => {
    if (!config) return false;
    setSaving(true);
    setError(null);
    try {
      await saveConfig(config);
      setOriginalConfig(JSON.parse(JSON.stringify(config)));
      setDirty(false);
      setSaving(false);
      return true;
    } catch (e: unknown) {
      const msg = typeof e === 'string' ? e : e instanceof Error ? e.message : String(e);
      setError(msg);
      setSaving(false);
      return false;
    }
  }, [config]);

  const reload = useCallback(async () => {
    try {
      await ipcReloadConfig();
      await fetchConfig();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Failed to reload configuration: ${msg}`);
    }
  }, [fetchConfig]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ConfigContext.Provider
      value={{
        config,
        dirty,
        saving,
        error,
        activePage,
        setActivePage,
        updateGlobal,
        addProfile,
        updateProfile,
        deleteProfile,
        saveChanges,
        reload,
        clearError,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextProps {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}
