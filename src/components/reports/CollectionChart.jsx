import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, parseISO, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { TrendingUp } from "lucide-react";

export default function CollectionChart({ logs, dateRange, period }) {
  const generateChartData = () => {
    let intervals;
    
    switch (period) {
      case "day":
        // Hourly breakdown for single day
        return Array.from({ length: 24 }, (_, hour) => {
          const count = logs.filter(log => {
            const logDate = parseISO(log.contact_date);
            return logDate.getHours() === hour;
          }).length;
          return {
            label: `${hour}:00`,
            gestiones: count
          };
        });
      
      case "week":
        intervals = eachDayOfInterval(dateRange);
        return intervals.map(date => {
          const count = logs.filter(log => {
            const logDate = parseISO(log.contact_date);
            return format(logDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
          }).length;
          return {
            label: format(date, "EEE", { locale: es }),
            gestiones: count
          };
        });
      
      case "month":
        intervals = eachWeekOfInterval(dateRange, { locale: es });
        return intervals.map((weekStart, idx) => {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          const count = logs.filter(log => {
            const logDate = parseISO(log.contact_date);
            return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
          }).length;
          
          return {
            label: `Sem ${idx + 1}`,
            gestiones: count
          };
        });
      
      default:
        return [];
    }
  };

  const data = generateChartData();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-slate-400" />
          <CardTitle className="text-lg">Actividad de gestiones</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#94a3b8"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "#fff", 
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontSize: "12px"
              }}
            />
            <Line 
              type="monotone" 
              dataKey="gestiones" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}