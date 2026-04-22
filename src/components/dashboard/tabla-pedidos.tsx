import { useState } from 'react';
import { Pedido, RESPONSABLES, ESTADOS_FLUJO, EstadoPedido } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Eye, FileText, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';

interface TablaPedidosProps {
  pedidos: Pedido[];
  token: string;
  onRefresh: () => void;
}

export function TablaPedidos({ pedidos, token, onRefresh }: TablaPedidosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');

  // Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesText, setNotesText] = useState('');

  const [loadingCode, setLoadingCode] = useState<string | null>(null);

  const filtered = pedidos.filter(p => {
    const matchSearch = p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'todos' || p.estado === statusFilter;
    const matchType = typeFilter === 'todos' || p.tipo === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const getStatusBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'Pendiente': return 'secondary';
      case 'Pagado': return 'default';
      case 'Entregado': return 'default'; // Success green could be added to custom tailwind
      case 'Cancelado': return 'destructive';
      default: return 'outline';
    }
  };

  const getSLA = (inicio: string, fin: string, actualEstado: string) => {
    if (!inicio) return 'No iniciado';
    
    // Si no ha terminado, calcular contra ahora
    const start = dayjs(inicio, "DD/MM/YYYY HH:mm");
    const end = fin ? dayjs(fin, "DD/MM/YYYY HH:mm") : dayjs();
    
    const diffHours = end.diff(start, 'hour');
    const diffMins = end.diff(start, 'minute') % 60;
    
    if (fin) return `${diffHours}h ${diffMins}m (Completado)`;
    return `${diffHours}h ${diffMins}m (En curso)`;
  };

  const handleUpdatePedido = async (
    codigo: string, 
    updates: { estado?: string; observaciones?: string; atendidoPor?: string }
  ) => {
    setLoadingCode(codigo);
    try {
      const res = await fetch(`/api/dashboard/estado?token=${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, ...updates }),
      });

      if (!res.ok) throw new Error('Error de actualización');
      
      toast.success('Pedido actualizado');
      onRefresh();
    } catch (e) {
      toast.error('Error al actualizar');
    } finally {
      setLoadingCode(null);
    }
  };

  const handleStatusChange = (pedido: Pedido, newStatus: string) => {
    if (newStatus !== 'Pendiente' && !pedido.atendidoPor) {
      toast.error('Debe asignar un responsable antes de cambiar el estado.');
      return;
    }
    handleUpdatePedido(pedido.codigo, { estado: newStatus });
  };

  const handleAssign = (pedido: Pedido, user: string) => {
    handleUpdatePedido(pedido.codigo, { atendidoPor: user === 'sin_asignar' ? '' : user });
  };

  const openNotes = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setNotesText(pedido.observaciones || '');
    setNotesModalOpen(true);
  };

  const saveNotes = () => {
    if (selectedPedido) {
      handleUpdatePedido(selectedPedido.codigo, { observaciones: notesText });
      setNotesModalOpen(false);
    }
  };

  const openView = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    setViewModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input 
          placeholder="Buscar código o nombre..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'todos')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los Estados</SelectItem>
            {ESTADOS_FLUJO.map(e => (
              <SelectItem key={e} value={e}>{e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || 'todos')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los Tipos</SelectItem>
            <SelectItem value="Continental">Continental</SelectItem>
            <SelectItem value="Externo">Externo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Libros</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.codigo}>
                <TableCell className="font-medium whitespace-nowrap">{p.codigo}</TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{p.fecha}</TableCell>
                <TableCell>
                  <div className="font-medium">{p.nombre}</div>
                  <div className="text-xs text-muted-foreground">{p.tipo} {p.sede ? `- ${p.sede}` : ''}</div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-sm" title={p.libros}>
                  {p.libros}
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium">{p.total}</TableCell>
                <TableCell>
                  <Select
                    value={p.estado}
                    onValueChange={(val) => handleStatusChange(p, val || 'Pendiente')}
                    disabled={loadingCode === p.codigo}
                  >
                    <SelectTrigger className={`h-8 w-[130px] ${p.estado === 'Entregado' ? 'text-green-600 border-green-200 bg-green-50' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_FLUJO.map(e => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={p.atendidoPor || 'sin_asignar'}
                    onValueChange={(val) => handleAssign(p, val || '')}
                    disabled={loadingCode === p.codigo}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="Asignar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                      {RESPONSABLES.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(p)} title="Ver detalles">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className={`h-8 w-8 ${p.observaciones ? 'text-primary' : 'text-muted-foreground'}`} onClick={() => openNotes(p)} title="Observaciones">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No se encontraron pedidos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Details Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Pedido: {selectedPedido?.codigo}</DialogTitle>
          </DialogHeader>
          {selectedPedido && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 text-sm">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-1 border-b pb-1">Cliente</h4>
                  <p><span className="text-muted-foreground">Nombre:</span> {selectedPedido.nombre}</p>
                  <p><span className="text-muted-foreground">Documento:</span> {selectedPedido.tipoDoc} {selectedPedido.nroDoc}</p>
                  <p><span className="text-muted-foreground">Contacto:</span> {selectedPedido.email} / {selectedPedido.telefono}</p>
                  <p><span className="text-muted-foreground">Tipo:</span> {selectedPedido.tipo} {selectedPedido.sede ? `(${selectedPedido.sede})` : ''}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1 border-b pb-1">Entrega</h4>
                  <p><span className="text-muted-foreground">Modalidad:</span> {selectedPedido.tipoEntrega.toUpperCase()}</p>
                  <p><span className="text-muted-foreground">Detalle:</span> {selectedPedido.detalleEntrega}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-1 border-b pb-1">Atención (SLA)</h4>
                  <p className="flex items-center gap-1">
                    <span className="text-muted-foreground">Responsable:</span> 
                    {selectedPedido.atendidoPor || 'Ninguno'}
                  </p>
                  <p><span className="text-muted-foreground">Inicio:</span> {selectedPedido.fechaInicioAtencion || '--'}</p>
                  <p><span className="text-muted-foreground">Fin:</span> {selectedPedido.fechaFinAtencion || '--'}</p>
                  <p className="flex items-center gap-1 mt-1 text-primary font-medium">
                    <Clock className="w-4 h-4" /> SLA: {getSLA(selectedPedido.fechaInicioAtencion, selectedPedido.fechaFinAtencion, selectedPedido.estado)}
                  </p>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2 mt-2">
                <h4 className="font-semibold mb-2 border-b pb-1">Libros Solicitados ({selectedPedido.cantidad} items)</h4>
                <div className="bg-muted/30 p-3 rounded-md">
                  {selectedPedido.libros.split(' | ').map((l, i) => (
                    <div key={i} className="flex justify-between py-1 border-b last:border-0 border-muted">
                      <span>{l.split(' x')[0]}</span>
                      <span className="font-medium text-muted-foreground">x{l.split(' x')[1]}</span>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2 mt-2 border-t font-bold text-lg">
                    Total: {selectedPedido.total}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Notes Modal */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observaciones - {selectedPedido?.codigo}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="notas" className="mb-2 block">Notas internas del pedido</Label>
            <Textarea
              id="notas"
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Escribe alguna nota sobre retrasos, falta de stock, etc."
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveNotes}>Guardar Notas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
