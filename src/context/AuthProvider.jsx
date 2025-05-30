import { useState, useEffect } from 'react';
import { supabase } from '../utils/Supabase';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Fetch initial user state and set up auth listener
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user || null);
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Optional: Add other auth methods you might need
  const value = {
    user,
    setUser,
    // Add other methods like signIn, signOut, etc.
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}