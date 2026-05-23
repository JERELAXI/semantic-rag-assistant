import { api } from './client';

export interface SettingsResponse {
  embedding_provider: string;
  embedding_dim: number;
  reranker_enabled: boolean;
}

export interface SettingsPatch {
  embedding_provider?: string;
  reranker_enabled?: boolean;
}

export const settingsApi = {
  get: () => api.get<SettingsResponse>('/settings'),
  patch: (patch: SettingsPatch) => api.patch<SettingsResponse>('/settings', patch),
};
