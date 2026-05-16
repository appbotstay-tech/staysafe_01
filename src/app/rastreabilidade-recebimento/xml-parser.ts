import { parseXmlDateToDatabase } from "./utils";

export type ParsedRecebimentoXmlItem = {
  produto: string;
  codigoProdutoXml: string | null;
  ncm: string | null;
  cfop: string | null;
  quantidadeComprada: number | null;
  unidadeMedidaCompra: string | null;
  valorUnitario: number | null;
  valorTotalItem: number | null;
  quantidadeTributavel: number | null;
  unidadeMedidaTributavel: string | null;
  valorUnitarioTributavel: number | null;
  fornecedor: string;
  notaFiscal: string;
  lote: string | null;
  dataFabricacao: Date | null;
  dataValidade: Date | null;
};

type ParseXmlResult = {
  fornecedor: string;
  notaFiscal: string;
  chaveNFe: string | null;
  cnpjFornecedor: string | null;
  serieNota: string | null;
  items: ParsedRecebimentoXmlItem[];
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function cleanTagValue(value: string): string {
  return decodeXmlEntities(value.replace(/<!\[CDATA\[|\]\]>/g, "").trim());
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractFirstTagValue(xml: string, tag: string): string {
  const pattern = new RegExp(
    `<(?:\\w+:)?${escapeRegExp(tag)}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${escapeRegExp(tag)}>`,
    "i"
  );
  const match = xml.match(pattern);

  return match ? cleanTagValue(match[1]) : "";
}

function extractAllTagBlocks(xml: string, tag: string): string[] {
  const pattern = new RegExp(
    `<(?:\\w+:)?${escapeRegExp(tag)}\\b[^>]*>[\\s\\S]*?</(?:\\w+:)?${escapeRegExp(tag)}>`,
    "gi"
  );

  const matches = xml.match(pattern);
  return matches ?? [];
}

function tryExtractValue(block: string, tags: string[]): string {
  for (const tag of tags) {
    const value = extractFirstTagValue(block, tag);
    if (value) {
      return value;
    }
  }

  return "";
}

function extractFornecedor(xml: string): string {
  const emitBlock = extractAllTagBlocks(xml, "emit")[0] ?? "";

  return (
    tryExtractValue(emitBlock, ["xNome", "xFant"]) ||
    tryExtractValue(xml, ["xNome", "xFant"]) ||
    "Fornecedor não informado"
  );
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function nullIfEmpty(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function parseXmlNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized =
    trimmed.includes(",") && trimmed.includes(".")
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed.replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function extractNotaFiscal(xml: string): string {
  return (
    tryExtractValue(xml, ["nNF", "cNF"]) ||
    "NF não informada"
  );
}

function extractSerieNota(xml: string): string | null {
  const serie = tryExtractValue(xml, ["serie", "nSerie"]).trim();
  return serie || null;
}

function extractCnpjFornecedor(xml: string): string | null {
  const emitBlock = extractAllTagBlocks(xml, "emit")[0] ?? xml;
  const cnpjOrCpf = tryExtractValue(emitBlock, ["CNPJ", "CPF"]).trim();
  if (!cnpjOrCpf) {
    return null;
  }

  const normalized = onlyDigits(cnpjOrCpf);
  return normalized || null;
}

function extractChaveNFe(xml: string): string | null {
  const keyFromTag = tryExtractValue(xml, ["chNFe"]).trim();
  const normalizedFromTag = onlyDigits(keyFromTag);
  if (normalizedFromTag.length === 44) {
    return normalizedFromTag;
  }

  const idMatch = xml.match(/\bId=["']NFe(\d{44})["']/i);
  if (idMatch?.[1]) {
    return idMatch[1];
  }

  return null;
}

function extractRastroBlock(detBlock: string): string {
  return extractAllTagBlocks(detBlock, "rastro")[0] ?? "";
}

function parseDetBlock(
  detBlock: string,
  fornecedor: string,
  notaFiscal: string
): ParsedRecebimentoXmlItem | null {
  const prodBlock = extractAllTagBlocks(detBlock, "prod")[0] ?? detBlock;

  const produto = tryExtractValue(prodBlock, ["xProd", "cProd", "xNome"]).trim();
  if (!produto) {
    return null;
  }

  const rastroBlock = extractRastroBlock(detBlock);
  const loteRaw = tryExtractValue(rastroBlock || detBlock, [
    "nLote",
    "lote",
    "nLoteProd"
  ]);
  const dataFabRaw = tryExtractValue(rastroBlock || detBlock, [
    "dFab",
    "dFabricacao",
    "dataFabricacao"
  ]);
  const dataValidadeRaw = tryExtractValue(rastroBlock || detBlock, [
    "dVal",
    "dValidade",
    "dVenc",
    "dataValidade"
  ]);

  return {
    produto,
    codigoProdutoXml: nullIfEmpty(tryExtractValue(prodBlock, ["cProd"])),
    ncm: nullIfEmpty(tryExtractValue(prodBlock, ["NCM"])),
    cfop: nullIfEmpty(tryExtractValue(prodBlock, ["CFOP"])),
    quantidadeComprada: parseXmlNumber(tryExtractValue(prodBlock, ["qCom"])),
    unidadeMedidaCompra: nullIfEmpty(tryExtractValue(prodBlock, ["uCom"])),
    valorUnitario: parseXmlNumber(tryExtractValue(prodBlock, ["vUnCom"])),
    valorTotalItem: parseXmlNumber(tryExtractValue(prodBlock, ["vProd"])),
    quantidadeTributavel: parseXmlNumber(tryExtractValue(prodBlock, ["qTrib"])),
    unidadeMedidaTributavel: nullIfEmpty(tryExtractValue(prodBlock, ["uTrib"])),
    valorUnitarioTributavel: parseXmlNumber(tryExtractValue(prodBlock, ["vUnTrib"])),
    fornecedor,
    notaFiscal,
    lote: loteRaw || null,
    dataFabricacao: dataFabRaw ? parseXmlDateToDatabase(dataFabRaw) : null,
    dataValidade: dataValidadeRaw ? parseXmlDateToDatabase(dataValidadeRaw) : null
  };
}

export function parseRecebimentoXml(xmlContent: string): ParseXmlResult {
  const xml = xmlContent.trim();
  if (!xml) {
    throw new Error("Arquivo XML vazio.");
  }

  const fornecedor = extractFornecedor(xml);
  const notaFiscal = extractNotaFiscal(xml);
  const chaveNFe = extractChaveNFe(xml);
  const cnpjFornecedor = extractCnpjFornecedor(xml);
  const serieNota = extractSerieNota(xml);

  const detBlocks = extractAllTagBlocks(xml, "det");
  const items = detBlocks
    .map((detBlock) => parseDetBlock(detBlock, fornecedor, notaFiscal))
    .filter((item): item is ParsedRecebimentoXmlItem => item !== null);

  if (items.length === 0) {
    const produtoUnico = tryExtractValue(xml, ["xProd", "cProd", "xNome"]).trim();

    if (!produtoUnico) {
      throw new Error(
        "Não foi possível identificar itens no XML. Verifique se o arquivo da NF está no formato esperado."
      );
    }

    items.push({
      produto: produtoUnico,
      codigoProdutoXml: nullIfEmpty(tryExtractValue(xml, ["cProd"])),
      ncm: nullIfEmpty(tryExtractValue(xml, ["NCM"])),
      cfop: nullIfEmpty(tryExtractValue(xml, ["CFOP"])),
      quantidadeComprada: parseXmlNumber(tryExtractValue(xml, ["qCom"])),
      unidadeMedidaCompra: nullIfEmpty(tryExtractValue(xml, ["uCom"])),
      valorUnitario: parseXmlNumber(tryExtractValue(xml, ["vUnCom"])),
      valorTotalItem: parseXmlNumber(tryExtractValue(xml, ["vProd"])),
      quantidadeTributavel: parseXmlNumber(tryExtractValue(xml, ["qTrib"])),
      unidadeMedidaTributavel: nullIfEmpty(tryExtractValue(xml, ["uTrib"])),
      valorUnitarioTributavel: parseXmlNumber(tryExtractValue(xml, ["vUnTrib"])),
      fornecedor,
      notaFiscal,
      lote: null,
      dataFabricacao: null,
      dataValidade: null
    });
  }

  return {
    fornecedor,
    notaFiscal,
    chaveNFe,
    cnpjFornecedor,
    serieNota,
    items
  };
}
