import { DiscoverView } from "./DiscoverView";
import { WorkerDiscoverView } from "./WorkerDiscoverView";
import { useCurrentUser } from "../../context/CurrentUserContext";

const getUserRole = (): 'student' | 'worker' | 'admin' => {
  return (window as any).__userRole || 'student';
};

export function DiscoverWrapper() {
  const { currentUser } = useCurrentUser();
  const userRole = currentUser?.role ?? getUserRole();

  if (userRole === 'worker') {
    return <WorkerDiscoverView />;
  }

  // Default to student view
  return <DiscoverView />;
}
