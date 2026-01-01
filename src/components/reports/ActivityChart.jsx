import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Activity } from "lucide-react";

const COLORS = {
  llamada: "#3b82f6",
  visita: "#8b5cf6",
  mensaje: "#ec4899",
  correo: "#10b981",
  whatsapp: "#22c55e"
};

const RESULT_COLORS = {
  contactado: "#10b981",
  promesa_pago: "#3b82f6",
  pago_realizado: "#22c55e",
  no_contesto: "#94a3b8",
  rechaza_pago: "#ef4444",
  numero_equivocado: "#f59e0b",
  otro: "#64748b"
};

const LABELS = {
  llamada: "Llamadas",
  visita: "Visitas",
  mensaje: "Mensajes",
  correo: "Correos",
  whatsapp: "WhatsApp",
  contactado: "Contactado",
  promesa_pago: "Promesa",
  pago_realizado: "Pago",
  no_contesto: "No contestó",
  rechaza_pago: "Rechazó",
  numero_equivocado: "Número erróneo",
  otro: "Otro"
};

export default function ActivityChart({ contactsByType, resultsByType }) {
  const contactData = Object.entries(contactsByType).map(([key, value]) => ({
    name: LABELS[key] || key,
    value
  }));

  const resultData = Object.entries(resultsByType).map(([key, value]) => ({
    name: LABELS[key] || key,
    value
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-slate-400" />
          <CardTitle className="text-lg">Desglose de actividad</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-500 text-center mb-2 font-medium">Tipos de contacto</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={contactData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {contactData.map((entry, index) => {
                    const key = Object.keys(contactsByType)[index];
                    return <Cell key={`cell-${index}`} fill={COLORS[key] || "#94a3b8"} />;
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    fontSize: "12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="text-xs text-slate-500 text-center mb-2 font-medium">Resultados</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={resultData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {resultData.map((entry, index) => {
                    const key = Object.keys(resultsByType)[index];
                    return <Cell key={`cell-${index}`} fill={RESULT_COLORS[key] || "#94a3b8"} />;
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    fontSize: "12px",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {contactData.map((item, idx) => {
            const key = Object.keys(contactsByType)[idx];
            return (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[key] || "#94a3b8" }}
                />
                <span className="text-slate-600">{item.name}: {item.value}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}