import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, PageBody } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { R1AutPorProcedimento } from "@/components/relatorios/aut-por-procedimento";
import { R2FatPorProcedimento } from "@/components/relatorios/fat-por-procedimento";
import { RelatorioNominal } from "@/components/relatorios/relatorio-nominal";

export const Route = createFileRoute("/_authenticated/relatorios/")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Indicadores de autorizações e faturamento."
      />
      <PageBody>
        <Tabs defaultValue="r1" className="w-full">
          <TabsList className="h-auto flex flex-wrap">
            <TabsTrigger value="r1">Aut. por Procedimento</TabsTrigger>
            <TabsTrigger value="r2">Fat. por Procedimento</TabsTrigger>
            <TabsTrigger value="r3">Autorizados Nominal</TabsTrigger>
            <TabsTrigger value="r4">Faturados Nominal</TabsTrigger>
          </TabsList>
          <TabsContent value="r1" className="mt-4"><R1AutPorProcedimento /></TabsContent>
          <TabsContent value="r2" className="mt-4"><R2FatPorProcedimento /></TabsContent>
          <TabsContent value="r3" className="mt-4"><RelatorioNominal modo="autorizado" /></TabsContent>
          <TabsContent value="r4" className="mt-4"><RelatorioNominal modo="faturado" /></TabsContent>
        </Tabs>
      </PageBody>
    </>
  );
}
