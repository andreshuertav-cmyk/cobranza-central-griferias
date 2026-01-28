import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SalesRepReport from "@/components/reports/SalesRepReport";

export default function SalesRepReportPage() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list()
  });

  const isLoading = loadingClients || loadingDocuments;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl("Reports")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reporte por Vendedor</h1>
            <p className="text-slate-500 mt-1">Análisis de cartera por vendedor</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <SalesRepReport documents={documents} clients={clients} />
        )}
      </div>
    </div>
  );
}