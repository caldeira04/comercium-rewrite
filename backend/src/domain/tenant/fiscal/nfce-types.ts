export type LocalFiscalStatus =
    | "pendente"
    | "processando"
    | "autorizado"
    | "erro_autorizacao"
    | "denegado"
    | "cancelado"

export type FocusNfceStatus =
    | "autorizado"
    | "cancelado"
    | "erro_autorizacao"
    | "denegado"
    | "processando_autorizacao"

export type NfceItemInput = {
    numeroItem: number
    codigoNcm: string
    codigoProduto: string
    descricao: string
    quantidadeComercial: number
    quantidadeTributavel: number
    cfop: string
    valorUnitarioComercial: number
    valorUnitarioTributavel: number
    valorBruto: number
    unidadeComercial: string
    unidadeTributavel: string
    icmsOrigem: string
    icmsSituacaoTributaria: string
}

export type NfcePagamentoInput = {
    formaPagamento: string
    valorPagamento: number
}

export type NfcePayload = {
    cnpjEmitente: string
    dataEmissao: string
    presencaComprador: string
    modalidadeFrete: string
    localDestino: string
    naturezaOperacao: string
    items: Array<{
        numero_item: string
        codigo_ncm: string
        codigo_produto: string
        descricao: string
        quantidade_comercial: number
        quantidade_tributavel: number
        cfop: string
        valor_unitario_comercial: number
        valor_unitario_tributavel: number
        valor_bruto: number
        unidade_comercial: string
        unidade_tributavel: string
        icms_origem: string
        icms_situacao_tributaria: string
    }>
    formas_pagamento: Array<{
        forma_pagamento: string
        valor_pagamento: number
    }>
    informacoes_adicionais_contribuinte?: string
    numero?: string
    serie?: string
}

export type FocusNfceResponse = {
    cnpj_emitente?: string
    ref?: string
    status?: string
    status_sefaz?: string
    mensagem_sefaz?: string
    chave_nfe?: string | null
    numero?: string | null
    serie?: string | null
    caminho_xml_nota_fiscal?: string | null
    caminho_danfe?: string | null
    qrcode_url?: string | null
    url_consulta_nf?: string | null
    caminho_xml_cancelamento?: string | null
    numero_protocolo?: string | null
    contingencia_offline?: boolean
    [key: string]: unknown
}

export type FocusErrorBody = {
    codigo?: string
    mensagem?: string
    [key: string]: unknown
}
