require(‘dotenv’).config();
const express = require(‘express’);
const axios = require(‘axios’);

const app = express();
app.use(express.json());

// ─── Config ───────────────────────────────────────────────
const ANTHROPIC_API_KEY  = process.env.ANTHROPIC_API_KEY;
const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN;
const CHATWOOT_BASE_URL  = process.env.CHATWOOT_BASE_URL;  // ex: https://app.chatwoot.com
const CHATWOOT_ACCOUNT   = process.env.CHATWOOT_ACCOUNT_ID;

// ─── Système prompt Woodflix ───────────────────────────────
const SYSTEM_PROMPT = `Tu es un assistant client pour WOODFLIX, une plateforme haïtienne de recharge gaming (woodflixht.com).

Tu réponds en Haitian Creole par défaut, ou dans la langue du client.

Ce que tu vends :

- Diamants Free Fire (110, 341, 572, 1166, 2398, 6166)
- Abonnements Free Fire (Semaine 350 HTG, Mois 1550 HTG)
- Booyah Pass (500 HTG), Level Up (950 HTG)
- Blood Strike, cartes cadeaux, autres recharges gaming

Méthodes de paiement : MonCash, NatCash, Téra Wallet

- MonCash/NatCash : frais 1% appliqué automatiquement
- Téra Wallet : aucun frais

Livraison : automatique après confirmation du paiement.

Règles :

- Sois court, direct, professionnel
- Si un client a un problème de commande, demande son numéro de commande
- Ne promets jamais de remboursement sans vérification
- Pour les problèmes techniques complexes, dis que l’équipe va contacter le client`;

// ─── Fonction : appel Anthropic ────────────────────────────
async function askClaude(userMessage, conversationHistory = []) {
const messages = [
…conversationHistory,
{ role: ‘user’, content: userMessage }
];

const response = await axios.post(
‘https://api.anthropic.com/v1/messages’,
{
model: ‘claude-sonnet-4-20250514’,
max_tokens: 500,
system: SYSTEM_PROMPT,
messages
},
{
headers: {
‘x-api-key’: ANTHROPIC_API_KEY,
‘anthropic-version’: ‘2023-06-01’,
‘content-type’: ‘application/json’
}
}
);

return response.data.content[0].text;
}

// ─── Fonction : répondre dans Chatwoot ────────────────────
async function replyInChatwoot(conversationId, content) {
await axios.post(
`${CHATWOOT_BASE_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT}/conversations/${conversationId}/messages`,
{
content,
message_type: ‘outgoing’,
private: false
},
{
headers: {
‘api_access_token’: CHATWOOT_API_TOKEN,
‘Content-Type’: ‘application/json’
}
}
);
}

// ─── Webhook endpoint ──────────────────────────────────────
app.post(’/webhook’, async (req, res) => {
try {
const payload = req.body;

```
// Ignorer tout sauf les messages entrants (clients)
if (payload.event !== 'message_created') return res.sendStatus(200);
if (payload.message_type !== 'incoming')  return res.sendStatus(200);
if (!payload.content)                      return res.sendStatus(200);

const conversationId = payload.conversation?.id;
const userMessage    = payload.content;

console.log(`[Chatwoot] Conv #${conversationId}: "${userMessage}"`);

// Appel Claude
const reply = await askClaude(userMessage);
console.log(`[Claude] Repons: "${reply}"`);

// Envoyer la réponse dans Chatwoot
await replyInChatwoot(conversationId, reply);

res.sendStatus(200);
```

} catch (err) {
console.error(’[ERREUR]’, err.response?.data || err.message);
res.sendStatus(500);
}
});

// ─── Health check ──────────────────────────────────────────
app.get(’/’, (req, res) => {
res.json({ status: ‘ok’, bot: ‘Woodflix Claude Bot’ });
});

// ─── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log(`✅ Woodflix Claude Bot aktif sou port ${PORT}`);
});
