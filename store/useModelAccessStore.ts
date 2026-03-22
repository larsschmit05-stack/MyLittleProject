import { create } from 'zustand';
import type { AccessListItem, AccessRole, AccessListResponse } from '../types/modelAccess';

interface ModelAccessState {
  currentModelId: string | null;
  currentUserRole: AccessRole | null;
  accessList: AccessListItem[];
  isLoadingAccess: boolean;
  accessError: string | null;
  isInviting: boolean;
  inviteError: string | null;
  inviteSuccess: string | null;
}

interface ModelAccessActions {
  fetchUserAccess: (modelId: string) => Promise<void>;
  fetchAccessList: (modelId: string) => Promise<void>;
  inviteUser: (modelId: string, email: string, role: 'edit' | 'view') => Promise<void>;
  revokeAccess: (modelId: string, userId: string) => Promise<void>;
  cancelInvite: (modelId: string, email: string) => Promise<void>;
  resendInvite: (modelId: string, token: string) => Promise<void>;
  clearAccessState: () => void;
  clearInviteMessages: () => void;
}

type ModelAccessStore = ModelAccessState & ModelAccessActions;

const useModelAccessStore = create<ModelAccessStore>((set, get) => ({
  currentModelId: null,
  currentUserRole: null,
  accessList: [],
  isLoadingAccess: false,
  accessError: null,
  isInviting: false,
  inviteError: null,
  inviteSuccess: null,

  fetchUserAccess: async (modelId: string) => {
    set({ isLoadingAccess: true, accessError: null, currentModelId: modelId });
    try {
      const res = await fetch(`/api/models/${modelId}/access`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed to fetch access (${res.status})`);
      }
      const data: AccessListResponse = await res.json();
      set({
        currentUserRole: data.currentUserRole,
        accessList: data.accessList,
        isLoadingAccess: false,
      });
    } catch (err) {
      set({
        isLoadingAccess: false,
        accessError: (err as Error).message,
        currentUserRole: null,
        accessList: [],
      });
    }
  },

  fetchAccessList: async (modelId: string) => {
    // Same endpoint, but explicitly refreshes the list
    await get().fetchUserAccess(modelId);
  },

  inviteUser: async (modelId: string, email: string, role: 'edit' | 'view') => {
    set({ isInviting: true, inviteError: null, inviteSuccess: null });
    try {
      const res = await fetch(`/api/models/${modelId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to send invite');
      }
      set({ isInviting: false, inviteSuccess: `Invite sent to ${email}` });
      // Refresh access list
      await get().fetchAccessList(modelId);
    } catch (err) {
      set({ isInviting: false, inviteError: (err as Error).message });
    }
  },

  revokeAccess: async (modelId: string, userId: string) => {
    try {
      const res = await fetch(`/api/models/${modelId}/access/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to revoke access');
      }
      // Refresh access list
      await get().fetchAccessList(modelId);
    } catch (err) {
      set({ accessError: (err as Error).message });
    }
  },

  cancelInvite: async (modelId: string, email: string) => {
    try {
      const res = await fetch(`/api/models/${modelId}/cancel-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to cancel invite');
      }
      await get().fetchAccessList(modelId);
    } catch (err) {
      set({ accessError: (err as Error).message });
    }
  },

  resendInvite: async (modelId: string, token: string) => {
    try {
      const res = await fetch(`/api/invites/${token}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to resend invite');
      }
      // Refresh access list
      await get().fetchAccessList(modelId);
    } catch (err) {
      set({ accessError: (err as Error).message });
    }
  },

  clearAccessState: () =>
    set({
      currentModelId: null,
      currentUserRole: null,
      accessList: [],
      isLoadingAccess: false,
      accessError: null,
      isInviting: false,
      inviteError: null,
      inviteSuccess: null,
    }),

  clearInviteMessages: () =>
    set({ inviteError: null, inviteSuccess: null }),
}));

export default useModelAccessStore;
