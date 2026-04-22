import { useState, useEffect, useCallback } from 'react';
import { MetricCards } from './metric-cards';
import { TablaPedidos } from './tabla-pedidos';
import { CatalogoView } from './catalogo-view';
import { Pedido, Libro } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardShellProps {
  token: string;
  onLogout: () => void;
}

export function DashboardShell({ token, onLogout }: DashboardShellProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [catalogo, setCatalogo] = useState<Libro[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/data?token=${encodeURIComponent(token)}`);
      if (res.status === 401) {
        toast.error('Sesión expirada o token inválido');
        onLogout();
        return;
      }
      if (!res.ok) throw new Error('Error al obtener datos');

      const data = await res.json();
      // Reverse array to show newest orders first
      setPedidos((data.pedidos || []).reverse());
      setCatalogo(data.catalogo || []);
    } catch (error) {
      toast.error('No se pudieron cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="secondary" size="sm" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pedidos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pedidos">Gestión de Pedidos</TabsTrigger>
          <TabsTrigger value="catalogo">Catálogo e Inventario</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-4">
          <MetricCards pedidos={pedidos} catalogo={catalogo} />
          {isLoading ? (
            <div className="h-[400px] w-full animate-pulse rounded-md bg-muted/50" />
          ) : (
            <TablaPedidos pedidos={pedidos} token={token} onRefresh={fetchData} />
          )}
        </TabsContent>

        <TabsContent value="catalogo" className="space-y-4">
          {isLoading ? (
            <div className="h-[400px] w-full animate-pulse rounded-md bg-muted/50" />
          ) : (
            <CatalogoView catalogo={catalogo} token={token} onRefresh={fetchData} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
