/**
 * Tenta classificar o conteúdo da aba em um contexto.
 * Usa Gemini Nano se disponível, ou heurística simples como fallback.
 */
export async function classifyTabContext(title, url) {
  const prompt = `Analise o título: "${title}". Classifique em uma categoria curta (máx 2 palavras) como: Trabalho, Viagem, Estudos, Compras, Social ou Outros.`;

  try {
    const ai = globalThis.ai;
    if (ai && ai.languageModel) {
      const session = await ai.languageModel.create();
      const result = await session.prompt(prompt);
      return result.trim();
    } else {
      throw new Error("Gemini Nano não disponível");
    }
  } catch (e) {
    const lowerTitle = (title || "").toLowerCase();
    const lowerUrl = (url || "").toLowerCase();

    // Desenvolvimento / Tech
    if (
      lowerTitle.includes("react") ||
      lowerTitle.includes("js") ||
      lowerTitle.includes("javascript") ||
      lowerTitle.includes("typescript") ||
      lowerTitle.includes("node") ||
      lowerTitle.includes("dev") ||
      lowerTitle.includes("css") ||
      lowerTitle.includes("html") ||
      lowerTitle.includes("api") ||
      lowerTitle.includes("git") ||
      lowerUrl.includes("github.com") ||
      lowerUrl.includes("stackoverflow.com") ||
      lowerUrl.includes("localhost")
    )
      return "Desenvolvimento";

    // Viagem
    if (
      lowerTitle.includes("passagem") ||
      lowerTitle.includes("voo") ||
      lowerTitle.includes("hotel") ||
      lowerTitle.includes("viagem") ||
      lowerTitle.includes("turismo") ||
      lowerTitle.includes("ferias") ||
      lowerUrl.includes("booking.com") ||
      lowerUrl.includes("airbnb") ||
      lowerUrl.includes("tripadvisor")
    )
      return "Viagem";

    // Compras
    if (
      lowerTitle.includes("preço") ||
      lowerTitle.includes("comprar") ||
      lowerTitle.includes("loja") ||
      lowerTitle.includes("oferta") ||
      lowerTitle.includes("promoção") ||
      lowerTitle.includes("frete") ||
      lowerTitle.includes("amazon") ||
      lowerTitle.includes("mercado livre") ||
      lowerTitle.includes("magalu") ||
      lowerUrl.includes("amazon") ||
      lowerUrl.includes("mercadolivre")
    )
      return "Compras";

    // Trabalho / Corporativo
    if (
      lowerTitle.includes("linkedin") ||
      lowerTitle.includes("slack") ||
      lowerTitle.includes("jira") ||
      lowerTitle.includes("trello") ||
      lowerTitle.includes("reunião") ||
      lowerTitle.includes("meet") ||
      lowerTitle.includes("email") ||
      lowerTitle.includes("outlook") ||
      lowerTitle.includes("planilha") ||
      lowerUrl.includes("docs.google.com") ||
      lowerUrl.includes("linkedin.com")
    )
      return "Trabalho";

    // Lazer & Social
    if (
      lowerTitle.includes("youtube") ||
      lowerTitle.includes("instagram") ||
      lowerTitle.includes("facebook") ||
      lowerTitle.includes("twitter") ||
      lowerTitle.includes("tiktok") ||
      lowerTitle.includes("netflix") ||
      lowerTitle.includes("spotify") ||
      lowerTitle.includes("twitch") ||
      lowerTitle.includes("whatsapp")
    )
      return "Lazer & Social";

    // Finanças
    if (
      lowerTitle.includes("banco") ||
      lowerTitle.includes("investimento") ||
      lowerTitle.includes("conta") ||
      lowerTitle.includes("saldo") ||
      lowerTitle.includes("cartão") ||
      lowerTitle.includes("nubank") ||
      lowerTitle.includes("inter") ||
      lowerTitle.includes("xp")
    )
      return "Finanças";

    return "Geral";
  }
}

export async function summarizeContext(groupName, tabsData) {
  const titles = tabsData.map((t) => `- ${t.title}`).join("\n");
  const prompt = `Você é um assistente de produtividade. O usuário tem as seguintes abas abertas no contexto "${groupName}":\n${titles}\n\nCrie um resumo de 1 parágrafo explicando o que o usuário está pesquisando.`;

  try {
    const ai = globalThis.ai;
    if (ai && ai.languageModel) {
      const session = await ai.languageModel.create();
      return await session.prompt(prompt);
    } else {
      return `(Simulação de IA) Você tem ${tabsData.length} abas abertas sobre ${groupName}. Parece que você está comparando opções baseadas nos títulos das páginas.`;
    }
  } catch (e) {
    return "Não foi possível gerar o resumo no momento.";
  }
}
