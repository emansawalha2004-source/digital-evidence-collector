import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader } from '../common/Loader';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader label="جاري التحقق من الجلسة..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
