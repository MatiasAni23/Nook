import { DiscoverView } from "./DiscoverView";
import { WorkerDiscoverView } from "./WorkerDiscoverView";

const getUserRole = (): 'student' | 'worker' | 'admin' => {
  return (window as any).__userRole || 'student';
};

export function DiscoverWrapper() {
  const userRole = getUserRole();

  if (userRole === 'worker') {
    return <WorkerDiscoverView />;
  }

  // Default to student view
  return <DiscoverView />;
}
