import { RouterProvider } from 'react-router';
import { CurrentUserProvider } from './context/CurrentUserContext';
import { router } from './routes';
import { useEffect } from 'react';
import { applyRouteMetadata } from './seo/routeMetadata';
import { startNativeRuntime } from './mobile/nativeRuntime';

export default function App() {
  useEffect(() => startNativeRuntime({
    navigate: destination => {
      if (typeof destination === 'number') void router.navigate(destination);
      else void router.navigate(destination);
    },
  }), []);
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
