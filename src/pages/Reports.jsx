import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  ArrowLeft, Home, BarChart3, Users, DollarSign, Calendar, 
  TrendingUp, FileText, CreditCard, ClipboardList, ChevronRight, CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Reports() {
  const reportCards = [
    {
      title: "Resumen de Actividad",
      description: "Métricas generales, gráficos de actividad y cobranza",
      icon: BarChart3,
      color: "bg-blue-500",
      page: "ActivityReport"
    },
    {
      title: "Gestiones por Cliente",
      description: "Detalle de contactos y gestiones realizadas",
      icon: Users,
      color: "bg-purple-500",
      page: "ClientManagementReport"
    },
    {
      title: "Métodos de Pago",
      description: "Estadísticas de pagos por método",
      icon: CreditCard,
      color: "bg-green-500",
      page: "PaymentMethodsReport"
    },
    {
      title: "Promesas de Pago",
      description: "Seguimiento de promesas pendientes y cumplidas",
      icon: Calendar,
      color: "bg-amber-500",
      page: "PromisesReport"
    },
    {
      title: "Consolidado de Promesas",
      description: "Vista consolidada de promesas por período",
      icon: ClipboardList,
      color: "bg-indigo-500",
      page: "ConsolidatedPromisesReport"
    },
    {
      title: "Gestión de Pagos",
      description: "Pagos con gestión vs pagos sin gestión",
      icon: CheckCircle2,
      color: "bg-teal-500",
      page: "PaymentManagementReport"
    },
    {
      title: "Reporte por Vendedor",
      description: "Análisis de cartera por vendedor",
      icon: TrendingUp,
      color: "bg-cyan-500",
      page: "SalesRepReport"
    },
    {
      title: "Facturas Factorizadas",
      description: "Documentos en proceso de factoraje",
      icon: FileText,
      color: "bg-orange-500",
      page: "FactorizedReport"
    },
    {
      title: "Resumen Diario de Promesas",
      description: "Promesas consolidadas por día",
      icon: DollarSign,
      color: "bg-rose-500",
      page: "DailyPromisesReport"
    },
    {
      title: "Gestiones Detalladas por Cliente",
      description: "Vista matricial de todas las gestiones por cliente",
      icon: ClipboardList,
      color: "bg-violet-500",
      page: "DetailedManagementReport"
    },
    {
      title: "Historial de Pagos",
      description: "Fecha, medio de pago y documentos pagados",
      icon: CreditCard,
      color: "bg-emerald-600",
      page: "PaymentHistoryReport"
    },
    {
      title: "Auditoría de Cobros",
      description: "Verifica y compara el total cobrado entre documentos y registros de gestión",
      icon: CheckCircle2,
      color: "bg-red-600",
      page: "AuditReport"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="h-12 w-12">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="h-12 w-12">
              <Home className="h-6 w-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reportes de Cobranza</h1>
            <p className="text-slate-500 mt-1">Selecciona el reporte que deseas consultar</p>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map((report) => {
            const Icon = report.icon;
            return (
              <Link key={report.page} to={createPageUrl(report.page)}>
                <Card className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group h-full">
                  <div className="flex items-start gap-4">
                    <div className={`${report.color} p-3 rounded-lg text-white shrink-0`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {report.title}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {report.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}