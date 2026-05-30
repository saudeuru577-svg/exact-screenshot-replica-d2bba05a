import type { ComponentType } from "react";
import {
  HeartPulse, GraduationCap, HeartHandshake, HardHat, Landmark,
  Trees, Sprout, Palette, ShieldAlert, Building2, MessageSquareWarning,
  Users, Bus, UtensilsCrossed, ClipboardList, School,
  Home, FileHeart, HandCoins, IdCard,
  Wrench, Lightbulb, Construction,
  Receipt, FileSpreadsheet, Gavel, BadgeCheck,
  FileSearch, ShieldCheck, Megaphone,
  Tractor, Wheat, Store,
  CalendarDays, MapPin, ClipboardSignature,
  Siren, Shield, BellRing,
  UserCog, Folder, Truck, Boxes,
  Inbox,
  type LucideProps,
} from "lucide-react";
import type { PerfilUsuario } from "@/hooks/use-auth";

export type SubmoduloSecretaria = {
  slug: string;
  label: string;
  descricao: string;
  icon: ComponentType<LucideProps>;
  status: "ativo" | "em_breve";
};

export type Secretaria = {
  slug: string;
  to: string;
  label: string;
  descricao: string;
  icon: ComponentType<LucideProps>;
  status: "ativo" | "em_breve";
  externo?: boolean; // true = não usa SecretariaShell (ex.: Saúde tem hub próprio)
  submodulos: SubmoduloSecretaria[];
};

export const SECRETARIAS: Secretaria[] = [
  {
    slug: "saude",
    to: "/saude",
    label: "Saúde",
    descricao: "Regulação de exames, atenção básica, farmácia, agendamento e vigilância.",
    icon: HeartPulse,
    status: "ativo",
    externo: true,
    submodulos: [],
  },
  {
    slug: "educacao",
    to: "/educacao",
    label: "Educação",
    descricao: "Matrículas, escolas, transporte escolar, merenda e censo.",
    icon: GraduationCap,
    status: "em_breve",
    submodulos: [
      { slug: "matriculas", label: "Matrículas", descricao: "Inscrição e enturmação de alunos.", icon: Users, status: "em_breve" },
      { slug: "escolas", label: "Escolas", descricao: "Cadastro de escolas e turmas.", icon: School, status: "em_breve" },
      { slug: "transporte", label: "Transporte Escolar", descricao: "Rotas, veículos e alunos transportados.", icon: Bus, status: "em_breve" },
      { slug: "merenda", label: "Merenda", descricao: "Cardápios e estoque de alimentos.", icon: UtensilsCrossed, status: "em_breve" },
      { slug: "censo", label: "Censo Escolar", descricao: "Coleta e envio de dados ao INEP.", icon: ClipboardList, status: "em_breve" },
    ],
  },
  {
    slug: "assistencia-social",
    to: "/assistencia-social",
    label: "Assistência Social",
    descricao: "CRAS, CREAS, Cadastro Único e benefícios eventuais.",
    icon: HeartHandshake,
    status: "em_breve",
    submodulos: [
      { slug: "cras", label: "CRAS", descricao: "Atendimentos e acompanhamento familiar.", icon: Home, status: "em_breve" },
      { slug: "creas", label: "CREAS", descricao: "Proteção social especial.", icon: FileHeart, status: "em_breve" },
      { slug: "cadastro-unico", label: "Cadastro Único", descricao: "Famílias cadastradas e atualização.", icon: IdCard, status: "em_breve" },
      { slug: "beneficios", label: "Benefícios Eventuais", descricao: "Concessão e controle de auxílios.", icon: HandCoins, status: "em_breve" },
    ],
  },
  {
    slug: "obras",
    to: "/obras",
    label: "Obras e Infraestrutura",
    descricao: "Ordens de serviço, iluminação pública e manutenção viária.",
    icon: HardHat,
    status: "em_breve",
    submodulos: [
      { slug: "ordens-servico", label: "Ordens de Serviço", descricao: "Abertura e acompanhamento de OS.", icon: Wrench, status: "em_breve" },
      { slug: "iluminacao", label: "Iluminação Pública", descricao: "Chamados e manutenção da rede.", icon: Lightbulb, status: "em_breve" },
      { slug: "manutencao-viaria", label: "Manutenção Viária", descricao: "Tapa-buracos, pavimentação e drenagem.", icon: Construction, status: "em_breve" },
    ],
  },
  {
    slug: "fazenda",
    to: "/fazenda",
    label: "Fazenda e Tributação",
    descricao: "IPTU, ISS, dívida ativa e alvarás.",
    icon: Landmark,
    status: "em_breve",
    submodulos: [
      { slug: "iptu", label: "IPTU", descricao: "Lançamento e arrecadação do IPTU.", icon: Receipt, status: "em_breve" },
      { slug: "iss", label: "ISS", descricao: "Notas fiscais de serviço e ISSQN.", icon: FileSpreadsheet, status: "em_breve" },
      { slug: "divida-ativa", label: "Dívida Ativa", descricao: "Cobrança administrativa e judicial.", icon: Gavel, status: "em_breve" },
      { slug: "alvaras", label: "Alvarás", descricao: "Emissão e renovação de alvarás.", icon: BadgeCheck, status: "em_breve" },
    ],
  },
  {
    slug: "meio-ambiente",
    to: "/meio-ambiente",
    label: "Meio Ambiente",
    descricao: "Licenciamento ambiental, fiscalização e denúncias.",
    icon: Trees,
    status: "em_breve",
    submodulos: [
      { slug: "licenciamento", label: "Licenciamento", descricao: "Processos de licença ambiental.", icon: FileSearch, status: "em_breve" },
      { slug: "fiscalizacao", label: "Fiscalização", descricao: "Vistorias e autos de infração.", icon: ShieldCheck, status: "em_breve" },
      { slug: "denuncias", label: "Denúncias", descricao: "Canal de denúncias ambientais.", icon: Megaphone, status: "em_breve" },
    ],
  },
  {
    slug: "agricultura",
    to: "/agricultura",
    label: "Agricultura",
    descricao: "Produtor rural, ATER e feiras municipais.",
    icon: Sprout,
    status: "em_breve",
    submodulos: [
      { slug: "produtor-rural", label: "Produtor Rural", descricao: "Cadastro e CAR do produtor.", icon: Tractor, status: "em_breve" },
      { slug: "ater", label: "ATER", descricao: "Assistência técnica e extensão rural.", icon: Wheat, status: "em_breve" },
      { slug: "feiras", label: "Feiras", descricao: "Feirantes e organização das feiras.", icon: Store, status: "em_breve" },
    ],
  },
  {
    slug: "cultura-esporte-turismo",
    to: "/cultura-esporte-turismo",
    label: "Cultura, Esporte e Turismo",
    descricao: "Eventos, equipamentos públicos e inscrições.",
    icon: Palette,
    status: "em_breve",
    submodulos: [
      { slug: "eventos", label: "Eventos", descricao: "Calendário e produção de eventos.", icon: CalendarDays, status: "em_breve" },
      { slug: "equipamentos", label: "Equipamentos Públicos", descricao: "Quadras, ginásios e centros culturais.", icon: MapPin, status: "em_breve" },
      { slug: "inscricoes", label: "Inscrições", descricao: "Oficinas, escolinhas e campeonatos.", icon: ClipboardSignature, status: "em_breve" },
    ],
  },
  {
    slug: "seguranca",
    to: "/seguranca",
    label: "Segurança e Defesa Civil",
    descricao: "Ocorrências, guarda municipal e alertas.",
    icon: ShieldAlert,
    status: "em_breve",
    submodulos: [
      { slug: "ocorrencias", label: "Ocorrências", descricao: "Registro e acompanhamento de ocorrências.", icon: Siren, status: "em_breve" },
      { slug: "guarda", label: "Guarda Municipal", descricao: "Escalas e efetivo da guarda.", icon: Shield, status: "em_breve" },
      { slug: "alertas", label: "Alertas", descricao: "Defesa civil e alertas à população.", icon: BellRing, status: "em_breve" },
    ],
  },
  {
    slug: "administracao",
    to: "/administracao",
    label: "Administração e Gestão",
    descricao: "RH, protocolo, frota e patrimônio.",
    icon: Building2,
    status: "em_breve",
    submodulos: [
      { slug: "rh", label: "Recursos Humanos", descricao: "Servidores, folha e ponto.", icon: UserCog, status: "em_breve" },
      { slug: "protocolo", label: "Protocolo", descricao: "Tramitação de documentos.", icon: Folder, status: "em_breve" },
      { slug: "frota", label: "Frota", descricao: "Veículos, abastecimento e manutenção.", icon: Truck, status: "em_breve" },
      { slug: "patrimonio", label: "Patrimônio", descricao: "Bens móveis e imóveis.", icon: Boxes, status: "em_breve" },
    ],
  },
  {
    slug: "ouvidoria",
    to: "/ouvidoria",
    label: "Ouvidoria",
    descricao: "Canal único do cidadão para denúncias, elogios e sugestões.",
    icon: MessageSquareWarning,
    status: "em_breve",
    submodulos: [
      { slug: "manifestacoes", label: "Manifestações", descricao: "Recebimento e resposta às manifestações.", icon: Inbox, status: "em_breve" },
    ],
  },
];

/** Acesso geral à secretaria: Saúde mantém regras próprias; demais só admin. */
export function temAcessoSecretaria(secretaria: Secretaria, perfil: PerfilUsuario): boolean {
  if (secretaria.slug === "saude") return true; // hub Saúde tem seus próprios gates internos
  return perfil === "administrador";
}

export function getSecretaria(slug: string): Secretaria | undefined {
  return SECRETARIAS.find((s) => s.slug === slug);
}

export function getSubmodulo(secretariaSlug: string, submoduloSlug: string): SubmoduloSecretaria | undefined {
  return getSecretaria(secretariaSlug)?.submodulos.find((s) => s.slug === submoduloSlug);
}
