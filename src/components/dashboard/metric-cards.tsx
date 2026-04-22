import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, DollarSign, AlertTriangle, BookOpen } from "lucide-react";
import { Pedido, Libro } from "@/lib/types";

interface MetricCardsProps {
  pedidos: Pedido[];
  catalogo: Libro[];
}

export function MetricCards({ pedidos, catalogo }: MetricCardsProps) {
  const totalPedidos = pedidos.length;
  
  // Total Revenue: sum of all completed (Pagado/Entregado) orders
  const ingresos = pedidos
    .filter(p => p.estado === 'Pagado' || p.estado === 'Entregado')
    .reduce((acc, p) => {
      const val = parseFloat(p.total.replace(/[^0-9.-]+/g, ""));
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

  const stockCritico = catalogo.filter(l => l.stock > 0 && l.stock <= 5).length;
  const pendientes = pedidos.filter(p => p.estado === 'Pendiente').length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total pedidos</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPedidos}</div>
          <p className="text-xs text-muted-foreground">
            {pendientes} pendientes de atención
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ingresos (Pagados/Entregados)</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            S/ {ingresos.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            Basado en pedidos completados
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stock crítico</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stockCritico}</div>
          <p className="text-xs text-muted-foreground">
            Libros con 5 o menos unidades
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Catálogo activo</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {catalogo.filter(l => l.estado === 'Activo').length}
          </div>
          <p className="text-xs text-muted-foreground">
            De {catalogo.length} libros en total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
