import { RouterProvider } from 'react-router';
import { CurrentUserProvider } from './context/CurrentUserContext';
import { router } from './routes';
import { useEffect } from 'react';
import { applyRouteMetadata } from './seo/routeMetadata';

export default function App() {
  useEffect(() => {
    applyRouteMetadata(router.state.location.pathname);
    return router.subscribe(state => applyRouteMetadata(state.location.pathname));
  }, []);
  return (
    <CurrentUserProvider>
      <RouterProvider router={router} />
    </CurrentUserProvider>
  );
}
