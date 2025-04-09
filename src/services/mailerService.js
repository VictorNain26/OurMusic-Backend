import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { htmlToText } from 'html-to-text';

// ✅ Lecture du template d'email
const htmlTemplate = readFileSync(resolve('src/services/templates/mailTemplate.html'), 'utf-8');

// ✅ Compile le template avec les variables dynamiques
function compileTemplate(template, variables = {}) {
  return template
    .replace(/{{#if (.*?)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
      const value = variables[condition.trim()];
      return value ? content : '';
    })
    .replace(/{{(.*?)}}/g, (_, key) => variables[key.trim()] || '');
}

// ✅ Transporteur SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: false, // ✅ Astuce : à basculer sur true si tu as du SSL natif
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// ✅ Fonction d'envoi d'email centralisée
export async function sendMail({ to, subject, variables = {} }) {
  try {
    const html = compileTemplate(htmlTemplate, { subject, ...variables });
    const text = htmlToText(html, { wordwrap: 130 });

    await transporter.sendMail({
      from: 'OurMusic <noreply@ourmusic.fr>',
      to,
      subject,
      html,
      text,
    });

    console.log(`✅ Email envoyé à ${to} — Sujet: "${subject}"`);
  } catch (err) {
    console.error('[Mailer Error]', err);
    throw new Error("Erreur lors de l'envoi de l'e-mail.");
  }
}
