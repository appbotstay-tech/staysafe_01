"use client";

import { useMemo, useState } from "react";

import { generateEtiquetaAction } from "./actions";
import { INPUT_CLASS, UNIT_OPTIONS } from "./constants";

type Step = "grupo" | "subgrupo" | "produto" | "metodo" | "conferir";

export type LabelGroupOption = {
  id: number;
  nome: string;
  grupoPaiId: number | null;
  icone: string | null;
};

export type LabelProductOption = {
  id: number;
  nome: string;
  unidadePadrao: string;
  grupos: number[];
};

export type LabelMethodOption = {
  id: number;
  nome: string;
  tipo: string | null;
  icone: string | null;
};

export type LabelRuleOption = {
  id: number;
  produtoId: number | null;
  grupoId: number | null;
  metodoId: number;
  validadeDias: number | null;
  validadeHoras: number | null;
  exigeValidadeManual: boolean;
  temperaturaReferencia: string | null;
  prioridade: number;
};

type LabelGeneratorFormProps = {
  grupos: LabelGroupOption[];
  produtos: LabelProductOption[];
  metodos: LabelMethodOption[];
  regras: LabelRuleOption[];
  responsavelNome: string;
  defaultDate: string;
  defaultTime: string;
  returnTo: string;
};

const MANUAL_PRODUCT_ID = -1;
const MANUAL_METHOD_ID = -1;

function matchesSearch(value: string, search: string): boolean {
  return value.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"));
}

function addValidityPreview(params: {
  dateInput: string;
  timeInput: string;
  days: number | null;
  hours: number | null;
}): { date: string; time: string } {
  const [year, month, day] = params.dateInput.split("-").map((value) => Number(value));
  const [hour = 0, minute = 0] = params.timeInput.split(":").map((value) => Number(value));
  if (!year || !month || !day) {
    return { date: "", time: params.timeInput };
  }

  const date = new Date(year, month - 1, day, hour, minute);
  date.setDate(date.getDate() + (params.days ?? 0));
  date.setHours(date.getHours() + (params.hours ?? 0));

  return {
    date: [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-"),
    time: [date.getHours(), date.getMinutes()]
      .map((value) => String(value).padStart(2, "0"))
      .join(":")
  };
}

function formatDateBr(dateInput: string): string {
  const [year, month, day] = dateInput.split("-");
  return year && month && day ? `${day}/${month}/${year}` : "-";
}

function validityLabel(rule: LabelRuleOption | null): string {
  if (!rule || rule.exigeValidadeManual) {
    return "Validade manual";
  }

  const parts = [];
  if (rule.validadeDias) parts.push(`${rule.validadeDias} dia(s)`);
  if (rule.validadeHoras) parts.push(`${rule.validadeHoras} hora(s)`);
  return parts.join(" + ") || "Validade manual";
}

function StepHeader({
  title,
  subtitle,
  onBack
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
      </div>
      {onBack ? (
        <button type="button" onClick={onBack} className="btn-secondary">
          Voltar
        </button>
      ) : null}
    </div>
  );
}

function SearchField({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={placeholder}
      className={INPUT_CLASS}
    />
  );
}

function ChoiceCard({
  title,
  details,
  badge,
  onClick
}: {
  title: string;
  details?: string | null;
  badge?: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-28 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-500 dark:hover:bg-emerald-950"
    >
      {badge ? (
        <span className="mb-2 inline-flex rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-300">
          {badge}
        </span>
      ) : null}
      <span className="block text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </span>
      {details ? (
        <span className="mt-2 block text-sm text-slate-600 dark:text-slate-300">
          {details}
        </span>
      ) : null}
    </button>
  );
}

export function LabelGeneratorForm({
  grupos,
  produtos,
  metodos,
  regras,
  responsavelNome,
  defaultDate,
  defaultTime,
  returnTo
}: LabelGeneratorFormProps) {
  const [step, setStep] = useState<Step>("grupo");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [groupSearch, setGroupSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [manualProductName, setManualProductName] = useState("");
  const [manualMethodName, setManualMethodName] = useState("");
  const [manualValidityDate, setManualValidityDate] = useState("");
  const [validadeOriginal, setValidadeOriginal] = useState("");
  const [marcaFornecedor, setMarcaFornecedor] = useState("");
  const [sif, setSif] = useState("");
  const [lote, setLote] = useState("");
  const [observacao, setObservacao] = useState("");
  const [copies, setCopies] = useState("1");

  const mainGroups = useMemo(
    () =>
      grupos
        .filter((grupo) => grupo.grupoPaiId === null && matchesSearch(grupo.nome, groupSearch))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [grupos, groupSearch]
  );
  const selectedGroup = grupos.find((grupo) => grupo.id === selectedGroupId) ?? null;
  const subgroups = grupos.filter((grupo) => grupo.grupoPaiId === selectedGroupId);
  const selectedSubgroup = grupos.find((grupo) => grupo.id === selectedSubgroupId) ?? null;
  const leafGroupId = selectedSubgroupId ?? selectedGroupId;
  const selectedProduct =
    produtos.find((produto) => produto.id === selectedProductId) ?? null;
  const isManualProduct = selectedProductId === MANUAL_PRODUCT_ID;
  const selectedMethod =
    metodos.find((metodo) => metodo.id === selectedMethodId) ?? null;
  const selectedRule = regras.find((regra) => regra.id === selectedRuleId) ?? null;

  const filteredProducts = useMemo(() => {
    if (!leafGroupId) return [];
    return produtos
      .filter(
        (produto) =>
          produto.grupos.includes(leafGroupId) && matchesSearch(produto.nome, productSearch)
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [leafGroupId, productSearch, produtos]);

  function bestRuleForMethod(methodId: number): LabelRuleOption | null {
    const productId = selectedProduct?.id ?? null;
    const candidates = regras
      .filter((regra) => regra.metodoId === methodId)
      .filter((regra) => {
        if (productId && regra.produtoId === productId) return true;
        if (selectedSubgroupId && regra.grupoId === selectedSubgroupId) return true;
        if (selectedGroupId && regra.grupoId === selectedGroupId) return true;
        return regra.produtoId === null && regra.grupoId === null;
      });

    return (
      candidates.sort((a, b) => {
        const score = (rule: LabelRuleOption) => {
          if (productId && rule.produtoId === productId) return 400 + rule.prioridade;
          if (selectedSubgroupId && rule.grupoId === selectedSubgroupId) {
            return 300 + rule.prioridade;
          }
          if (selectedGroupId && rule.grupoId === selectedGroupId) {
            return 200 + rule.prioridade;
          }
          return 100 + rule.prioridade;
        };
        return score(b) - score(a);
      })[0] ?? null
    );
  }

  const methodOptions = isManualProduct
    ? metodos.map((metodo) => ({ metodo, regra: null }))
    : metodos
        .map((metodo) => ({ metodo, regra: bestRuleForMethod(metodo.id) }))
        .filter((option) => option.regra !== null);

  const needsManualValidity = isManualProduct || !selectedRule || selectedRule.exigeValidadeManual;
  const previewValidity = needsManualValidity
    ? { date: manualValidityDate, time: defaultTime }
    : addValidityPreview({
        dateInput: defaultDate,
        timeInput: defaultTime,
        days: selectedRule.validadeDias,
        hours: selectedRule.validadeHoras
      });
  const previewProductName = isManualProduct
    ? manualProductName.trim() || "Produto manual"
    : selectedProduct?.nome ?? "-";
  const previewMethodName =
    (selectedMethod?.nome ?? manualMethodName.trim()) || "Validade manual";
  const selectedUnit = unit || selectedProduct?.unidadePadrao || "";
  const canSubmit =
    quantity.trim() &&
    selectedUnit &&
    (isManualProduct ? manualProductName.trim() : selectedProduct) &&
    (selectedMethod || manualMethodName.trim()) &&
    (!needsManualValidity || manualValidityDate);

  function selectGroup(groupId: number) {
    setSelectedGroupId(groupId);
    setSelectedSubgroupId(null);
    setSelectedProductId(null);
    setSelectedMethodId(null);
    setSelectedRuleId(null);
    setProductSearch("");
    const hasSubgroups = grupos.some((grupo) => grupo.grupoPaiId === groupId);
    setStep(hasSubgroups ? "subgrupo" : "produto");
  }

  function selectProduct(productId: number) {
    setSelectedProductId(productId);
    setSelectedMethodId(null);
    setSelectedRuleId(null);
    setManualMethodName("");
    const product = produtos.find((item) => item.id === productId);
    setUnit(product?.unidadePadrao ?? "");
    setStep("metodo");
  }

  function selectMethod(methodId: number, ruleId: number | null) {
    setSelectedMethodId(methodId === MANUAL_METHOD_ID ? null : methodId);
    setSelectedRuleId(ruleId);
    if (methodId !== MANUAL_METHOD_ID) {
      setManualMethodName("");
    }
    setStep("conferir");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-5">
        {[
          ["grupo", "Grupo"],
          ["subgrupo", "Subgrupo"],
          ["produto", "Produto"],
          ["metodo", "Conservação"],
          ["conferir", "Impressão"]
        ].map(([key, label], index) => (
          <div
            key={key}
            className={`rounded-lg border px-3 py-2 text-center text-xs font-semibold ${
              step === key
                ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200"
                : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>

      {step === "grupo" ? (
        <section className="space-y-4">
          <StepHeader
            title="Selecionar grupo"
            subtitle="Selecione o grupo do produto que deseja etiquetar."
          />
          <SearchField
            value={groupSearch}
            onChange={setGroupSearch}
            placeholder="Buscar grupo"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mainGroups.map((grupo) => (
              <ChoiceCard
                key={grupo.id}
                title={grupo.nome}
                badge={grupo.icone}
                details="Abrir grupo"
                onClick={() => selectGroup(grupo.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {step === "subgrupo" ? (
        <section className="space-y-4">
          <StepHeader
            title="Selecionar subgrupo"
            subtitle="Selecione o subgrupo do produto que deseja etiquetar."
            onBack={() => setStep("grupo")}
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {subgroups.map((grupo) => (
              <ChoiceCard
                key={grupo.id}
                title={grupo.nome}
                badge={selectedGroup?.nome}
                onClick={() => {
                  setSelectedSubgroupId(grupo.id);
                  setSelectedProductId(null);
                  setSelectedMethodId(null);
                  setSelectedRuleId(null);
                  setStep("produto");
                }}
              />
            ))}
          </div>
        </section>
      ) : null}

      {step === "produto" ? (
        <section className="space-y-4">
          <StepHeader
            title="Selecionar produto"
            subtitle="Selecione o produto que deseja etiquetar."
            onBack={() => setStep(subgroups.length ? "subgrupo" : "grupo")}
          />
          <SearchField
            value={productSearch}
            onChange={setProductSearch}
            placeholder="Buscar produto"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ChoiceCard
              title="Produto manual"
              badge="Exceção"
              details="Use apenas quando o produto ainda não estiver cadastrado."
              onClick={() => {
                setSelectedProductId(MANUAL_PRODUCT_ID);
                setSelectedMethodId(null);
                setSelectedRuleId(null);
                setUnit("");
                setStep("metodo");
              }}
            />
            {filteredProducts.map((produto) => (
              <ChoiceCard
                key={produto.id}
                title={produto.nome}
                badge={produto.unidadePadrao}
                onClick={() => selectProduct(produto.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {step === "metodo" ? (
        <section className="space-y-4">
          <StepHeader
            title="Selecionar conservação"
            subtitle="Selecione uma conservação para definir a validade da etiqueta."
            onBack={() => setStep("produto")}
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {methodOptions.map(({ metodo, regra }) => (
              <ChoiceCard
                key={metodo.id}
                title={metodo.nome}
                badge={metodo.tipo}
                details={[
                  regra ? validityLabel(regra) : "Validade manual",
                  regra?.temperaturaReferencia
                ]
                  .filter(Boolean)
                  .join(" • ")}
                onClick={() => selectMethod(metodo.id, regra?.id ?? null)}
              />
            ))}
            <ChoiceCard
              title="Validade manual"
              badge="Manual"
              details="Informe método e validade na conferência."
              onClick={() => selectMethod(MANUAL_METHOD_ID, null)}
            />
          </div>
        </section>
      ) : null}

      {step === "conferir" ? (
        <section className="space-y-4">
          <StepHeader
            title="Imprimir etiqueta"
            subtitle="Sua etiqueta está pronta para conferência. Preencha informações adicionais, se necessário."
            onBack={() => setStep("metodo")}
          />

          <form action={generateEtiquetaAction} className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="produtoManual" value={isManualProduct ? "true" : "false"} />
            <input type="hidden" name="produtoId" value={selectedProduct?.id ?? ""} />
            <input type="hidden" name="grupoId" value={selectedGroup?.id ?? ""} />
            <input type="hidden" name="subgrupoId" value={selectedSubgroup?.id ?? ""} />
            <input type="hidden" name="metodoId" value={selectedMethod?.id ?? ""} />
            <input type="hidden" name="regraId" value={selectedRule?.id ?? ""} />
            <input type="hidden" name="validadeManual" value={needsManualValidity ? "true" : "false"} />

            <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-2">
              {isManualProduct ? (
                <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                  Nome do produto manual *
                  <input
                    name="produtoManualNome"
                    value={manualProductName}
                    onChange={(event) => setManualProductName(event.currentTarget.value)}
                    required
                    className={INPUT_CLASS}
                  />
                </label>
              ) : null}

              {!selectedMethod ? (
                <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                  Método/conservação manual *
                  <input
                    name="metodoManualNome"
                    value={manualMethodName}
                    onChange={(event) => setManualMethodName(event.currentTarget.value)}
                    required
                    className={INPUT_CLASS}
                  />
                </label>
              ) : null}

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Quantidade *
                <input
                  name="quantidade"
                  value={quantity}
                  onChange={(event) => setQuantity(event.currentTarget.value)}
                  required
                  className={INPUT_CLASS}
                />
              </label>

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Unidade *
                <select
                  name="unidadeManual"
                  value={selectedUnit}
                  onChange={(event) => setUnit(event.currentTarget.value)}
                  required
                  className={INPUT_CLASS}
                >
                  <option value="">Selecione</option>
                  {UNIT_OPTIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              {needsManualValidity ? (
                <label className="text-sm text-slate-700 dark:text-slate-200">
                  Data de validade manual *
                  <input
                    type="date"
                    name="dataValidadeManual"
                    value={manualValidityDate}
                    onChange={(event) => setManualValidityDate(event.currentTarget.value)}
                    required
                    className={INPUT_CLASS}
                  />
                </label>
              ) : null}

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Validade original
                <input
                  type="date"
                  name="validadeOriginal"
                  value={validadeOriginal}
                  onChange={(event) => setValidadeOriginal(event.currentTarget.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Marca/fornecedor
                <input
                  name="marcaFornecedor"
                  value={marcaFornecedor}
                  onChange={(event) => setMarcaFornecedor(event.currentTarget.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="text-sm text-slate-700 dark:text-slate-200">
                SIF
                <input
                  name="sif"
                  value={sif}
                  onChange={(event) => setSif(event.currentTarget.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Lote
                <input
                  name="lote"
                  value={lote}
                  onChange={(event) => setLote(event.currentTarget.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="text-sm text-slate-700 dark:text-slate-200">
                Número de cópias
                <input
                  type="number"
                  min={1}
                  max={20}
                  name="numeroCopias"
                  value={copies}
                  onChange={(event) => setCopies(event.currentTarget.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <label className="text-sm text-slate-700 dark:text-slate-200 md:col-span-2">
                Observação
                <textarea
                  name="observacao"
                  rows={3}
                  value={observacao}
                  onChange={(event) => setObservacao(event.currentTarget.value)}
                  className={INPUT_CLASS}
                />
              </label>

              <div className="btn-group md:col-span-2">
                <button type="submit" className="btn-primary" disabled={!canSubmit}>
                  Gerar etiqueta / Salvar histórico
                </button>
                <button type="button" onClick={() => setStep("metodo")} className="btn-secondary">
                  Voltar
                </button>
              </div>
            </div>

            <aside className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">
                Preview
              </p>
              <h3 className="mt-2 text-xl font-black uppercase text-slate-900 dark:text-slate-100">
                {previewProductName}
              </h3>
              <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                <p>Grupo: {selectedSubgroup?.nome || selectedGroup?.nome || "-"}</p>
                <p>Conservação: {previewMethodName}</p>
                <p>
                  Manipulação: {formatDateBr(defaultDate)} {defaultTime}
                </p>
                <p>
                  Validade: {formatDateBr(previewValidity.date)} {previewValidity.time}
                </p>
                <p>Resp.: {responsavelNome}</p>
                <p>
                  Quantidade: {quantity || "-"} {selectedUnit}
                </p>
              </div>
            </aside>
          </form>
        </section>
      ) : null}
    </div>
  );
}
