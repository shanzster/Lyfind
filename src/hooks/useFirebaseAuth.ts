import { useAuth } from '@/contexts/AuthContext';

export function useFirebaseAuth() {
  return useAuth();
}
