import { supabase } from '../../utils/Supabase';
import { useNavigate } from 'react-router-dom';

 export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-red-600 text-white rounded">
      Logout
    </button>
  );
}
