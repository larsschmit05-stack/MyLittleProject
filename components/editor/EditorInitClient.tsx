'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useFlowStore from '../../store/useFlowStore';
import useModelAccessStore from '../../store/useModelAccessStore';

export default function EditorInitClient() {
  const searchParams = useSearchParams();
  const loadModel = useFlowStore((s) => s.loadModel);
  const clearAccessState = useModelAccessStore((s) => s.clearAccessState);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      loadModel(id);
    } else {
      // Creating new model — clear access state
      clearAccessState();
    }
  }, [searchParams, loadModel, clearAccessState]);

  return null;
}
