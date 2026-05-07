export type ReportModuleId =
  | "geral"
  | "higienizacao-hortifruti"
  | "controle-temperatura-equipamentos"
  | "controle-qualidade-oleo"
  | "rastreabilidade-recebimento"
  | "controle-buffet-amostras"
  | "plano-limpeza-diario"
  | "plano-limpeza-semanal"
  | "chamados-manutencao";

export type ReportFilterType = "date" | "text" | "number" | "select";
export type FilterOption = { value: string; label: string };

export type ReportFilterKey =
  | "dataInicial" | "dataFinal" | "moduloEscopo" | "statusAuditoria" | "responsavel"
  | "naoConformidade" | "acaoCorretiva" | "assinaturaStatus" | "hortifruti"
  | "produtoUtilizado" | "statusHortifruti" | "comObservacao" | "equipamento"
  | "turnoTemperatura" | "statusTemperatura" | "temperaturaStatus" | "comFoto"
  | "semFotoObrigatoria" | "fita" | "temperatura" | "statusOleo" | "usoEquipamento"
  | "fornecedor" | "notaFiscal" | "produto" | "lote" | "sif" | "sifNa"
  | "transporte" | "aspecto" | "embalagem" | "responsavelConferencia" | "statusNota"
  | "servico" | "item" | "classificacao" | "itemExtra" | "statusBuffet"
  | "temperaturaForaRegra" | "area" | "turnoLimpeza" | "supervisor"
  | "statusPlanoLimpeza" | "semana" | "mes" | "ano" | "diaSemana"
  | "origem" | "usuario" | "statusChamado" | "chamadoSituacao";

export type ReportFilterDefinition = {
  key: ReportFilterKey;
  label: string;
  type: ReportFilterType;
  placeholder?: string;
  options?: FilterOption[];
};

export type ReportDefinition = {
  id: string;
  label: string;
  description: string;
  filterKeys: ReportFilterKey[];
};

export type ReportModuleDefinition = {
  id: ReportModuleId;
  label: string;
  reports: ReportDefinition[];
};

const yesNo: FilterOption[] = [
  { value: "", label: "Todos" },
  { value: "SIM", label: "Sim" },
  { value: "NAO", label: "Não" }
];

const conformidade: FilterOption[] = [
  { value: "", label: "Todos" },
  { value: "CONFORME", label: "Conforme" },
  { value: "NAO_CONFORME", label: "Não conforme" }
];

export const FILTER_DEFINITIONS: Record<ReportFilterKey, ReportFilterDefinition> = {
  dataInicial: { key: "dataInicial", label: "Data inicial", type: "date" },
  dataFinal: { key: "dataFinal", label: "Data final", type: "date" },
  moduloEscopo: { key: "moduloEscopo", label: "Módulo", type: "select", options: [
    { value: "", label: "Todos" },
    { value: "higienizacao-hortifruti", label: "Higienização de Hortifruti" },
    { value: "controle-temperatura-equipamentos", label: "Controle de Temperatura" },
    { value: "controle-qualidade-oleo", label: "Controle de Qualidade do Óleo" },
    { value: "rastreabilidade-recebimento", label: "Rastreabilidade de Recebimento" },
    { value: "controle-buffet-amostras", label: "Controle de Buffet / Amostras" },
    { value: "plano-limpeza-diario", label: "Plano de Limpeza Diário" },
    { value: "plano-limpeza-semanal", label: "Plano de Limpeza Semanal" },
    { value: "chamados-manutencao", label: "Chamados de Manutenção" }
  ] },
  statusAuditoria: { key: "statusAuditoria", label: "Status", type: "select", options: [
    { value: "", label: "Todos" }, { value: "PENDENTE", label: "Pendente" },
    { value: "CONCLUIDO", label: "Concluído" }, { value: "NAO_CONFORME", label: "Não conforme" }
  ] },
  responsavel: { key: "responsavel", label: "Responsável", type: "text", placeholder: "Nome" },
  naoConformidade: { key: "naoConformidade", label: "Com não conformidade", type: "select", options: yesNo },
  acaoCorretiva: { key: "acaoCorretiva", label: "Com ação corretiva", type: "select", options: yesNo },
  assinaturaStatus: { key: "assinaturaStatus", label: "Assinatura", type: "select", options: [
    { value: "", label: "Todas" }, { value: "ASSINADO", label: "Assinado" }, { value: "NAO_ASSINADO", label: "Não assinado" }
  ] },
  hortifruti: { key: "hortifruti", label: "Hortifruti", type: "text" },
  produtoUtilizado: { key: "produtoUtilizado", label: "Produto utilizado", type: "text" },
  statusHortifruti: { key: "statusHortifruti", label: "Status", type: "select", options: [
    { value: "", label: "Todos" }, { value: "CONCLUIDO", label: "Concluído" }, { value: "INCOMPLETO", label: "Incompleto" }
  ] },
  comObservacao: { key: "comObservacao", label: "Com observação", type: "select", options: yesNo },
  equipamento: { key: "equipamento", label: "Equipamento", type: "text" },
  turnoTemperatura: { key: "turnoTemperatura", label: "Turno", type: "select", options: [
    { value: "", label: "Todos" }, { value: "MANHA", label: "Manhã" }, { value: "TARDE", label: "Tarde" }
  ] },
  statusTemperatura: { key: "statusTemperatura", label: "Status", type: "select", options: [
    { value: "", label: "Todos" }, { value: "CONFORME", label: "Normal" }, { value: "ALERTA", label: "Alerta" }, { value: "CRITICO", label: "Crítico" }
  ] },
  temperaturaStatus: { key: "temperaturaStatus", label: "Temperatura", type: "select", options: [
    { value: "", label: "Todas" }, { value: "NORMAL", label: "Normal" }, { value: "ALERTA", label: "Alerta" }, { value: "CRITICA", label: "Crítica" }
  ] },
  comFoto: { key: "comFoto", label: "Com foto", type: "select", options: yesNo },
  semFotoObrigatoria: { key: "semFotoObrigatoria", label: "Sem foto obrigatória", type: "select", options: yesNo },
  fita: { key: "fita", label: "Fita", type: "text" },
  temperatura: { key: "temperatura", label: "Temperatura", type: "number", placeholder: "Ex.: 72,5" },
  statusOleo: { key: "statusOleo", label: "Status", type: "select", options: [
    { value: "", label: "Todos" }, { value: "ADEQUADO", label: "Adequado" }, { value: "ATENCAO", label: "Atenção" },
    { value: "ULTIMA_UTILIZACAO", label: "Última utilização" }, { value: "DESCARTAR", label: "Descartar" }, { value: "SEM_UTILIZACAO", label: "Sem utilização" }
  ] },
  usoEquipamento: { key: "usoEquipamento", label: "Uso do equipamento", type: "select", options: [
    { value: "", label: "Todos" }, { value: "UTILIZADO", label: "Utilizado" }, { value: "SEM_USO", label: "Inutilizado / sem uso" }
  ] },
  fornecedor: { key: "fornecedor", label: "Fornecedor", type: "text" },
  notaFiscal: { key: "notaFiscal", label: "Número da nota", type: "text" },
  produto: { key: "produto", label: "Produto", type: "text" },
  lote: { key: "lote", label: "Lote", type: "text" },
  sif: { key: "sif", label: "SIF", type: "text" },
  sifNa: { key: "sifNa", label: "SIF = NA", type: "select", options: yesNo },
  transporte: { key: "transporte", label: "Transporte", type: "select", options: conformidade },
  aspecto: { key: "aspecto", label: "Aspecto", type: "select", options: conformidade },
  embalagem: { key: "embalagem", label: "Embalagem", type: "select", options: conformidade },
  responsavelConferencia: { key: "responsavelConferencia", label: "Responsável pela conferência", type: "text" },
  statusNota: { key: "statusNota", label: "Status da nota", type: "select", options: [
    { value: "", label: "Todos" }, { value: "PENDENTE", label: "Pendente" }, { value: "IMPORTADA", label: "Importada" },
    { value: "EM_CONFERENCIA", label: "Em conferência" }, { value: "FINALIZADA", label: "Finalizada" }
  ] },
  servico: { key: "servico", label: "Serviço", type: "text" },
  item: { key: "item", label: "Item / produto", type: "text" },
  classificacao: { key: "classificacao", label: "Classificação", type: "select", options: [
    { value: "", label: "Todas" }, { value: "QUENTE", label: "Quente" }, { value: "FRIO", label: "Frio" }, { value: "FRIO_CRU", label: "Frio cru" }
  ] },
  itemExtra: { key: "itemExtra", label: "Tipo de item", type: "select", options: [
    { value: "", label: "Todos" }, { value: "PADRAO", label: "Item padrão" }, { value: "EXTRA", label: "Item extra" }
  ] },
  statusBuffet: { key: "statusBuffet", label: "Status", type: "select", options: [
    { value: "", label: "Todos" }, { value: "PENDENTE", label: "Pendente" }, { value: "PREENCHIDO", label: "Preenchido" }, { value: "ASSINADO", label: "Assinado" }
  ] },
  temperaturaForaRegra: { key: "temperaturaForaRegra", label: "Temperatura fora da regra", type: "select", options: yesNo },
  area: { key: "area", label: "Área", type: "text" },
  turnoLimpeza: { key: "turnoLimpeza", label: "Turno", type: "select", options: [
    { value: "", label: "Todos" }, { value: "MANHA", label: "Manhã" }, { value: "TARDE", label: "Tarde" }, { value: "NOITE", label: "Noite" }
  ] },
  supervisor: { key: "supervisor", label: "Supervisor", type: "text" },
  statusPlanoLimpeza: { key: "statusPlanoLimpeza", label: "Status", type: "select", options: [
    { value: "", label: "Todos" }, { value: "PENDENTE", label: "Pendente" }, { value: "AGUARDANDO_SUPERVISOR", label: "Aguardando supervisor" }, { value: "CONCLUIDO", label: "Concluído" }
  ] },
  semana: { key: "semana", label: "Semana", type: "number", placeholder: "1 a 53" },
  mes: { key: "mes", label: "Mês", type: "number", placeholder: "1 a 12" },
  ano: { key: "ano", label: "Ano", type: "number", placeholder: "Ex.: 2026" },
  diaSemana: { key: "diaSemana", label: "Dia da semana", type: "text", placeholder: "Ex.: segunda" },
  origem: { key: "origem", label: "Origem / módulo", type: "select", options: [
    { value: "", label: "Todas" }, { value: "TEMPERATURA", label: "Temperatura" }, { value: "LIMPEZA", label: "Limpeza" },
    { value: "OLEO", label: "Óleo" }, { value: "RECEBIMENTO", label: "Recebimento" }, { value: "HORTIFRUTI", label: "Hortifruti" },
    { value: "BUFFET_AMOSTRAS", label: "Buffet / Amostras" }, { value: "MANUAL", label: "Manual / Outros" }
  ] },
  usuario: { key: "usuario", label: "Usuário que abriu", type: "text" },
  statusChamado: { key: "statusChamado", label: "Status", type: "select", options: [
    { value: "", label: "Todos" }, { value: "ABERTO", label: "Aberto" }, { value: "EM_ANDAMENTO", label: "Em andamento" },
    { value: "CONCLUIDO", label: "Concluído" }, { value: "CANCELADO", label: "Cancelado" }
  ] },
  chamadoSituacao: { key: "chamadoSituacao", label: "Situação", type: "select", options: [
    { value: "", label: "Todas" }, { value: "CONCLUIDO", label: "Concluído" }, { value: "PENDENTE", label: "Pendente" }
  ] }
};

const general = ["dataInicial", "dataFinal", "moduloEscopo", "statusAuditoria", "responsavel", "naoConformidade", "acaoCorretiva", "assinaturaStatus"] as ReportFilterKey[];
const hort = ["dataInicial", "dataFinal", "hortifruti", "produtoUtilizado", "responsavel", "statusHortifruti", "comObservacao"] as ReportFilterKey[];
const temp = ["dataInicial", "dataFinal", "equipamento", "turnoTemperatura", "statusTemperatura", "responsavel", "temperaturaStatus", "acaoCorretiva", "comFoto", "semFotoObrigatoria"] as ReportFilterKey[];
const oleo = ["dataInicial", "dataFinal", "fita", "temperatura", "responsavel", "statusOleo", "usoEquipamento", "comObservacao"] as ReportFilterKey[];
const receb = ["dataInicial", "dataFinal", "fornecedor", "notaFiscal", "produto", "lote", "sif", "sifNa", "temperatura", "transporte", "aspecto", "embalagem", "responsavelConferencia", "statusNota", "acaoCorretiva"] as ReportFilterKey[];
const buffet = ["dataInicial", "dataFinal", "servico", "item", "classificacao", "itemExtra", "acaoCorretiva", "responsavel", "statusBuffet", "temperaturaForaRegra"] as ReportFilterKey[];
const diario = ["dataInicial", "dataFinal", "area", "turnoLimpeza", "responsavel", "supervisor", "statusPlanoLimpeza"] as ReportFilterKey[];
const semanal = ["semana", "mes", "ano", "area", "item", "responsavel", "supervisor", "statusPlanoLimpeza", "diaSemana"] as ReportFilterKey[];
const chamados = ["dataInicial", "dataFinal", "origem", "usuario", "statusChamado", "comFoto", "chamadoSituacao"] as ReportFilterKey[];

function report(id: string, label: string, description: string, filterKeys: ReportFilterKey[]): ReportDefinition {
  return { id, label, description, filterKeys };
}

export const REPORT_MODULES: ReportModuleDefinition[] = [
  { id: "geral", label: "Geral / Auditoria Completa", reports: [
    report("resumo-geral", "Resumo Geral de Auditoria", "Visão consolidada dos módulos no período.", general),
    report("pendencias-gerais", "Pendências Gerais", "Pendências operacionais e chamados em aberto.", general),
    report("nao-conformidades-gerais", "Não Conformidades Gerais", "Alertas, críticos e não conformidades.", general),
    report("assinaturas-gerais", "Assinaturas Gerais", "Assinaturas, registros sem assinatura e fechamentos.", general)
  ] },
  { id: "higienizacao-hortifruti", label: "Higienização de Hortifruti", reports: [
    report("registros-periodo", "Registros por Período", "Lista de higienizações no período.", hort),
    report("registros-responsavel", "Registros por Responsável", "Registros filtrados por responsável.", hort),
    report("registros-observacao", "Registros com Observação", "Registros que possuem observações.", hort),
    report("pendencias-incompletos", "Pendências / Registros Incompletos", "Registros com dados operacionais ausentes.", hort)
  ] },
  { id: "controle-temperatura-equipamentos", label: "Controle de Temperatura de Equipamentos", reports: [
    report("temperaturas-equipamento", "Temperaturas por Equipamento", "Aferições por equipamento.", temp),
    report("fora-faixa", "Temperaturas Fora da Faixa", "Aferições em alerta ou crítico.", temp),
    report("acoes-corretivas", "Ações Corretivas", "Registros com ação corretiva.", temp),
    report("foto-obrigatoria", "Registros com Foto Obrigatória", "Alertas/críticos e evidências fotográficas.", temp),
    report("pendencias-periodo", "Pendências por Período", "Registros críticos sem evidência quando aplicável.", temp)
  ] },
  { id: "controle-qualidade-oleo", label: "Controle de Qualidade do Óleo", reports: [
    report("registros-periodo", "Registros por Período", "Registros de qualidade do óleo.", oleo),
    report("controle-fita", "Controle de Fita", "Histórico por percentual da fita.", oleo),
    report("temperatura-oleo", "Temperatura do Óleo", "Registros com temperatura informada.", oleo),
    report("sem-uso", "Equipamento Inutilizado / Sem Uso", "Períodos sem utilização.", oleo),
    report("acoes-corretivas", "Ações Corretivas", "Status que exigem acompanhamento.", oleo)
  ] },
  { id: "rastreabilidade-recebimento", label: "Rastreabilidade de Recebimento", reports: [
    report("notas-recebidas", "Notas Recebidas", "Notas e itens recebidos.", receb),
    report("notas-pendentes", "Notas Pendentes de Conferência", "Notas ainda não finalizadas.", receb),
    report("itens-recebidos", "Itens Recebidos", "Detalhamento dos itens recebidos.", receb),
    report("produtos-lote", "Produtos por Lote", "Rastreio por produto e lote.", receb),
    report("produtos-nao-conformes", "Produtos com Não Conformidade", "Itens recebidos com não conformidade.", receb),
    report("produtos-sif-na", "Produtos com SIF / NA", "Itens com SIF informado ou não aplicável.", receb)
  ] },
  { id: "controle-buffet-amostras", label: "Controle de Buffet / Amostras", reports: [
    report("registros-servico", "Registros por Serviço", "Registros por serviço do buffet.", buffet),
    report("itens-servidos", "Itens Servidos", "Itens padrão e extras servidos.", buffet),
    report("itens-extras", "Itens Extras", "Itens extras adicionados ao serviço.", buffet),
    report("temperaturas-fora-regra", "Temperaturas Fora da Regra", "Itens em alerta ou crítico.", buffet),
    report("acoes-corretivas", "Ações Corretivas", "Itens com ação corretiva.", buffet),
    report("alimentos-descartados", "Alimentos Descartados", "Registros com descarte indicado.", buffet)
  ] },
  { id: "plano-limpeza-diario", label: "Plano de Limpeza Diário", reports: [
    report("execucoes-area", "Execuções por Área", "Checklists diários por área.", diario),
    report("execucoes-turno", "Execuções por Turno", "Checklists diários por turno.", diario),
    report("pendencias", "Pendências", "Pendências do plano diário.", diario),
    report("aguardando-supervisor", "Aguardando Supervisor", "Itens aguardando supervisor.", diario),
    report("assinaturas-responsavel", "Assinaturas por Responsável", "Assinaturas do responsável e supervisor.", diario)
  ] },
  { id: "plano-limpeza-semanal", label: "Plano de Limpeza Semanal", reports: [
    report("execucoes-area", "Execuções Semanais por Área", "Execuções semanais por área.", semanal),
    report("execucoes-item", "Execuções Semanais por Item", "Execuções por item semanal.", semanal),
    report("pendencias", "Pendências Semanais", "Itens semanais pendentes.", semanal),
    report("aguardando-supervisor", "Itens Aguardando Supervisor", "Itens semanais aguardando supervisor.", semanal),
    report("assinaturas-responsavel", "Assinaturas por Responsável", "Assinaturas semanais por responsável.", semanal)
  ] },
  { id: "chamados-manutencao", label: "Chamados de Manutenção", reports: [
    report("chamados-periodo", "Chamados por Período", "Chamados abertos no período.", chamados),
    report("chamados-status", "Chamados por Status", "Chamados filtrados por status.", chamados),
    report("chamados-origem", "Chamados por Origem", "Chamados por módulo/origem.", chamados),
    report("chamados-usuario", "Chamados por Usuário", "Chamados por usuário de abertura.", chamados),
    report("chamados-pendentes", "Chamados Pendentes", "Chamados ainda pendentes.", chamados),
    report("chamados-concluidos", "Chamados Concluídos", "Chamados concluídos no período.", chamados)
  ] }
];

export function getReportModule(moduleId: string | undefined): ReportModuleDefinition {
  return REPORT_MODULES.find((module) => module.id === moduleId) ?? REPORT_MODULES[0];
}

export function getReportDefinition(moduleId: string | undefined, reportId: string | undefined): ReportDefinition {
  const moduleDefinition = getReportModule(moduleId);
  return moduleDefinition.reports.find((reportItem) => reportItem.id === reportId) ?? moduleDefinition.reports[0];
}

export function getFiltersForReport(moduleId: string | undefined, reportId: string | undefined): ReportFilterDefinition[] {
  return getReportDefinition(moduleId, reportId).filterKeys.map((key) => FILTER_DEFINITIONS[key]);
}
