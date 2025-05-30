import { useState, useEffect } from 'react';
import { supabase } from '../utils/Supabase';
import { AuthContext } from './AuthContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchAndSetUser = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (error || !authUser) {
          setUser(null);
          return;
        }

        // Fetch user data from database (e.g., Teacher table)
        const { data: teacherData, error: teacherError } = await supabase
          .from('Teacher')
          .select('*')
          .eq('teacherId', authUser.id)
          .single();

        if (teacherError) {
          console.error('Error fetching teacher data:', teacherError);
          setUser(null);
          return;
        }

        // Set the database user (and optionally attach auth data)
        setUser({
          ...teacherData,
          email: authUser.email,
          auth: authUser, // Optional: for access token/session if needed
        });

      } catch (err) {
        console.error('Auth initialization error:', err);
        setUser(null);
      }
    };

    fetchAndSetUser();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        // Re-fetch DB user when login/logout occurs
        fetchAndSetUser();
      } else {
        setUser(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
