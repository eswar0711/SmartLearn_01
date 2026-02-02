import { useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

const AuthListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, session?.user?.user_metadata);
        
        if (event === 'PASSWORD_RECOVERY') {
          navigate('/reset-password', { replace: true });
        } else if (event === 'SIGNED_IN' && window.location.pathname === '/reset-password') {
          // Prevent logged-in users from accessing reset page directly
          navigate('/dashboard', { replace: true });
        } else if (event === 'SIGNED_OUT') {
          if (window.location.pathname === '/reset-password') {
            navigate('/login', { replace: true });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
};

export default AuthListener;