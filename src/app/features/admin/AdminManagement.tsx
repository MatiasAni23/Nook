import { useState } from "react";
import { Users, UserCog, Headphones, Calendar, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { AdminDelegates } from "./AdminDelegates";
import { AdminUsers } from "./AdminUsers";
import { AdminSupport } from "./AdminSupport";
import { AdminReservations } from "./AdminReservations";
import { AdminReports } from "./AdminReports";

export function AdminManagement() {
  const [activeTab, setActiveTab] = useState("delegates");

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-2xl mb-1" style={{ fontWeight: 700 }}>Gestión</h2>
            <p className="text-gray-600">Administra usuarios, delegados, soporte y reportes</p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5 bg-white">
              <TabsTrigger
                value="delegates"
                className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white"
              >
                <UserCog className="size-4 mr-2" />
                <span className="hidden sm:inline">Delegados</span>
              </TabsTrigger>
              <TabsTrigger
                value="users"
                className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white"
              >
                <Users className="size-4 mr-2" />
                <span className="hidden sm:inline">Usuarios</span>
              </TabsTrigger>
              <TabsTrigger
                value="support"
                className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white"
              >
                <Headphones className="size-4 mr-2" />
                <span className="hidden sm:inline">Soporte</span>
              </TabsTrigger>
              <TabsTrigger
                value="reservations"
                className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white"
              >
                <Calendar className="size-4 mr-2" />
                <span className="hidden sm:inline">Reservas</span>
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white"
              >
                <AlertTriangle className="size-4 mr-2" />
                <span className="hidden sm:inline">Reportes</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="delegates" className="mt-4">
              <AdminDelegates />
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <AdminUsers />
            </TabsContent>

            <TabsContent value="support" className="mt-4">
              <AdminSupport />
            </TabsContent>

            <TabsContent value="reservations" className="mt-4">
              <AdminReservations />
            </TabsContent>

            <TabsContent value="reports" className="mt-4">
              <AdminReports />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
