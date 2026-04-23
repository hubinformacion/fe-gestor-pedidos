import { useState } from 'react';
import { Pedido, RESPONSABLES, ESTADOS_FLUJO, EstadoPedido } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Clock, Package, MapPin, User, Minus, Plus, X, CheckCircle2, CircleDot, Circle, Save, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { calcularSLA, parsearFecha } from '@/lib/date-utils';

interface TablaPedidosProps { pedidos: Pedido[]; token: string; onRefresh: () => void; }
interface ItemEntrega { titulo: string; cantidadSolicitada: number; cantidadEntregada: number; }

const OBS_SEPARATOR = '\n---\n';

export function TablaPedidos({ pedidos, token, onRefresh }: TablaPedidosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showConfirmEntrega, setShowConfirmEntrega] = useState(false);
  const [itemsEntrega, setItemsEntrega] = useState<ItemEntrega[]>([]);

  const filtered = pedidos.filter(p => {
    const matchSearch = p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'todos' || p.estado === statusFilter;
    const matchType = typeFilter === 'todos' || p.tipo === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  // ── Helpers ──
  const getSLADisplay = (inicio: string, fin: string) => {
    if (!inicio) return 'No iniciado';
    if (fin) { const sla = calcularSLA(inicio, fin); return sla ? `${sla} (Completado)` : 'N/A'; }
    const start = parsearFecha(inicio);
    if (!start.isValid()) return 'N/A';
    const diffMs = Date.now() - start.toDate().getTime();
    const mins = Math.floor(diffMs / 60000);
    const h = Math.floor(mins / 60);
    return h === 0 ? `${mins} min (En curso)` : `${h}h ${mins % 60}m (En curso)`;
  };

  const parseLibros = (s: string) => {
    if (!s) return [];
    return s.split(' | ').map(l => {
      const parts = l.split(' x');
      return { titulo: parts.slice(0, -1).join(' x'), cantidad: parseInt(parts[parts.length - 1]) || 1 };
    });
  };

  const parseObservaciones = (obs: string): string[] => {
    if (!obs) return [];
    return obs.split(OBS_SEPARATOR).map(n => n.trim()).filter(Boolean);
  };

  // Parse partial delivery data from observations
  const getEntregaData = (obs: string): Map<string, { entregado: number; solicitado: number }> | null => {
    const entregaNote = parseObservaciones(obs).find(n => n.startsWith('[ENTREGA'));
    if (!entregaNote) return null;
    const data = new Map<string, { entregado: number; solicitado: number }>();
    // Format: [ENTREGA PARCIAL] Titulo: 1/2 | Titulo2: 2/2 | ...
    const match = entregaNote.match(/\] (.+?)(?:\s*\|\s*Total|$)/);
    if (!match) return null;
    match[1].split(' | ').forEach(part => {
      const m = part.match(/^(.+?):\s*(\d+)\/(\d+)$/);
      if (m) data.set(m[1].trim(), { entregado: parseInt(m[2]), solicitado: parseInt(m[3]) });
    });
    return data.size > 0 ? data : null;
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

  const isFinalState = (estado: string) => estado === 'Entregado' || estado === 'Cancelado';

  // ── API call with optimistic update ──
  const updatePedido = async (codigo: string, updates: { estado?: string; observaciones?: string; atendidoPor?: string }) => {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/dashboard/estado?token=${encodeURIComponent(token)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, ...updates }),
      });
      if (!res.ok) throw new Error();
      // Optimistic update: patch selectedPedido locally
      setSelectedPedido(prev => {
        if (!prev || prev.codigo !== codigo) return prev;
        return { ...prev, ...updates, estado: (updates.estado || prev.estado) as EstadoPedido };
      });
      toast.success('Pedido actualizado');
      // Background refresh for table data
      onRefresh();
    } catch { toast.error('Error al actualizar'); }
    finally { setLoadingAction(false); }
  };

  // ── Drawer actions ──
  const openDrawer = (p: Pedido) => {
    setSelectedPedido(p);
    setNewNote('');
    setShowConfirmEntrega(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => { setDrawerOpen(false); setSelectedPedido(null); };

  const handleStatusClick = (newStatus: EstadoPedido) => {
    if (!selectedPedido || selectedPedido.estado === newStatus || isFinalState(selectedPedido.estado)) return;
    if (newStatus !== 'Pendiente' && !selectedPedido.atendidoPor) {
      toast.error('Asigna un responsable primero'); return;
    }
    if (newStatus === 'Entregado' && selectedPedido.estado === 'Pagado') {
      const parsed = parseLibros(selectedPedido.libros);
      setItemsEntrega(parsed.map(p => ({ titulo: p.titulo, cantidadSolicitada: p.cantidad, cantidadEntregada: p.cantidad })));
      setShowConfirmEntrega(true);
      return;
    }
    updatePedido(selectedPedido.codigo, { estado: newStatus });
  };

  const handleAssignInDrawer = (val: string | null) => {
    if (!selectedPedido || !val) return;
    updatePedido(selectedPedido.codigo, { atendidoPor: val === 'Sin asignar' ? '' : val });
  };

  const handleAddNote = () => {
    if (!selectedPedido || !newNote.trim()) return;
    const existingNotes = selectedPedido.observaciones || '';
    const combined = existingNotes
      ? `${existingNotes}${OBS_SEPARATOR}${newNote.trim()}`
      : newNote.trim();
    updatePedido(selectedPedido.codigo, { observaciones: combined });
    setNewNote('');
  };

  const adjustEntrega = (index: number, delta: number) => {
    setItemsEntrega(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return { ...item, cantidadEntregada: Math.max(0, Math.min(item.cantidadSolicitada, item.cantidadEntregada + delta)) };
    }));
  };

  const confirmarEntrega = async () => {
    if (!selectedPedido) return;
    const totalE = itemsEntrega.reduce((s, i) => s + i.cantidadEntregada, 0);
    const totalS = itemsEntrega.reduce((s, i) => s + i.cantidadSolicitada, 0);
    const detalle = itemsEntrega.map(i => `${i.titulo}: ${i.cantidadEntregada}/${i.cantidadSolicitada}`).join(' | ');
    const isParcial = totalE < totalS;
    const tag = isParcial ? '[ENTREGA PARCIAL]' : '[ENTREGA COMPLETA]';

    // Recalculate price for partial delivery
    let notaExtra = '';
    if (isParcial) {
      // Parse original total
      const originalTotal = parseFloat(selectedPedido.total.replace('S/', '').trim()) || 0;
      // Calculate proportional total based on items delivered
      const libros = parseLibros(selectedPedido.libros);
      const totalOriginalQty = libros.reduce((s, l) => s + l.cantidad, 0);
      const pricePerUnit = totalOriginalQty > 0 ? originalTotal / totalOriginalQty : 0;
      const adjustedTotal = itemsEntrega.reduce((s, i) => s + (i.cantidadEntregada * pricePerUnit), 0);
      notaExtra = ` | Total ajustado: S/ ${adjustedTotal.toFixed(2)} (original: ${selectedPedido.total})`;
    }

    const existingNotes = selectedPedido.observaciones || '';
    const entregaNote = `${tag} ${detalle}${notaExtra}`;
    const combined = existingNotes
      ? `${existingNotes}${OBS_SEPARATOR}${entregaNote}`
      : entregaNote;

    await updatePedido(selectedPedido.codigo, { estado: 'Entregado', observaciones: combined });
    setShowConfirmEntrega(false);
    toast.success(isParcial ? 'Entrega parcial registrada' : 'Entrega completa registrada');
  };

  const handleCancelPedido = () => {
    if (!selectedPedido) return;
    updatePedido(selectedPedido.codigo, { estado: 'Cancelado' });
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Buscar código o nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v || 'todos')}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS_FLUJO.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => setTypeFilter(v || 'todos')}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="Continental">Continental</SelectItem>
            <SelectItem value="Externo">Externo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla informativa */}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.codigo} className="cursor-pointer hover:bg-muted/40 transition-colors" onClick={() => openDrawer(p)}>
                <TableCell className="font-mono font-semibold text-sm whitespace-nowrap">{p.codigo}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{p.fecha}</TableCell>
                <TableCell>
                  <div className="font-medium text-sm">{p.nombre}</div>
                  <div className="text-xs text-muted-foreground">{p.tipo}{p.sede ? ` · ${p.sede}` : ''}</div>
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[220px] truncate text-xs text-muted-foreground" title={p.libros}>{p.libros}</TableCell>
                <TableCell className="whitespace-nowrap font-semibold text-sm">{p.total}</TableCell>
                <TableCell>
                  <Badge className={`text-[11px] px-2 py-0.5 border ${getStatusStyle(p.estado)}`} variant="outline">{p.estado}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.atendidoPor || '—'}</TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No se encontraron pedidos.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Drawer lateral ── */}
      {drawerOpen && selectedPedido && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
          <div className="relative w-full max-w-3xl bg-background shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b px-8 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Pedido {selectedPedido.codigo}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedPedido.fecha} · {selectedPedido.tipo}{selectedPedido.sede ? ` · ${selectedPedido.sede}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`text-sm px-4 py-1.5 border ${getStatusStyle(selectedPedido.estado)}`} variant="outline">
                  {selectedPedido.estado}
                </Badge>
                <Button variant="ghost" size="icon" onClick={closeDrawer} className="h-9 w-9"><X className="h-5 w-5" /></Button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* ── Pipeline stepper ── */}
              <div>
                <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">Estado del pedido</h4>
                <div className="flex items-center gap-0">
                  {(['Pendiente', 'Pagado', 'Entregado'] as EstadoPedido[]).map((step, i, arr) => {
                    const curIdx = selectedPedido.estado === 'Cancelado' ? -1 : arr.indexOf(selectedPedido.estado as EstadoPedido);
                    const done = curIdx > i;
                    const current = curIdx === i;
                    const cancelled = selectedPedido.estado === 'Cancelado';
                    const locked = isFinalState(selectedPedido.estado);
                    const canClick = !cancelled && !locked && !loadingAction && step !== selectedPedido.estado;
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className={`flex flex-col items-center gap-1.5 flex-1 ${cancelled ? 'opacity-30' : ''}`}>
                          <button disabled={!canClick} onClick={() => handleStatusClick(step)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                              done ? 'bg-emerald-500 border-emerald-500 text-white' :
                              current ? 'bg-primary border-primary text-primary-foreground' :
                              'border-border bg-muted/30 text-muted-foreground'
                            } ${canClick ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}>
                            {done ? <CheckCircle2 className="h-4 w-4" /> : current ? <CircleDot className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          </button>
                          <span className={`text-[11px] font-semibold ${done ? 'text-emerald-600' : current ? 'text-primary' : 'text-muted-foreground'}`}>{step}</span>
                        </div>
                        {i < arr.length - 1 && <div className={`h-0.5 flex-1 mx-1 mt-[-18px] rounded-full ${done ? 'bg-emerald-400' : 'bg-border'}`} />}
                      </div>
                    );
                  })}
                </div>
                {selectedPedido.estado === 'Cancelado' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium text-center">Este pedido ha sido cancelado</div>
                )}
              </div>

              {/* ── Confirm entrega inline ── */}
              {showConfirmEntrega && (
                <div className="border-2 border-emerald-300 rounded-lg p-5 bg-emerald-50/50 space-y-4">
                  <h4 className="text-sm font-bold text-emerald-800">Confirmar entrega — ajusta cantidades entregadas</h4>
                  {itemsEntrega.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                      <span className="text-sm font-medium flex-1 pr-3">{item.titulo}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-muted-foreground font-mono w-5 text-center">{item.cantidadSolicitada}</span>
                        <span className="text-muted-foreground">→</span>
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-full" disabled={item.cantidadEntregada <= 0} onClick={() => adjustEntrega(i, -1)}><Minus className="h-3 w-3" /></Button>
                        <span className={`text-sm font-bold font-mono w-5 text-center ${item.cantidadEntregada < item.cantidadSolicitada ? 'text-amber-600' : 'text-emerald-600'}`}>{item.cantidadEntregada}</span>
                        <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-full" disabled={item.cantidadEntregada >= item.cantidadSolicitada} onClick={() => adjustEntrega(i, 1)}><Plus className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                  {itemsEntrega.some(i => i.cantidadEntregada < i.cantidadSolicitada) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                      ⚠️ Entrega parcial detectada. El total se recalculará proporcionalmente.
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setShowConfirmEntrega(false)}>Cancelar</Button>
                    <Button size="sm" onClick={confirmarEntrega} disabled={loadingAction} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {loadingAction ? 'Registrando...' : 'Confirmar entrega'}
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Responsable ── */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Responsable asignado</h4>
                {isFinalState(selectedPedido.estado) ? (
                  <p className="text-sm font-medium">{selectedPedido.atendidoPor || 'No asignado'}</p>
                ) : (
                  <Select value={selectedPedido.atendidoPor || 'Sin asignar'} onValueChange={handleAssignInDrawer} disabled={loadingAction}>
                    <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sin asignar">Sin asignar</SelectItem>
                      {RESPONSABLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Separator />

              {/* ── Client info (3 cols) ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground flex items-center gap-2"><User className="w-3.5 h-3.5" /> Datos del cliente</h4>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-muted-foreground text-xs block mb-0.5">Nombre completo</span><span className="font-medium text-base">{selectedPedido.nombre}</span></div>
                    <div><span className="text-muted-foreground text-xs block mb-0.5">Documento</span><span>{selectedPedido.tipoDoc} {selectedPedido.nroDoc}</span></div>
                    <div><span className="text-muted-foreground text-xs block mb-0.5">Correo electrónico</span><span className="break-all">{selectedPedido.email}</span></div>
                    <div><span className="text-muted-foreground text-xs block mb-0.5">Teléfono</span><span>{selectedPedido.telefono}</span></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Entrega</h4>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-muted-foreground text-xs block mb-0.5">Modalidad</span><span className="font-medium">{selectedPedido.tipoEntrega}</span></div>
                    <div><span className="text-muted-foreground text-xs block mb-0.5">Detalle</span><span>{selectedPedido.detalleEntrega || '—'}</span></div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Atención (SLA)</h4>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-muted-foreground text-xs block mb-0.5">Inicio</span><span>{selectedPedido.fechaInicioAtencion || '—'}</span></div>
                    <div><span className="text-muted-foreground text-xs block mb-0.5">Fin</span><span>{selectedPedido.fechaFinAtencion || '—'}</span></div>
                    <div className="flex items-center gap-2 text-primary font-medium pt-1">
                      <Clock className="w-3.5 h-3.5" /><span>{getSLADisplay(selectedPedido.fechaInicioAtencion, selectedPedido.fechaFinAtencion)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ── Books (with partial delivery info) ── */}
              {(() => {
                const entregaData = getEntregaData(selectedPedido.observaciones);
                const isParcial = entregaData !== null;
                return (
                  <div className="space-y-4">
                    <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                      <Package className="w-3.5 h-3.5" /> {isParcial ? 'Libros solicitados vs entregados' : `Libros solicitados (${selectedPedido.cantidad} items)`}
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      {parseLibros(selectedPedido.libros).map((item, i) => {
                        const delivery = entregaData?.get(item.titulo);
                        const partial = delivery && delivery.entregado < delivery.solicitado;
                        return (
                          <div key={i} className={`flex items-center justify-between px-5 py-3.5 border-b last:border-0 text-sm ${partial ? 'bg-amber-50/50' : ''}`}>
                            <span className="font-medium flex-1">{item.titulo}</span>
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                              {delivery ? (
                                <>
                                  <span className={`font-mono font-bold ${partial ? 'text-amber-600' : 'text-emerald-600'}`}>{delivery.entregado}</span>
                                  <span className="text-muted-foreground text-xs">/</span>
                                  <span className="font-mono text-muted-foreground">{delivery.solicitado}</span>
                                  {partial && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Parcial</span>}
                                </>
                              ) : (
                                <span className="text-muted-foreground font-mono">×{item.cantidad}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex justify-between items-center px-5 py-4 bg-muted/30 font-bold">
                        <span>Total</span><span className="text-lg text-primary">{selectedPedido.total}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <Separator />

              {/* ── Observations (as separate entries) ── */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Observaciones y notas</h4>
                {/* Existing notes as cards */}
                {parseObservaciones(selectedPedido.observaciones).length > 0 ? (
                  <div className="space-y-2">
                    {parseObservaciones(selectedPedido.observaciones).map((nota, i) => (
                      <div key={i} className={`text-sm rounded-lg p-4 leading-relaxed ${
                        nota.startsWith('[ENTREGA') ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-muted/30 text-muted-foreground'
                      }`}>
                        {nota}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Sin observaciones</p>
                )}
                {/* Add new note */}
                {!isFinalState(selectedPedido.estado) && (
                  <div className="flex gap-2">
                    <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Agregar una nota..." rows={2} className="flex-1" />
                    <Button size="sm" variant="outline" onClick={handleAddNote} disabled={loadingAction || !newNote.trim()} className="self-end">
                      <Save className="h-3.5 w-3.5 mr-1.5" /> Guardar
                    </Button>
                  </div>
                )}
              </div>

              {/* ── Cancel pedido (footer) ── */}
              {!isFinalState(selectedPedido.estado) && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <Button variant="destructive" onClick={handleCancelPedido} disabled={loadingAction}>
                      <Ban className="h-4 w-4 mr-2" /> Cancelar pedido
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
