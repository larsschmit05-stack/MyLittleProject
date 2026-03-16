'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import useFlowStore from '../../store/useFlowStore';

export default function EditorInitClient() {
  const searchParams = useSearchParams();
  const loadModel = useFlowStore((s) => s.loadModel);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) loadModel(id);
  }, [searchParams, loadModel]); // re-run when URL changes so switching ?id=A → ?id=B loads correctly

  return null;
}
