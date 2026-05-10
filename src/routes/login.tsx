import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error("Email ou senha inválidos");
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/70 p-12 text-primary-foreground flex-col justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-6" />
          <span>SISMUNA</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            Controle administrativo<br />de autorizações de exames.
          </h1>
          <p className="text-primary-foreground/80 max-w-md">
            Sistema institucional da Secretaria Municipal de Saúde para gestão
            de autorizações, limites orçamentários e faturamento.
          </p>
        </div>
        <p className="text-xs text-primary-foreground/60">© Secretaria Municipal de Saúde</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Acessar o sistema</h2>
            <p className="text-sm text-muted-foreground">
              Entre com suas credenciais corporativas.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.nome@saude.gov.br"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Entrar
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Acesso restrito a funcionários autorizados. Contate o administrador para criar conta.
          </p>
        </form>
      </div>
    </div>
  );
}
