import { useEffect } from 'react';
import useModelAccessStore from '../store/useModelAccessStore';
import type { AccessRole } from '../types/modelAccess';

interface UseModelAccessReturn {
  role: AccessRole | null;
  isLoading: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
  isOwner: boolean;
}

export function useModelAccess(modelId: string | null): UseModelAccessReturn {
  const currentModelId = useModelAccessStore((s) => s.currentModelId);
  const currentUserRole = useModelAccessStore((s) => s.currentUserRole);
  const isLoadingAccess = useModelAccessStore((s) => s.isLoadingAccess);
  const fetchUserAccess = useModelAccessStore((s) => s.fetchUserAccess);

  useEffect(() => {
    if (modelId && modelId !== currentModelId) {
      fetchUserAccess(modelId);
    }
  }, [modelId, currentModelId, fetchUserAccess]);

  const role = currentUserRole;

  return {
    role,
    isLoading: isLoadingAccess,
    canView: role != null,
    canEdit: role === 'owner' || role === 'edit',
    canDelete: role === 'owner',
    canShare: role === 'owner',
    isOwner: role === 'owner',
  };
}
