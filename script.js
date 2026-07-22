const STORAGE_KEY = "estoqueMovimentacoes";
const STOCK_KEY = "estoqueQuantidadesIniciais";
const CENTRO_DISTRIBUICAO = "Centro de Distribuição";
const ITENS = ["Token", "Cartão", "Leitora"];
const LOCAIS = [
  "Centro de Distribuição",
  "ÁGUAS LINDAS",
  "ANÁPOLIS",
  "ARAGUAÍNA",
  "ASA NORTE",
  "BUENO",
  "CAMPINAS - GO",
  "CEILÂNDIA",
  "CVP",
  "GAMA",
  "LUZIÂNIA",
  "MATRIZ",
  "PALMAS",
  "PÁTIO",
  "PLANALTINA",
  "PORTO NACIONAL",
  "SAMAMBAIA",
  "SOBRADINHO",
  "TTC",
  "VALPARAÍSO",
  "CVR"
];

const form = document.querySelector("#movementForm");
const tableBody = document.querySelector("#movementTable");
const emptyState = document.querySelector("#emptyState");
const totalMovimentacoes = document.querySelector("#totalMovimentacoes");
const limparTudoButton = document.querySelector("#limparTudo");
const dataEnvioInput = document.querySelector("#dataEnvio");
const monthFilterButton = document.querySelector("#monthFilterButton");
const monthFilterLabel = document.querySelector("#monthFilterLabel");
const monthPicker = document.querySelector("#monthPicker");
const monthPickerYear = document.querySelector("#monthPickerYear");
const monthGrid = document.querySelector("#monthGrid");
const previousYearButton = document.querySelector("#previousYear");
const nextYearButton = document.querySelector("#nextYear");
const currentMonthFilterButton = document.querySelector("#currentMonthFilter");
const clearDateFilterButton = document.querySelector("#clearDateFilter");
const origemSelect = document.querySelector("#origem");
const destinoSelect = document.querySelector("#destino");
const origemOutroInput = document.querySelector("#origemOutro");
const destinoOutroInput = document.querySelector("#destinoOutro");
const origemOutroField = document.querySelector("#origemOutroField");
const destinoOutroField = document.querySelector("#destinoOutroField");
const openStockModalButton = document.querySelector("#openStockModal");
const closeStockModalButton = document.querySelector("#closeStockModal");
const cancelStockModalButton = document.querySelector("#cancelStockModal");
const clearStockButton = document.querySelector("#clearStockButton");
const stockModal = document.querySelector("#stockModal");
const stockAdjustForm = document.querySelector("#stockAdjustForm");
const stockTokenInput = document.querySelector("#stockToken");
const stockCartaoInput = document.querySelector("#stockCartao");
const stockLeitoraInput = document.querySelector("#stockLeitora");

let movimentacoes = carregarMovimentacoes();
let estoqueInicial = carregarEstoqueInicial();
let mesFiltrado = "";
let anoVisivelFiltro = new Date().getFullYear();

preencherLocais(origemSelect);
preencherLocais(destinoSelect);
renderizarSeletorMes();
atualizarLabelFiltroMes();
dataEnvioInput.valueAsDate = new Date();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const origem = obterLocalSelecionado(origemSelect, origemOutroInput);
  const destino = obterLocalSelecionado(destinoSelect, destinoOutroInput);
  const item = document.querySelector("#item").value;
  const quantidade = Number(document.querySelector("#quantidade").value);

  if (!origem || !destino) {
    alert("Preencha a origem e o destino.");
    return;
  }

  if (ehCentroDistribuicao(origem) && quantidade > calcularSaldos()[item]) {
    alert(`Saldo insuficiente de ${item} no Centro de Distribuição.`);
    return;
  }

  const novaMovimentacao = {
    id: gerarId(),
    item,
    quantidade,
    origem,
    destino,
    dataEnvio: document.querySelector("#dataEnvio").value,
    observacao: document.querySelector("#observacao").value.trim()
  };

  movimentacoes.unshift(novaMovimentacao);
  salvarMovimentacoes();
  renderizar();
  form.reset();
  dataEnvioInput.valueAsDate = new Date();
  alternarCampoOutro(origemSelect, origemOutroField, origemOutroInput);
  alternarCampoOutro(destinoSelect, destinoOutroField, destinoOutroInput);
  document.querySelector("#item").focus();
});

origemSelect.addEventListener("change", () => {
  alternarCampoOutro(origemSelect, origemOutroField, origemOutroInput);
});

destinoSelect.addEventListener("change", () => {
  alternarCampoOutro(destinoSelect, destinoOutroField, destinoOutroInput);
});

monthFilterButton.addEventListener("click", () => {
  alternarSeletorMes();
});

previousYearButton.addEventListener("click", () => {
  anoVisivelFiltro -= 1;
  renderizarSeletorMes();
});

nextYearButton.addEventListener("click", () => {
  anoVisivelFiltro += 1;
  renderizarSeletorMes();
});

clearDateFilterButton.addEventListener("click", () => {
  mesFiltrado = "";
  atualizarLabelFiltroMes();
  fecharSeletorMes();
  renderizar();
});

currentMonthFilterButton.addEventListener("click", () => {
  const hoje = new Date();
  mesFiltrado = formatarAnoMes(hoje.getFullYear(), hoje.getMonth() + 1);
  anoVisivelFiltro = hoje.getFullYear();
  atualizarLabelFiltroMes();
  fecharSeletorMes();
  renderizar();
});

monthGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-month]");

  if (!button) {
    return;
  }

  mesFiltrado = button.dataset.month;
  atualizarLabelFiltroMes();
  fecharSeletorMes();
  renderizar();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".date-filter")) {
    fecharSeletorMes();
  }
});

openStockModalButton.addEventListener("click", abrirModalEstoque);
closeStockModalButton.addEventListener("click", fecharModalEstoque);
cancelStockModalButton.addEventListener("click", fecharModalEstoque);

clearStockButton.addEventListener("click", () => {
  const confirmar = confirm("Deseja limpar todo o estoque do Centro de Distribuição?");

  if (!confirmar) {
    return;
  }

  estoqueInicial = criarSaldosZerados();
  salvarEstoqueInicial();
  renderizar();
  fecharModalEstoque();
});

stockModal.addEventListener("click", (event) => {
  if (event.target === stockModal) {
    fecharModalEstoque();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && stockModal.classList.contains("show")) {
    fecharModalEstoque();
  }
});

stockAdjustForm.addEventListener("submit", (event) => {
  event.preventDefault();

  estoqueInicial.Token += obterQuantidadeInput(stockTokenInput);
  estoqueInicial["Cartão"] += obterQuantidadeInput(stockCartaoInput);
  estoqueInicial.Leitora += obterQuantidadeInput(stockLeitoraInput);

  salvarEstoqueInicial();
  renderizar();
  fecharModalEstoque();
});

tableBody.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-id]");

  if (!button) {
    return;
  }

  const id = button.dataset.deleteId;
  movimentacoes = movimentacoes.filter((movimentacao) => movimentacao.id !== id);
  salvarMovimentacoes();
  renderizar();
});

limparTudoButton.addEventListener("click", () => {
  if (movimentacoes.length === 0) {
    return;
  }

  const confirmar = confirm("Deseja excluir todas as movimentações?");

  if (!confirmar) {
    return;
  }

  movimentacoes = [];
  salvarMovimentacoes();
  renderizar();
});

function carregarMovimentacoes() {
  const dadosSalvos = localStorage.getItem(STORAGE_KEY);

  if (!dadosSalvos) {
    return [];
  }

  try {
    return JSON.parse(dadosSalvos);
  } catch {
    return [];
  }
}

function carregarEstoqueInicial() {
  const dadosSalvos = localStorage.getItem(STOCK_KEY);

  if (!dadosSalvos) {
    return criarSaldosZerados();
  }

  try {
    return { ...criarSaldosZerados(), ...JSON.parse(dadosSalvos) };
  } catch {
    return criarSaldosZerados();
  }
}

function salvarMovimentacoes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(movimentacoes));
}

function salvarEstoqueInicial() {
  localStorage.setItem(STOCK_KEY, JSON.stringify(estoqueInicial));
}

function abrirModalEstoque() {
  stockAdjustForm.reset();
  stockModal.classList.add("show");
  stockModal.setAttribute("aria-hidden", "false");
  stockTokenInput.focus();
}

function fecharModalEstoque() {
  stockModal.classList.remove("show");
  stockModal.setAttribute("aria-hidden", "true");
  stockAdjustForm.reset();
}

function obterQuantidadeInput(input) {
  return Number(input.value) || 0;
}

function alternarSeletorMes() {
  if (monthPicker.classList.contains("show")) {
    fecharSeletorMes();
    return;
  }

  abrirSeletorMes();
}

function abrirSeletorMes() {
  renderizarSeletorMes();
  monthPicker.classList.add("show");
  monthPicker.setAttribute("aria-hidden", "false");
  monthFilterButton.setAttribute("aria-expanded", "true");
}

function fecharSeletorMes() {
  monthPicker.classList.remove("show");
  monthPicker.setAttribute("aria-hidden", "true");
  monthFilterButton.setAttribute("aria-expanded", "false");
}

function renderizarSeletorMes() {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  monthPickerYear.textContent = anoVisivelFiltro;
  monthGrid.innerHTML = meses.map((mes, index) => {
    const valor = formatarAnoMes(anoVisivelFiltro, index + 1);
    const selecionado = valor === mesFiltrado ? "selected" : "";

    return `<button class="month-option ${selecionado}" type="button" data-month="${valor}">${mes}</button>`;
  }).join("");
}

function atualizarLabelFiltroMes() {
  if (!mesFiltrado) {
    monthFilterLabel.textContent = "Todos os meses";
    return;
  }

  const [ano, mes] = mesFiltrado.split("-");
  monthFilterLabel.textContent = `${obterNomeMes(Number(mes))}/${ano}`;
}

function formatarAnoMes(ano, mes) {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function obterNomeMes(mes) {
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return meses[mes - 1];
}

function preencherLocais(select) {
  const options = [
    ...LOCAIS.map((local) => `<option value="${escapeHtml(local)}">${escapeHtml(local)}</option>`),
    '<option value="OUTRO">OUTRO</option>'
  ];

  select.insertAdjacentHTML("beforeend", options.join(""));
}

function alternarCampoOutro(select, field, input) {
  const deveMostrar = select.value === "OUTRO";

  field.classList.toggle("show", deveMostrar);
  input.required = deveMostrar;

  if (!deveMostrar) {
    input.value = "";
  }
}

function obterLocalSelecionado(select, inputOutro) {
  if (select.value === "OUTRO") {
    return inputOutro.value.trim();
  }

  return select.value.trim();
}

function ehCentroDistribuicao(local) {
  return local === CENTRO_DISTRIBUICAO;
}

function gerarId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function calcularSaldos() {
  return movimentacoes.reduce((saldos, movimentacao) => {
    if (ehCentroDistribuicao(movimentacao.origem)) {
      saldos[movimentacao.item] -= movimentacao.quantidade;
    }

    return saldos;
  }, { ...estoqueInicial });
}

function filtrarMovimentacoesPorData() {
  return movimentacoes.filter((movimentacao) => {
    return !mesFiltrado || movimentacao.dataEnvio.startsWith(mesFiltrado);
  });
}

function criarSaldosZerados() {
  return ITENS.reduce((saldos, item) => {
    saldos[item] = 0;
    return saldos;
  }, {});
}

function renderizar() {
  const saldos = calcularSaldos();
  const movimentacoesFiltradas = filtrarMovimentacoesPorData();

  document.querySelector("#saldoToken").textContent = saldos.Token;
  document.querySelector("#saldoCartao").textContent = saldos["Cartão"];
  document.querySelector("#saldoLeitora").textContent = saldos.Leitora;
  totalMovimentacoes.textContent = movimentacoesFiltradas.length;

  emptyState.classList.toggle("show", movimentacoesFiltradas.length === 0);

  tableBody.innerHTML = movimentacoesFiltradas.map((movimentacao) => `
    <tr>
      <td><span class="item-pill">${movimentacao.item}</span></td>
      <td>${movimentacao.quantidade}</td>
      <td>${escapeHtml(movimentacao.origem)}</td>
      <td>${escapeHtml(movimentacao.destino)}</td>
      <td>${formatarData(movimentacao.dataEnvio)}</td>
      <td>${formatarObservacao(movimentacao.observacao)}</td>
      <td>
        <button class="delete-button" type="button" data-delete-id="${movimentacao.id}">
          Excluir
        </button>
      </td>
    </tr>
  `).join("");
}

function formatarData(data) {
  if (!data) {
    return "-";
  }

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarObservacao(observacao) {
  return observacao ? escapeHtml(observacao) : "-";
}

function escapeHtml(texto) {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

renderizar();
