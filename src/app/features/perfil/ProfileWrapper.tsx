import { ProfileView } from "./ProfileView";
import { WorkerProfileView } from "./WorkerProfileView";

const getUserRole = (): 'student' | 'worker' | 'admin' => {
  return (window as any).__userRole || 'student';
};

export function ProfileWrapper() {
  const userRole = getUserRole();

  if (userRole === 'worker') {
    return <WorkerProfileView />;
  }

  // Default to student view
  return <ProfileView />;
}
