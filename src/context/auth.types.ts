import { User } from '@supabase/supabase-js';

export interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<User | null>;
  signUp: (email: string, password: string) => Promise<User | null>
  signOut: () => Promise<void>;
  loading: boolean;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}