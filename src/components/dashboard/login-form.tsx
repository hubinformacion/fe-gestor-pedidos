import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';

interface LoginFormProps {
  onLogin: (token: string) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        toast.success('Acceso autorizado');
        onLogin(token);
      } else {
        toast.error('Token inválido');
        setToken('');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <LockKeyhole className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Acceso Restringido</CardTitle>
            <CardDescription>
              Ingrese el token de seguridad para acceder al dashboard del Fondo Editorial.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="token">Token de Seguridad</Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? 'Verificando...' : 'Ingresar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
