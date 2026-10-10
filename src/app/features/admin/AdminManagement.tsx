import { useSearchParams } from "react-router";
import { Users, UserCog, Headphones, Calendar, Flag } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { AdminDelegates } from "./AdminDelegates";
import { AdminUsers } from "./AdminUsers";
import { AdminSupport } from "./AdminSupport";
import { AdminReservations } from "./AdminReservations";
import { AdminReports } from "./AdminReports";
import { AdminPageHeading } from "./AdminUi";

const sections = [
  {
    value: "delegates",
    label: "Delegados",
    description: "Personas y lugares",
    tone: "violet",
    icon: UserCog,
    Component: AdminDelegates,
  },
  {
    value: "users",
    label: "Usuarios",
    description: "Cuentas de la comunidad",
    tone: "sage",
    icon: Users,
    Component: AdminUsers,
  },
  {
    value: "support",
    label: "Soporte",
    description: "Consultas y ayuda",
    tone: "blue",
    icon: Headphones,
    Component: AdminSupport,
  },
  {
    value: "reservations",
    label: "Reservas",
    description: "Solicitudes de espacios",
    tone: "sand",
    icon: Calendar,
    Component: AdminReservations,
  },
  {
    value: "reports",
    label: "Reportes",
    description: "Incidencias de lugares",
    tone: "rose",
    icon: Flag,
    Component: AdminReports,
  },
];

export function AdminManagement() {
  const [params, setParams] = useSearchParams();
  const activeTab = sections.some(
    (section) => section.value === params.get("tab"),
  )
    ? params.get("tab")!
    : "delegates";
  return (
    <div>
      <AdminPageHeading
        title="Gestión"
        description="Personas, solicitudes y seguimiento de la comunidad."
      />
      <Tabs
        value={activeTab}
        onValueChange={(value) => setParams({ tab: value }, { replace: true })}
      >
        <TabsList
          className="management-section-nav"
          aria-label="Secciones de gestión"
        >
          {sections.map(({ value, label, description, tone, icon: Icon }) => (
            <TabsTrigger key={value} value={value} aria-label={label}>
              <span className={`management-section-icon tone-${tone}`}>
                <Icon size={19} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map(({ value, Component }) => (
          <TabsContent
            key={value}
            value={value}
            className="admin-management-content management-workbench"
          >
            {(value === "support" || value === "reservations") && (
              <div className="admin-notice mb-5">
                Esta sección muestra datos de ejemplo. Sus acciones todavía no
                realizan cambios reales.
              </div>
            )}
            <Component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
