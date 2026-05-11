import { useAuth, type PerfilUsuario } from "@/hooks/use-auth";

export function usePerfil() {
  const usuario = useAuth((s) => s.usuario);
  const perfil = usuario?.perfil;
  const has = (perfis: PerfilUsuario[]) => !!perfil && perfis.includes(perfil);
  return { perfil, isAdmin: perfil === "administrador", has };
}
