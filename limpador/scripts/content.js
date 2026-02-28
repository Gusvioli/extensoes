document.addEventListener("DOMContentLoaded", async () => {
  // Elementos
  const inputElement = document.getElementById("valorASerApagado");
  const buttonLimpar = document.getElementById("limpar");
  const buttonLimparAll = document.getElementById("limparAll");
  const resultadoElement = document.getElementById("resultado");
  const resultadoPergunta = document.getElementById("resultadoPergunta");
  const selectHistory = document.getElementById("select-History");
  const selectH2Title = document.getElementById("traduzir-titulo");
  const selectHistoryLabel = document.getElementById("labe-select-History");
  const selectDesenvolvidoPor = document.getElementById("desenvolvidopor");
  const selectLinkGusvioli = document.getElementById("linkGusvioli");
  const selectBrasil = document.getElementById("brasil");
  const selectEUA = document.getElementById("eua");
  const selectEspanha = document.getElementById("espanha");
  const selectHistexport = document.getElementById("histexport");

  resultadoElement.style.display = "none";
  resultadoPergunta.style.display = "none";

  // Traduções
  let translations = {};
  try {
    const response = await fetch("traducao.json");
    translations = await response.json();
  } catch (err) {
    resultadoElement.style.display = "block";
    resultadoElement.textContent = "Erro ao carregar traduções.";
  }

  // Idioma padrão
  if (!localStorage.getItem("traduzir")) {
    localStorage.setItem("traduzir", "pt-br");
  }

  // Atualiza idioma visual
  const updateLanguage = (lang) => {
    selectH2Title.innerText = translations[lang].titulo;
    buttonLimpar.innerText = translations[lang].limpar;
    buttonLimpar.title = translations[lang].limparTitle;
    buttonLimparAll.innerText = translations[lang].limparAll;
    buttonLimparAll.title = translations[lang].limparAllTitle;
    selectHistoryLabel.innerText = translations[lang].descricaoSelecione;
    inputElement.placeholder = translations[lang].placeholder;
    inputElement.title = translations[lang].placeholderTitle;
    selectDesenvolvidoPor.innerText = translations[lang].desenvolvidopor;
    selectDesenvolvidoPor.title = translations[lang].desenvolvidoporTitle;
    selectLinkGusvioli.title = translations[lang].desenvolvidoporTitle;
    selectHistexport.innerText = translations[lang].histexport;
  };

  updateLanguage(localStorage.getItem("traduzir"));

  // Troca de idioma
  const setLanguage = (lang) => {
    localStorage.setItem("traduzir", lang);
    updateLanguage(lang);

    // Atualize visualmente os botões de idioma, se desejar
    [selectBrasil, selectEUA, selectEspanha].forEach((btn) => {
      btn.style.opacity = "0.5";
      btn.style.cursor = "pointer";
      btn.style.pointerEvents = "auto";
    });
    if (lang === "pt-br") selectBrasil.style.opacity = "1";
    if (lang === "en") selectEUA.style.opacity = "1";
    if (lang === "es") selectEspanha.style.opacity = "1";
  };

  selectBrasil.addEventListener("click", () => setLanguage("pt-br"));
  selectEUA.addEventListener("click", () => setLanguage("en"));
  selectEspanha.addEventListener("click", () => setLanguage("es"));

  // Preenche o select com o histórico
  // Melhoria: Reduzido para 50 para não travar a abertura do popup. A busca continua global.
  const optionLoading = document.createElement("option");
  optionLoading.text = "Carregando...";
  optionLoading.disabled = true;
  selectHistory.add(optionLoading);

  chrome.history.search({ text: "", maxResults: 50 }, (results) => {
    selectHistory.innerHTML = "";
    results.forEach((item) => {
      const option = document.createElement("option");
      option.textContent =
        item.url.length > 45 ? item.url.slice(0, 45) + "..." : item.url;
      option.value = item.url;
      option.title = item.url;
      selectHistory.appendChild(option);
    });
  });

  // Ao clicar em um item do select, preenche o input
  selectHistory.addEventListener("change", (e) => {
    inputElement.value = e.target.value;
  });

  // Limpar item específico
  buttonLimpar.addEventListener("click", async (e) => {
    e.preventDefault();
    const valorDigitado = inputElement.value.trim();
    const lang = localStorage.getItem("traduzir");
    resultadoPergunta.style.display = "none"; // Esconde o modal de confirmação se estiver aberto

    if (!valorDigitado) {
      mostrarResultado(translations[lang].erroNenhumValorInserido, "erro");
      return;
    }
    if (valorDigitado.length >= 128) {
      mostrarResultado(translations[lang].erroLimite128, "erro");
      return;
    }
    chrome.history.search({ text: valorDigitado }, (results) => {
      if (results.length === 0) {
        mostrarResultado(
          `${translations[lang].ItemNaoEncontrado[0]}"${valorDigitado}"${translations[lang].ItemNaoEncontrado[1]}`,
          "info",
        );
      } else {
        results.forEach((item) => chrome.history.deleteUrl({ url: item.url }));
        mostrarResultado(
          `${translations[lang].itemHistorico[0]}'${valorDigitado}' ${translations[lang].itemHistorico[1]}${results.length} ${translations[lang].itemHistorico[2]}`,
        );
        inputElement.value = "";
      }
    });
  });

  // Exibir mensagem de resultado (sucesso, erro, etc)
  function mostrarResultado(mensagem, tipo = "info") {
    resultadoElement.style.display = "block";
    resultadoElement.textContent = mensagem;
    resultadoElement.style.color = tipo === "erro" ? "#c62828" : "#222";
    resultadoElement.style.background = tipo === "erro" ? "#ffebee" : "#f1f3f7";
  }

  // Exibir confirmação antes de limpar tudo
  function mostrarPerguntaConfirmacao(
    mensagem,
    onConfirmar,
    onCancelar,
    lang,
    translations,
  ) {
    resultadoPergunta.style.display = "block";
    resultadoPergunta.innerHTML = `
      <div class="pergunta-confirmacao">
        <span>${mensagem}</span>
        <div>
          <button id="confirmar">${translations[lang].confirmarSim}</button>
          <button id="noConfirmar">${translations[lang].confirmarNao}</button>
        </div>
      </div>
    `;
    document.getElementById("confirmar").onclick = () => {
      resultadoElement.style.display = "none";
      resultadoPergunta.style.display = "none";
      resultadoPergunta.innerHTML = "";
      onConfirmar();
    };
    document.getElementById("noConfirmar").onclick = () => {
      resultadoElement.style.display = "none";
      resultadoPergunta.style.display = "none";
      resultadoPergunta.innerHTML = "";
      if (onCancelar) onCancelar();
    };
  }

  // Exemplo de uso ao clicar em "Limpar Tudo"
  buttonLimparAll.addEventListener("click", (e) => {
    e.preventDefault();
    const lang = localStorage.getItem("traduzir");
    mostrarPerguntaConfirmacao(
      translations[lang].temCertezaDeletarHistorico,
      () => {
        chrome.history.deleteAll(() => {
          // Adiciona verificação de erro da API
          if (chrome.runtime.lastError) {
            mostrarResultado(chrome.runtime.lastError.message, "erro");
          } else {
            mostrarResultado(translations[lang].exclusaoOk);
          }
        });
      },
      null,
      lang,
      translations,
    );
  });

  //Exibir o campo exportar histórico
  selectHistexport.addEventListener("click", (e) => {
    e.preventDefault();

    // UX: Muda o cursor para indicar processamento
    document.body.style.cursor = "wait";
    const lang = localStorage.getItem("traduzir");

    chrome.runtime.sendMessage(
      { action: "exportHistory", lang: lang },
      (response) => {
        document.body.style.cursor = "default";

        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError.message);
          mostrarResultado(
            "Erro de comunicação com o serviço da extensão.",
            "erro",
          );
        } else if (response && !response.success) {
          mostrarResultado(response.message || "Erro ao exportar.", "erro");
        }
      },
    );
  });

  // Exemplo de uso para mostrar erro
  // mostrarResultado('Digite um valor para limpar.', 'erro');
});
