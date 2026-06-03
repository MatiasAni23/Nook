import { ProfileView } from "./ProfileView";
import { WorkerProfileView } from "./WorkerProfileView";
import { useCurrentUser } from "../../context/CurrentUserContext";

const getUserRole = (): 'student' | 'worker' | 'admin' => {
  return (window as any).__userRole || 'student';
};

export function ProfileWrapper() {
  const { currentUser } = useCurrentUser();
  const userRole = currentUser?.role ?? getUserRole();

  if (userRole === 'worker') {
    return <WorkerProfileView />;
  }

  // Default to student view
  return <ProfileView />;
}
