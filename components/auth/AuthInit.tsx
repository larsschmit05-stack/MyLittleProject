'use client';
import { useEffect } from 'react';
import useAuthStore from '@/store/useAuthStore';

export default function AuthInit() {
  useEffect(() => {
    useAuthStore.getState().initAuth();
  }, []);
  return null;
}
