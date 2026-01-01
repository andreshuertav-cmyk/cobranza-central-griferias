import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";

export default function TopCollectorsTable({ logs }) {
  // Group by user (created_by)
  const collectorStats = logs.reduce((acc, log) => {
    const collector = log.created_by || "Sin asignar";
    
    if (!acc[collector]) {
      acc[collector] = {
        name: collector,
        totalContacts: 0,
        successful: 0,
        promises: 0,
        payments: 0,
        promisedAmount: 0
      };
    }
    
    acc[collector].totalContacts++;
    
    if (log.result === "contactado" || log.result === "promesa_pago" || log.result === "pago_realizado") {
      acc[collector].successful++;
    }
    
    if (log.result === "promesa_pago") {
      acc[collector].promises++;
      acc[collector].promisedAmount += log.promised_amount || 0;
    }
    
    if (log.result === "pago_realizado") {
      acc[collector].payments++;
    }
    
    return acc;
  }, {});

  const topCollectors = Object.values(collectorStats)
    .sort((a, b) => b.totalContacts - a.totalContacts)
    .slice(0, 5);

  if (topCollectors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-slate-400" />
            <CardTitle className="text-lg">Desempeño por gestor</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center py-8 text-slate-500 text-sm">
          Sin datos en este período
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-slate-400" />
          <CardTitle className="text-lg">Desempeño por gestor</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gestor</TableHead>
              <TableHead className="text-center">Contactos</TableHead>
              <TableHead className="text-center">Exitosos</TableHead>
              <TableHead className="text-center">Promesas</TableHead>
              <TableHead className="text-center">Pagos</TableHead>
              <TableHead className="text-right">Monto prometido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topCollectors.map((collector, idx) => {
              const successRate = collector.totalContacts > 0 
                ? Math.round((collector.successful / collector.totalContacts) * 100)
                : 0;
              
              return (
                <TableRow key={collector.name}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {idx === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                      <div>
                        <p className="font-medium text-sm">{collector.name}</p>
                        <p className="text-xs text-slate-500">{successRate}% efectividad</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {collector.totalContacts}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      {collector.successful}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {collector.promises}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {collector.payments}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${collector.promisedAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}