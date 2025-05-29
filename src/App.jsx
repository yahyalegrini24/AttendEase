import AppRoutes from './routes/AppRoutes';
import  AuthProvider  from '../src/context/AuthProvider';

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
