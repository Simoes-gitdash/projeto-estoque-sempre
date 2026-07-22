import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const STORAGE_KEY = "estoqueMovimentacoes";
const STOCK_KEY = "estoqueQuantidadesIniciais";
const MOVEMENTS_COLLECTION = "movimentacoes";
const SETTINGS_COLLECTION = "configuracoes";
const STOCK_DOC_ID = "estoqueInicial";
const firebaseConfig = {
  apiKey: "AIzaSyAupVYh-mFogwwCtPJwfrzyVuAH81nZKZQ",
  authDomain: "estoque-sempre.firebaseapp.com",
  projectId: "estoque-sempre",
  storageBucket: "estoque-sempre.firebasestorage.app",
  messagingSenderId: "74014345402",
  appId: "1:74014345402:web:8fdc2ae4f2c13498975a83",
  measurementId: "G-4X8Y5YM25G"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const movimentacoesRef = collection(db, MOVEMENTS_COLLECTION);
const estoqueInicialRef = doc(db, SETTINGS_COLLECTION, STOCK_DOC_ID);
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
const movimentacoesLocaisIniciais = [...movimentacoes];
let mesFiltrado = "";
let anoVisivelFiltro = new Date().getFullYear();
let migracaoMovimentacoesTentada = false;

preencherLocais(origemSelect);
preencherLocais(destinoSelect);
renderizarSeletorMes();
atualizarLabelFiltroMes();
dataEnvioInput.valueAsDate = new Date();

form.addEventListener("submit", async (event) => {
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
    observacao: document.querySelector("#observacao").value.trim(),
    criadoEm: Date.now()
  };

  movimentacoes.unshift(novaMovimentacao);
  renderizar();

  try {
    await salvarMovimentacao(novaMovimentacao);
    form.reset();
    dataEnvioInput.valueAsDate = new Date();
    alternarCampoOutro(origemSelect, origemOutroField, origemOutroInput);
    alternarCampoOutro(destinoSelect, destinoOutroField, destinoOutroInput);
    document.querySelector("#item").focus();
  } catch (error) {
    movimentacoes = movimentacoes.filter((movimentacao) => movimentacao.id !== novaMovimentacao.id);
    salvarMovimentacoes();
    renderizar();
    alert("Não foi possível salvar no Firebase. Verifique a conexão e tente novamente.");
    console.error(error);
  }
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

clearStockButton.addEventListener("click", async () => {
  const confirmar = confirm("Deseja limpar todo o estoque do Centro de Distribuição?");

  if (!confirmar) {
    return;
  }

  const estoqueAnterior = { ...estoqueInicial };
  estoqueInicial = criarSaldosZerados();
  renderizar();

  try {
    await salvarEstoqueInicial();
    fecharModalEstoque();
  } catch (error) {
    estoqueInicial = estoqueAnterior;
    salvarEstoqueInicialLocal();
    renderizar();
    alert("Não foi possível limpar o estoque no Firebase. Tente novamente.");
    console.error(error);
  }
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

stockAdjustForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const estoqueAnterior = { ...estoqueInicial };
  estoqueInicial.Token += obterQuantidadeInput(stockTokenInput);
  estoqueInicial["Cartão"] += obterQuantidadeInput(stockCartaoInput);
  estoqueInicial.Leitora += obterQuantidadeInput(stockLeitoraInput);

  renderizar();

  try {
    await salvarEstoqueInicial();
    fecharModalEstoque();
  } catch (error) {
    estoqueInicial = estoqueAnterior;
    salvarEstoqueInicialLocal();
    renderizar();
    alert("Não foi possível salvar o estoque no Firebase. Tente novamente.");
    console.error(error);
  }
});

tableBody.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-id]");

  if (!button) {
    return;
  }

  const id = button.dataset.deleteId;
  const movimentacoesAnteriores = [...movimentacoes];
  movimentacoes = movimentacoes.filter((movimentacao) => movimentacao.id !== id);
  renderizar();

  try {
    await excluirMovimentacao(id);
  } catch (error) {
    movimentacoes = movimentacoesAnteriores;
    salvarMovimentacoes();
    renderizar();
    alert("Não foi possível excluir no Firebase. Tente novamente.");
    console.error(error);
  }
});

limparTudoButton.addEventListener("click", async () => {
  if (movimentacoes.length === 0) {
    return;
  }

  const confirmar = confirm("Deseja excluir todas as movimentações?");

  if (!confirmar) {
    return;
  }

  const movimentacoesAnteriores = [...movimentacoes];
  movimentacoes = [];
  renderizar();

  try {
    await limparMovimentacoesRemotas();
  } catch (error) {
    movimentacoes = movimentacoesAnteriores;
    salvarMovimentacoes();
    renderizar();
    alert("Não foi possível excluir todas as movimentações no Firebase. Tente novamente.");
    console.error(error);
  }
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

function salvarEstoqueInicialLocal() {
  localStorage.setItem(STOCK_KEY, JSON.stringify(estoqueInicial));
}

async function salvarMovimentacao(movimentacao) {
  salvarMovimentacoes();
  await setDoc(doc(db, MOVEMENTS_COLLECTION, movimentacao.id), {
    ...movimentacao,
    atualizadoEm: serverTimestamp()
  });
}

async function excluirMovimentacao(id) {
  salvarMovimentacoes();
  await deleteDoc(doc(db, MOVEMENTS_COLLECTION, id));
}

async function limparMovimentacoesRemotas() {
  salvarMovimentacoes();
  const snapshot = await getDocs(movimentacoesRef);
  const batch = writeBatch(db);

  snapshot.forEach((documento) => {
    batch.delete(documento.ref);
  });

  await batch.commit();
}

async function salvarEstoqueInicial() {
  salvarEstoqueInicialLocal();
  await setDoc(estoqueInicialRef, {
    saldos: estoqueInicial,
    atualizadoEm: serverTimestamp()
  });
}

function iniciarSincronizacaoFirebase() {
  onSnapshot(movimentacoesRef, (snapshot) => {
    if (!migracaoMovimentacoesTentada && snapshot.empty && movimentacoesLocaisIniciais.length > 0) {
      migracaoMovimentacoesTentada = true;
      migrarMovimentacoesLocais().catch((error) => {
        console.error(error);
      });
      return;
    }

    migracaoMovimentacoesTentada = true;
    movimentacoes = snapshot.docs
      .map((documento) => ({ id: documento.id, ...documento.data() }))
      .filter((movimentacao) => movimentacao.item && movimentacao.dataEnvio)
      .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));

    salvarMovimentacoes();
    renderizar();
  }, (error) => {
    console.error(error);
    alert("Não foi possível carregar as movimentações do Firebase. Mostrando dados salvos neste navegador.");
  });

  onSnapshot(estoqueInicialRef, (snapshot) => {
    if (!snapshot.exists()) {
      salvarEstoqueInicial().catch((error) => {
        console.error(error);
      });
      return;
    }

    const dados = snapshot.data();
    estoqueInicial = { ...criarSaldosZerados(), ...(dados.saldos || {}) };
    salvarEstoqueInicialLocal();
    renderizar();
  }, (error) => {
    console.error(error);
    alert("Não foi possível carregar o estoque inicial do Firebase. Mostrando dados salvos neste navegador.");
  });
}

async function migrarMovimentacoesLocais() {
  const batch = writeBatch(db);

  movimentacoesLocaisIniciais.forEach((movimentacao) => {
    const id = movimentacao.id || gerarId();
    batch.set(doc(db, MOVEMENTS_COLLECTION, id), {
      ...movimentacao,
      id,
      criadoEm: movimentacao.criadoEm || Date.now(),
      atualizadoEm: serverTimestamp()
    });
  });

  await batch.commit();
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
iniciarSincronizacaoFirebase();
