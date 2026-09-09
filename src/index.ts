import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { notifyTelegram, notifyGmail } from "./services/notifier.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, "../seen_links.json");

// Palavras-chave voltadas para ADS e Tecnologia
const KEYWORDS = [
  "análise e desenvolvimento de sistemas",
  "analista de sistemas",
  "desenvolvimento",
  "tecnologia da informação",
  "programador",
  "software",
  "informática",
  "ti",
];

interface ConcursoItem {
  title: string;
  link: string;
  details: string;
}

function loadSeenLinks(): string[] {
  if (!fs.existsSync(DB_FILE)) return [];
  const data = fs.readFileSync(DB_FILE, "utf-8");
  return JSON.parse(data || "[]");
}

function saveSeenLinks(links: string[]): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(links, null, 2));
}

async function runScraper() {
  console.log("Iniciando verificação de editais...");
  const seenLinks = loadSeenLinks();
  const newLinksToSave: string[] = [...seenLinks];

  try {
    // Exemplo: Coleta na seção de concursos nacionais/regionais do PCI Concursos
    const response = await axios.get(
      "https://www.pciconcursos.com.br/concursos/",
      {
        headers: { "User-Agent": "Mozilla/5.0" },
      },
    );
    const $ = cheerio.load(response.data);
    const matches: ConcursoItem[] = [];

    $(".ca").each((_, element) => {
      const anchor = $(element).find("a");
      const title = anchor.text().trim();
      const link = anchor.attr("href") || "";
      const details = $(element).text().trim();

      const lowerText = `${title} ${details}`.toLowerCase();
      const matchesKeyword = KEYWORDS.some((k) => lowerText.includes(k));

      if (matchesKeyword && link && !seenLinks.includes(link)) {
        matches.push({ title, link, details });
        newLinksToSave.push(link);
      }
    });

    if (matches.length === 0) {
      console.log("Nenhum novo edital de TI/ADS encontrado nesta execução.");
      return;
    }

    console.log(
      `Encontrados ${matches.length} novos editais! Disparando alertas...`,
    );

    for (const item of matches) {
      // 1. Notificação Telegram
      const telegramMessage = `
🚨 <b>Novo Concurso Detectado para TI/ADS!</b>

📌 <b>Edital:</b> ${item.title}
📝 <b>Detalhes:</b> ${item.details.slice(0, 200)}...
🔗 <a href="${item.link}">Acessar Edital / Notícia</a>
      `.trim();

      await notifyTelegram(telegramMessage);

      // 2. Notificação Gmail
      const emailSubject = `[Alerta Concurso TI] ${item.title}`;
      const emailHtml = `
        <h2>Novo Concurso TI / Análise de Sistemas</h2>
        <p><strong>Edital:</strong> ${item.title}</p>
        <p><strong>Resumo:</strong> ${item.details}</p>
        <p><a href="${item.link}" style="background:#0284c7;color:#fff;padding:8px 16px;text-decoration:none;border-radius:4px;">Ver Detalhes do Edital</a></p>
      `;

      await notifyGmail(emailSubject, emailHtml);
    }

    saveSeenLinks(newLinksToSave);
    console.log("Alertas enviados e base de links atualizada com sucesso.");
  } catch (error) {
    console.error("Erro ao executar scraper:", error);
  }
}

runScraper();
