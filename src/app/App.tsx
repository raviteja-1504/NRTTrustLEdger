import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { TenantProvider } from '../lib/tenant/TenantContext';
import { AuthProvider } from '../lib/auth/AuthContext';

export default function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </TenantProvider>
  );
}
