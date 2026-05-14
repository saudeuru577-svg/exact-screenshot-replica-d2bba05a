
ALTER TABLE public.faturamentos
  ADD CONSTRAINT faturamentos_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas(id) ON DELETE RESTRICT,
  ADD CONSTRAINT faturamentos_iniciado_por_fkey FOREIGN KEY (iniciado_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  ADD CONSTRAINT faturamentos_finalizado_por_fkey FOREIGN KEY (finalizado_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT;

ALTER TABLE public.itens_autorizacao
  ADD CONSTRAINT itens_autorizacao_conferido_por_fkey FOREIGN KEY (conferido_por) REFERENCES public.usuarios(id) ON DELETE RESTRICT;
