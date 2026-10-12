import { useEffect, useState } from "react";
import { getEmailCooldownSeconds } from "../../services/authAttemptService";

export function useEmailCooldown(email: string) {
  const [seconds, setSeconds] = useState(() => getEmailCooldownSeconds(email));
  useEffect(() => {
    const update = () => setSeconds(getEmailCooldownSeconds(email));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [email]);
  return seconds;
}
