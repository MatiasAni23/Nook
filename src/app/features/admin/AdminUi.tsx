import type { ReactNode } from "react";
import { Building2, UsersRound, RefreshCw } from "lucide-react";

export const placeTypeLabels = {
  library: "Biblioteca",
  cafe: "Cafetería",
  coworking: "Cowork",
  office: "Oficina",
  meeting_room: "Sala de reunión",
  private_office: "Oficina privada",
  park: "Parque",
};
export const planLabels = {
  basic: "Básico",
  app_billing: "Cobro en la app",
  basic_premium: "Premium",
  host_billing: "Cobro del anfitrión",
};

export function AdminPageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="admin-heading-action">{action}</div>}
    </div>
  );
}
export function AdminMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <div className="admin-metric">
      <p>{label}</p>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </div>
  );
}
export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-empty">
      <Building2 size={26} strokeWidth={1.3} aria-hidden="true" />
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

export function ManagementSectionHeading({
  title,
  description,
  count,
  action,
}: {
  title: string;
  description: string;
  count: number;
  action?: ReactNode;
}) {
  return (
    <div className="management-section-heading">
      <div>
        <div className="flex items-center gap-2">
          <h2>{title}</h2>
          <span className="management-count">{count}</span>
        </div>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ManagementAvatar({
  name,
  tone = "violet",
}: {
  name: string;
  tone?: "violet" | "sage";
}) {
  return (
    <span className={`management-avatar tone-${tone}`} aria-hidden="true">
      {name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "P"}
    </span>
  );
}

export function ManagementEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="management-empty">
      <span>
        <UsersRound size={24} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function ManagementDataNotice({
  error,
  isRefreshing,
  onRetry,
}: {
  error: string;
  isRefreshing: boolean;
  onRetry: () => void;
}) {
  if (!error && !isRefreshing) return null;
  return (
    <div
      className={`admin-notice management-data-notice ${error ? "is-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <span>
        {error || "Actualizando los datos; puedes seguir consultando la vista."}
      </span>
      {error && (
        <button type="button" disabled={isRefreshing} onClick={onRetry}>
          <RefreshCw size={14} /> Reintentar
        </button>
      )}
    </div>
  );
}

export function normalizeAdminSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
