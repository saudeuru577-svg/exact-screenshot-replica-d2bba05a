import { Construction } from "lucide-react";
import { PageHeader, PageBody } from "@/components/layout/page-header";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <PageBody>
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <Construction className="size-10 mx-auto text-muted-foreground/60" />
          <h2 className="mt-4 text-base font-semibold">Em construção</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            Esta seção será implementada em uma próxima iteração. A estrutura de rotas e permissões já está pronta.
          </p>
        </div>
      </PageBody>
    </>
  );
}
