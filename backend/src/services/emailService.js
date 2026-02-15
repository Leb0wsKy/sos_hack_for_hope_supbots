import nodemailer from 'nodemailer';

/* ═══════════════════════════════════════════════════════
   Centralized Email Service — SOS Villages Tunisia
   ═══════════════════════════════════════════════════════ */

// ── Transporter (created lazily so the app boots even when SMTP is absent) ──
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('[EmailService] SMTP_USER / SMTP_PASS not set — emails will NOT be sent.');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return _transporter;
}

const FROM = () => `"${process.env.SMTP_FROM_NAME || 'SOS Villages Tunisie'}" <${process.env.SMTP_USER || 'noreply@example.com'}>`;

// ── Generic send helper ──
async function sendMail({ to, subject, text, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EmailService] Skipped email to ${to}: ${subject}`);
    return null;
  }
  try {
    const info = await transporter.sendMail({
      from: FROM(),
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>')
    });
    console.log(`[EmailService] Sent to ${to}: ${subject} (${info.messageId})`);
    return info;
  } catch (err) {
    console.error(`[EmailService] Failed to send to ${to}: ${err.message}`);
    return null;
  }
}

/* ─────────────────────────────────────
   Role labels for user-friendly names
   ───────────────────────────────────── */
const ROLE_LABELS = {
  LEVEL1: 'Niveau 1 (Rapporteur)',
  LEVEL2: 'Niveau 2 (Psychologue / Travailleur Social)',
  LEVEL3: 'Niveau 3 (Directeur Village / Bureau National)',
  LEVEL4: 'Niveau 4 (Super Admin)'
};

const ROLE_DETAIL_LABELS = {
  SOS_MOTHER: 'Mère SOS',
  EDUCATOR: 'Éducateur',
  FIELD_STAFF: 'Personnel de terrain',
  PSYCHOLOGIST: 'Psychologue',
  SOCIAL_WORKER: 'Travailleur Social',
  VILLAGE_DIRECTOR: 'Directeur de Village',
  NATIONAL_OFFICE: 'Bureau National',
  SUPER_ADMIN: 'Super Administrateur'
};

const STATUS_LABELS = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours de traitement',
  CLOTURE: 'Clôturé',
  FAUX_SIGNALEMENT: 'Faux signalement'
};

/* ═══════════════════════════════════════════════════════
   1) Account Created — notify new user with credentials
   ═══════════════════════════════════════════════════════ */
export async function notifyAccountCreated({ email, name, role, roleDetails, plainPassword }) {
  const roleLabel = ROLE_LABELS[role] || role;
  const detailLabel = roleDetails ? ` (${ROLE_DETAIL_LABELS[roleDetails] || roleDetails})` : '';

  const subject = 'Votre compte SOS Villages a été créé';
  const text = `Bonjour ${name},

Votre compte sur la plateforme SOS Villages Tunisie a été créé avec succès.

Vos identifiants :
  Email : ${email}
  Mot de passe : ${plainPassword}
  Rôle : ${roleLabel}${detailLabel}

Veuillez vous connecter et changer votre mot de passe dès que possible.

Cordialement,
L'équipe SOS Villages Tunisie`;

  return sendMail({ to: email, subject, text });
}

/* ═══════════════════════════════════════════════════════
   2) Role Modified — notify user of role change
   ═══════════════════════════════════════════════════════ */
export async function notifyRoleChanged({ email, name, oldRole, newRole, newRoleDetails }) {
  const oldLabel = ROLE_LABELS[oldRole] || oldRole;
  const newLabel = ROLE_LABELS[newRole] || newRole;
  const detailLabel = newRoleDetails ? ` (${ROLE_DETAIL_LABELS[newRoleDetails] || newRoleDetails})` : '';

  const subject = 'Modification de votre rôle — SOS Villages';
  const text = `Bonjour ${name},

Votre rôle sur la plateforme SOS Villages Tunisie a été modifié.

  Ancien rôle : ${oldLabel}
  Nouveau rôle : ${newLabel}${detailLabel}

Si vous avez des questions, veuillez contacter votre administrateur.

Cordialement,
L'équipe SOS Villages Tunisie`;

  return sendMail({ to: email, subject, text });
}

/* ═══════════════════════════════════════════════════════
   3) Signalement Status Changed — notify Level 1 creator
   ═══════════════════════════════════════════════════════ */
export async function notifySignalementStatusChanged({ email, name, signalementTitle, oldStatus, newStatus, signalementId }) {
  const oldLabel = STATUS_LABELS[oldStatus] || oldStatus;
  const newLabel = STATUS_LABELS[newStatus] || newStatus;

  const subject = `Mise à jour de votre signalement — ${newLabel}`;
  const text = `Bonjour ${name},

Le statut de votre signalement a été mis à jour.

  Signalement : ${signalementTitle || signalementId}
  Ancien statut : ${oldLabel}
  Nouveau statut : ${newLabel}

Connectez-vous à la plateforme pour plus de détails.

Cordialement,
L'équipe SOS Villages Tunisie`;

  return sendMail({ to: email, subject, text });
}

/* ═══════════════════════════════════════════════════════
   4) New Signalement in Village — notify Level 2 users
   ═══════════════════════════════════════════════════════ */
export async function notifyNewSignalementInVillage({ email, name, signalementTitle, villageName, urgencyLevel, incidentType }) {
  const subject = `Nouveau signalement dans votre village — ${villageName}`;
  const text = `Bonjour ${name},

Un nouveau signalement a été ajouté dans votre village (${villageName}).

  Titre : ${signalementTitle || 'Sans titre'}
  Type d'incident : ${incidentType || 'Non spécifié'}
  Urgence : ${urgencyLevel || 'MOYEN'}

Connectez-vous à la plateforme pour consulter et prendre en charge ce signalement.

Cordialement,
L'équipe SOS Villages Tunisie`;

  return sendMail({ to: email, subject, text });
}

/* ═══════════════════════════════════════════════════════
   5) Deadline Reminder (24h) — notify Level 2 user
   ═══════════════════════════════════════════════════════ */
export async function notifyDeadlineReminder({ email, name, signalementTitle, signalementId, deadlineAt, hoursRemaining }) {
  const deadlineStr = new Date(deadlineAt).toLocaleString('fr-FR', { timeZone: 'Africa/Tunis' });

  const subject = `⚠ Rappel de délai — ${Math.round(hoursRemaining)}h restantes`;
  const text = `Bonjour ${name},

Ceci est un rappel que le délai pour le signalement suivant approche.

  Signalement : ${signalementTitle || signalementId}
  Date limite : ${deadlineStr}
  Temps restant : ~${Math.round(hoursRemaining)} heures

Veuillez soumettre les documents requis avant l'expiration du délai.

Cordialement,
L'équipe SOS Villages Tunisie`;

  return sendMail({ to: email, subject, text });
}

/* ═══════════════════════════════════════════════════════
   6) Documents Signed by Upper Users — notify Level 2
   ═══════════════════════════════════════════════════════ */
export async function notifyDocumentSigned({ email, name, signalementTitle, signalementId, documentName, signedByName }) {
  const subject = `Document signé — ${documentName}`;
  const text = `Bonjour ${name},

Le document "${documentName}" pour le signalement suivant a été signé.

  Signalement : ${signalementTitle || signalementId}
  Document : ${documentName}
  Signé par : ${signedByName}

Connectez-vous à la plateforme pour consulter le dossier mis à jour.

Cordialement,
L'équipe SOS Villages Tunisie`;

  return sendMail({ to: email, subject, text });
}

/* ═══════════════════════════════════════════════════════
   7) Document to Sign — notify Level 3 (Director / National)
   ═══════════════════════════════════════════════════════ */
export async function notifyDocumentToSign({ email, name, signalementTitle, signalementId, villageName, submittedByName }) {
  const subject = `Dossier à signer — ${villageName}`;
  const text = `Bonjour ${name},

Un dossier nécessite votre signature.

  Signalement : ${signalementTitle || signalementId}
  Village : ${villageName || 'Non spécifié'}
  Soumis par : ${submittedByName}

Connectez-vous à la plateforme pour examiner et signer les documents.

Cordialement,
L'équipe SOS Villages Tunisie`;

  return sendMail({ to: email, subject, text });
}

export default {
  notifyAccountCreated,
  notifyRoleChanged,
  notifySignalementStatusChanged,
  notifyNewSignalementInVillage,
  notifyDeadlineReminder,
  notifyDocumentSigned,
  notifyDocumentToSign
};
