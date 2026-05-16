import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export function GrupoCombobox({
  value, onChange, options, placeholder = "Selecione ou crie",
  allowCreate = true, className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCreate?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim();
  const exists = options.some((o) => o.toLowerCase() === q.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button" variant="outline" role="combobox"
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar ou digitar novo..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{allowCreate && q ? "Pressione abaixo para criar." : "Nenhum grupo encontrado."}</CommandEmpty>
            {options.length > 0 && (
              <CommandGroup heading="Grupos">
                {options.map((opt) => (
                  <CommandItem key={opt} value={opt} onSelect={() => { onChange(opt); setOpen(false); setQuery(""); }}>
                    <Check className={cn("mr-2 size-4", value === opt ? "opacity-100" : "opacity-0")} />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {allowCreate && q && !exists && (
              <CommandGroup heading="Novo">
                <CommandItem value={`__create__${q}`} onSelect={() => { onChange(q); setOpen(false); setQuery(""); }}>
                  <Plus className="mr-2 size-4" /> Criar grupo: <span className="font-medium ml-1">{q}</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
