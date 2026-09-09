import axios from "axios";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASS,
  },
});

export async function notifyTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await axios.post(url, {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  });
}

export async function notifyGmail(
  subject: string,
  htmlContent: string,
): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.ALERT_EMAIL_DESTINATARIO) return;

  await transporter.sendMail({
    from: `"Monitor Concursos TI" <${process.env.GMAIL_USER}>`,
    to: process.env.ALERT_EMAIL_DESTINATARIO,
    subject,
    html: htmlContent,
  });
}
