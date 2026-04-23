import { useState, useEffect, useCallback } from 'react';
import { MetricCards } from './metric-cards';
import { TablaPedidos } from './tabla-pedidos';
import { CatalogoView } from './catalogo-view';
import { Pedido, Libro } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, RefreshCw, Package, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardShellProps {
  token: string;
  onLogout: () => void;
}

export function DashboardShell({ token, onLogout }: DashboardShellProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [catalogo, setCatalogo] = useState<Libro[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/data?token=${encodeURIComponent(token)}`);
      if (res.status === 401) {
        toast.error('Sesión expirada o token inválido');
        onLogout();
        return;
      }
      if (!res.ok) throw new Error('Error al obtener datos');

      const data = await res.json();
      setPedidos((data.pedidos || []).reverse());
      setCatalogo(data.catalogo || []);
    } catch (error) {
      if (!silent) toast.error('No se pudieron cargar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [token, onLogout]);

  const silentRefresh = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Gestión</h1>
          <p className="text-sm text-muted-foreground">Fondo Editorial UC</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground">
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Salir
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pedidos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pedidos" className="gap-2">
            <Package className="h-3.5 w-3.5" /> Pedidos
          </TabsTrigger>
          <TabsTrigger value="catalogo" className="gap-2">
            <BookOpen className="h-3.5 w-3.5" /> Catálogo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-6">
          <MetricCards pedidos={pedidos} catalogo={catalogo} />
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : (
            <TablaPedidos pedidos={pedidos} token={token} onRefresh={silentRefresh} />
          )}
        </TabsContent>

        <TabsContent value="catalogo" className="space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 w-full animate-pulse rounded-lg bg-muted/50" />
              ))}
            </div>
          ) : (
            <CatalogoView catalogo={catalogo} token={token} onRefresh={silentRefresh} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
