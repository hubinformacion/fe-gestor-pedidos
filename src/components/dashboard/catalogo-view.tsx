import { useState } from 'react';
import { Libro } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Plus } from 'lucide-react';

interface CatalogoViewProps {
  catalogo: Libro[];
  token: string;
  onRefresh: () => void;
}

export function CatalogoView({ catalogo, token, onRefresh }: CatalogoViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLibro, setEditingLibro] = useState<Partial<Libro> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const filteredCatalogo = catalogo.filter(l =>
    l.titulo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (libro?: Libro) => {
    if (libro) {
      setEditingLibro({ ...libro });
    } else {
      setEditingLibro({ titulo: '', precioNormal: 0, precioCont: 0, stock: 0, estado: 'Activo', unidadNegocio: 'Universidad Continental' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingLibro?.titulo) {
      toast.error('El título es requerido');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/catalogo?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLibro),
      });

      if (!res.ok) throw new Error('Error al guardar');

      toast.success('Libro guardado correctamente');
      setIsModalOpen(false);
      onRefresh();
    } catch (error) {
      toast.error('Error al guardar el libro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEstado = async (libro: Libro, newStatus: boolean) => {
    try {
      const res = await fetch(`/api/catalogo?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...libro, estado: newStatus ? 'Activo' : 'Inactivo' }),
      });

      if (!res.ok) throw new Error('Error al actualizar estado');

      toast.success('Estado actualizado');
      onRefresh();
    } catch (error) {
      toast.error('Error al actualizar el estado');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar libro..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Nuevo Libro
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Precio (Público)</TableHead>
              <TableHead>Precio (UC)</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCatalogo.map((libro) => (
              <TableRow key={libro.id}>
                <TableCell className="font-medium">{libro.titulo}</TableCell>
                <TableCell>S/ {libro.precioNormal.toFixed(2)}</TableCell>
                <TableCell>S/ {libro.precioCont.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={libro.stock <= 5 ? 'destructive' : 'secondary'}>
                    {libro.stock}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">{libro.unidadNegocio}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={libro.estado === 'Activo'}
                      onCheckedChange={(c) => handleToggleEstado(libro, c)}
                    />
                    <span className="text-sm text-muted-foreground">{libro.estado}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenModal(libro)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredCatalogo.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No se encontraron libros.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLibro?.id ? 'Editar Libro' : 'Nuevo Libro'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                value={editingLibro?.titulo || ''}
                onChange={(e) => setEditingLibro({ ...editingLibro, titulo: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="precioNormal">Precio Normal (S/)</Label>
                <Input
                  id="precioNormal"
                  type="number"
                  value={editingLibro?.precioNormal || 0}
                  onChange={(e) => setEditingLibro({ ...editingLibro, precioNormal: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="precioCont">Precio Continental (S/)</Label>
                <Input
                  id="precioCont"
                  type="number"
                  value={editingLibro?.precioCont || 0}
                  onChange={(e) => setEditingLibro({ ...editingLibro, precioCont: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={editingLibro?.stock || 0}
                  onChange={(e) => setEditingLibro({ ...editingLibro, stock: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unidadNegocio">Unidad de negocio</Label>
                <select
                  id="unidadNegocio"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editingLibro?.unidadNegocio || 'Universidad Continental'}
                  onChange={(e) => setEditingLibro({ ...editingLibro, unidadNegocio: e.target.value as Libro['unidadNegocio'] })}
                >
                  <option value="Universidad Continental">Universidad Continental</option>
                  <option value="Instituto Continental">Instituto Continental</option>
                  <option value="Posgrado">Posgrado</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
