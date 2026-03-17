'use client';

import { Suspense } from 'react';
import EditorLayout from '@/components/editor/EditorLayout';
import EditorInitClient from '@/components/editor/EditorInitClient';

export default function EditorPage() {
  return (
    <>
      <Suspense>
        <EditorInitClient />
      </Suspense>
      <EditorLayout />
    </>
  );
}
