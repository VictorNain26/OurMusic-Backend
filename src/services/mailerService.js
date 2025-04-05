import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const htmlTemplate = readFileSync(resolve('src/services/templates/mailTemplate.html'), 'utf-8');

function compileTemplate(template, variables = {}) {
  return template
    .replace(/{{#if (.*?)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
      const value = variables[condition.trim()];
      return value ? content : '';
    })
    .replace(/{{(.*?)}}/g, (_, key) => variables[key.trim()] || '');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendMail({ to, subject, variables = {} }) {
  try {
    const html = compileTemplate(htmlTemplate, { subject, ...variables });

    await transporter.sendMail({
      from: `OurMusic <noreply@ourmusic.fr>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email envoyé à ${to}`);
  } catch (err) {
    console.error('[Mailer Error]', err);
    throw new Error("Erreur lors de l'envoi de l'e-mail.");
  }
}
