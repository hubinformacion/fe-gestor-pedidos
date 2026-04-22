import { useState } from 'react';
import { Pedido, RESPONSABLES, ESTADOS_FLUJO, EstadoPedido } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Eye, FileText, Clock, Package, Mail, Phone, MapPin, User, Minus, Plus, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { calcularSLA, parsearFecha } from '@/lib/date-utils';

interface TablaPedidosProps {
  pedidos: Pedido[];
  token: string;
  onRefresh: () => void;
}

interface ItemEntrega {
  titulo: string;
  cantidadSolicitada: number;
  cantidadEntregada: number;
}

export function TablaPedidos({ pedidos, token, onRefresh }: TablaPedidosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesText, setNotesText] = useState('');

  // Confirm delivery modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [itemsEntrega, setItemsEntrega] = useState<ItemEntrega[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [loadingCode, setLoadingCode] = useState<string | null>(null);

  const filtered = pedidos.filter(p => {
    const matchSearch = p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'todos' || p.estado === statusFilter;
    const matchType = typeFilter === 'todos' || p.tipo === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const getSLADisplay = (inicio: string, fin: string) => {
    if (!inicio) return 'No iniciado';
    if (fin) {
      const sla = calcularSLA(inicio, fin);
      return sla ? `${sla} (Completado)` : 'N/A';
    }
    // In progress: calc from inicio to now
    const start = parsearFecha(inicio);
    if (!start.isValid()) return 'N/A';
    const now = new Date();
    const diffMs = now.getTime() - start.toDate().getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    if (hours === 0) return `${mins} min (En curso)`;
    return `${hours}h ${mins}m (En curso)`;
  };

  const parseLibros = (librosStr: string): { titulo: string; cantidad: number }[] => {
    if (!librosStr) return [];
    return librosStr.split(' | ').map(l => {
      const parts = l.split(' x');
      const titulo = parts.slice(0, -1).join(' x');
      const cantidad = parseInt(parts[parts.length - 1]) || 1;
      return { titulo, cantidad };
    });
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

  // ── Confirm delivery ──
  const openConfirmDelivery = (pedido: Pedido) => {
    setSelectedPedido(pedido);
    const parsed = parseLibros(pedido.libros);
    setItemsEntrega(parsed.map(p => ({
      titulo: p.titulo,
      cantidadSolicitada: p.cantidad,
      cantidadEntregada: p.cantidad,
    })));
    setConfirmModalOpen(true);
  };

  const adjustEntrega = (index: number, delta: number) => {
    setItemsEntrega(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newCant = Math.max(0, Math.min(item.cantidadSolicitada, item.cantidadEntregada + delta));
      return { ...item, cantidadEntregada: newCant };
    }));
  };

  const confirmarEntrega = async () => {
    if (!selectedPedido) return;
    setConfirmLoading(true);

    const totalEntregado = itemsEntrega.reduce((s, i) => s + i.cantidadEntregada, 0);
    const totalSolicitado = itemsEntrega.reduce((s, i) => s + i.cantidadSolicitada, 0);

    const detallesEntrega = itemsEntrega
      .map(i => `${i.titulo}: ${i.cantidadEntregada}/${i.cantidadSolicitada}`)
      .join(' | ');

    const notas = totalEntregado < totalSolicitado
      ? `[ENTREGA PARCIAL] ${detallesEntrega}. ${selectedPedido.observaciones || ''}`
      : `[ENTREGA COMPLETA] ${detallesEntrega}. ${selectedPedido.observaciones || ''}`;

    try {
      const res = await fetch(`/api/dashboard/estado?token=${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: selectedPedido.codigo,
          estado: 'Entregado',
          observaciones: notas.trim(),
        }),
      });
      if (!res.ok) throw new Error('Error al confirmar');
      toast.success(totalEntregado < totalSolicitado
        ? 'Entrega parcial registrada'
        : 'Entrega completa registrada');
      setConfirmModalOpen(false);
      onRefresh();
    } catch (e) {
      toast.error('Error al confirmar la entrega');
    } finally {
      setConfirmLoading(false);
    }
  };

  const getStatusStyle = (estado: string) => {
    switch (estado) {
      case 'Pendiente': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Pagado': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Entregado': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelado': return 'bg-red-50 text-red-700 border-red-200';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
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
            <SelectItem value="todos">Todos los estados</SelectItem>
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
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="Continental">Continental</SelectItem>
            <SelectItem value="Externo">Externo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[90px]">Código</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden lg:table-cell">Libros</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead className="text-center w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.codigo} className="group">
                <TableCell className="font-mono font-semibold text-sm whitespace-nowrap">{p.codigo}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{p.fecha}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{p.nombre}</div>
                  <div className="text-xs text-muted-foreground">{p.tipo}{p.sede ? ` · ${p.sede}` : ''}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[220px] truncate text-xs text-muted-foreground" title={p.libros}>
                  {p.libros}
                </TableCell>
                <TableCell className="whitespace-nowrap font-semibold text-sm">{p.total}</TableCell>
                <TableCell>
                  <Select
                    value={p.estado}
                    onValueChange={(val) => handleStatusChange(p, val || 'Pendiente')}
                    disabled={loadingCode === p.codigo}
                  >
                    <SelectTrigger className={`h-7 w-[120px] text-xs font-medium border ${getStatusStyle(p.estado)}`}>
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
                    <SelectTrigger className="h-7 w-[130px] text-xs">
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
                <TableCell>
                  <div className="flex items-center justify-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(p)} title="Ver detalles">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon"
                      className={`h-8 w-8 ${p.observaciones ? 'text-primary' : 'text-muted-foreground'}`}
                      onClick={() => openNotes(p)} title="Observaciones">
                      <FileText className="h-4 w-4" />
                    </Button>
                    {(p.estado === 'Pagado') && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600"
                        onClick={() => openConfirmDelivery(p)} title="Confirmar entrega">
                        <ClipboardCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No se encontraron pedidos.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Detail Modal (expanded) ── */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-5xl w-[96vw] max-h-[90vh] overflow-y-auto p-0">
          {selectedPedido && (
            <>
              {/* Modal header */}
              <div className="sticky top-0 z-10 bg-card border-b px-8 py-5 flex items-center justify-between">
                <div>
                  <DialogTitle className="text-2xl font-bold">Pedido {selectedPedido.codigo}</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-1">
                    {selectedPedido.fecha} · {selectedPedido.tipo}{selectedPedido.sede ? ` · ${selectedPedido.sede}` : ''}
                  </DialogDescription>
                </div>
                <Badge className={`text-sm px-4 py-1.5 border ${getStatusStyle(selectedPedido.estado)}`} variant="outline">
                  {selectedPedido.estado}
                </Badge>
              </div>

              <div className="p-8 space-y-8">
                {/* Info grid: 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Client */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                      <User className="w-3.5 h-3.5" /> Datos del cliente
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs block mb-0.5">Nombre completo</span>
                        <span className="font-medium text-base">{selectedPedido.nombre}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block mb-0.5">Documento</span>
                        <span>{selectedPedido.tipoDoc} {selectedPedido.nroDoc}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm break-all">{selectedPedido.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm">{selectedPedido.telefono}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" /> Entrega
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs block mb-0.5">Modalidad</span>
                        <span className="font-medium">{selectedPedido.tipoEntrega}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block mb-0.5">Detalle</span>
                        <span>{selectedPedido.detalleEntrega || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* SLA */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Atención (SLA)
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs block mb-0.5">Responsable</span>
                        <span className="font-medium">{selectedPedido.atendidoPor || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block mb-0.5">Inicio</span>
                        <span>{selectedPedido.fechaInicioAtencion || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block mb-0.5">Fin</span>
                        <span>{selectedPedido.fechaFinAtencion || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-primary font-medium pt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{getSLADisplay(selectedPedido.fechaInicioAtencion, selectedPedido.fechaFinAtencion)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Books */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                    <Package className="w-3.5 h-3.5" /> Libros solicitados ({selectedPedido.cantidad} items)
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    {parseLibros(selectedPedido.libros).map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b last:border-0 text-sm">
                        <span className="font-medium flex-1">{item.titulo}</span>
                        <span className="text-muted-foreground font-mono ml-4 shrink-0">×{item.cantidad}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center px-5 py-4 bg-muted/30 font-bold">
                      <span>Total</span>
                      <span className="text-lg text-primary">{selectedPedido.total}</span>
                    </div>
                  </div>
                </div>

                {/* Observations */}
                {selectedPedido.observaciones && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Observaciones</h4>
                    <p className="text-sm bg-muted/30 rounded-lg p-5 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedPedido.observaciones}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Notes Modal ── */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observaciones — {selectedPedido?.codigo}</DialogTitle>
            <DialogDescription>Notas internas visibles solo desde el dashboard.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
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
            <Button onClick={saveNotes}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm Delivery Modal ── */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmar Entrega — {selectedPedido?.codigo}</DialogTitle>
            <DialogDescription>
              Ajusta las cantidades realmente entregadas. Puedes reducir si no se pudo completar el pedido al 100%.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-1">
            <div className="grid grid-cols-[1fr,auto] gap-2 text-xs font-semibold tracking-widest uppercase text-muted-foreground px-1 mb-2">
              <span>Título</span>
              <span className="text-center w-[140px]">Solicitado → Entregado</span>
            </div>
            {itemsEntrega.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                <span className="text-sm font-medium flex-1 pr-3">{item.titulo}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm text-muted-foreground font-mono w-5 text-center">{item.cantidadSolicitada}</span>
                  <span className="text-muted-foreground">→</span>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-full"
                    disabled={item.cantidadEntregada <= 0}
                    onClick={() => adjustEntrega(i, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className={`text-sm font-bold font-mono w-5 text-center ${
                    item.cantidadEntregada < item.cantidadSolicitada ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {item.cantidadEntregada}
                  </span>
                  <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-full"
                    disabled={item.cantidadEntregada >= item.cantidadSolicitada}
                    onClick={() => adjustEntrega(i, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {itemsEntrega.some(i => i.cantidadEntregada < i.cantidadSolicitada) && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                ⚠️ Entrega parcial detectada. Se registrará la diferencia en las observaciones del pedido.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>Cancelar</Button>
            <Button onClick={confirmarEntrega} disabled={confirmLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {confirmLoading ? 'Registrando...' : 'Confirmar Entrega'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
