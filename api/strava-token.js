// Vercel Serverless Function: Strava OAuth – Initial Token Exchange
// Tauscht den OAuth-Authorization-Code gegen access_token + refresh_token.
// client_secret bleibt serverseitig (Vercel ENV), nie im Browser.

const ALLOWED_ORIGINS = [
    'https://mroewert.github.io',
    'http://localhost:8000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:8000',
];

function applyCors(req, res) {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
    applyCors(req, res);

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'Server misconfigured: STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET missing' });
    }

    const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
    const code = body && body.code;
    if (!code) return res.status(400).json({ error: 'Missing code' });

    try {
        const stravaRes = await fetch('https://www.strava.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                grant_type: 'authorization_code',
            }),
        });
        const data = await stravaRes.json();
        return res.status(stravaRes.status).json(data);
    } catch (e) {
        return res.status(502).json({ error: 'Strava token exchange failed', detail: String(e) });
    }
}

function safeJson(s) {
    try { return JSON.parse(s); } catch { return null; }
}
