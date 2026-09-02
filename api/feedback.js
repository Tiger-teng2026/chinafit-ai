// Product feedback from the calculator widget and /contact form.
// Delivery: Resend (RESEND_API_KEY) or Web3Forms (WEB3FORMS_ACCESS_KEY).
// FormSubmit is not used — Cloudflare challenges Vercel IPs (403).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIES = new Set(['wrong_size', 'feature', 'bug', 'billing', 'other']);
const SUPPORT_TO = 'support@chinafitai.com';

const hitsByIp = new Map();

function clientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '');
    return forwarded.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

function allowRequest(ip) {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const maxHits = 5;
    const recent = (hitsByIp.get(ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= maxHits) {
        hitsByIp.set(ip, recent);
        return false;
    }
    recent.push(now);
    hitsByIp.set(ip, recent);
    return true;
}

function parseBody(req) {
    if (!req.body) return {};
    if (typeof req.body === 'string') {
        try {
            return JSON.parse(req.body);
        } catch {
            return {};
        }
    }
    return req.body;
}

function cleanText(value, max) {
    return String(value || '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        .trim()
        .slice(0, max);
}

function notifyEmail() {
    return String(process.env.FEEDBACK_TO || '').trim();
}

function mailBody(record) {
    return [
        `Category: ${record.category}`,
        `From: ${record.email || '(not provided)'}`,
        `Page: ${record.page}`,
        `Time: ${record.submittedAt}`,
        '',
        record.message
    ].join('\n');
}

async function sendResend(record) {
    const key = process.env.RESEND_API_KEY;
    const to = notifyEmail();
    if (!key || !to) return false;

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM || 'ChinaFit AI <onboarding@resend.dev>',
                to: [to],
                reply_to: record.email || undefined,
                subject: `[ChinaFit AI] ${record.category}`,
                text: mailBody(record)
            })
        });

        if (!res.ok) {
            const detail = await res.text().catch(() => '');
            console.error('feedback resend failed:', res.status, detail);
            return false;
        }
        return true;
    } catch (err) {
        console.error('feedback resend failed:', err);
        return false;
    }
}

async function sendWeb3Forms(record) {
    const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
    if (!accessKey) return false;

    try {
        const res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_key: accessKey,
                subject: `[ChinaFit AI] ${record.category}`,
                from_name: 'ChinaFit AI',
                name: record.email || 'ChinaFit visitor',
                email: record.email || notifyEmail() || SUPPORT_TO,
                message: mailBody(record)
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
            console.error('feedback web3forms failed:', res.status, data);
            return false;
        }
        return true;
    } catch (err) {
        console.error('feedback web3forms failed:', err);
        return false;
    }
}

async function sendWebhook(record) {
    const url = process.env.FEEDBACK_WEBHOOK_URL;
    if (!url) return false;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: `ChinaFit feedback (${record.category}) from ${record.email || 'anonymous'}:\n${record.message}`
            })
        });
        return res.ok;
    } catch (err) {
        console.error('feedback webhook failed:', err);
        return false;
    }
}

function configStatus() {
    return {
        destination: Boolean(notifyEmail()),
        resend: Boolean(process.env.RESEND_API_KEY),
        web3forms: Boolean(process.env.WEB3FORMS_ACCESS_KEY),
        webhook: Boolean(process.env.FEEDBACK_WEBHOOK_URL)
    };
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        const cfg = configStatus();
        return res.status(200).json({
            ok: true,
            mailReady: cfg.resend || cfg.web3forms || cfg.webhook,
            web3formsKey: process.env.WEB3FORMS_ACCESS_KEY || null
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const ip = clientIp(req);
        if (!allowRequest(ip)) {
            return res.status(429).json({ error: 'Too many messages. Please try again in a few minutes.' });
        }

        const body = parseBody(req);

        if (cleanText(body.company || body.website, 200)) {
            return res.status(200).json({ ok: true });
        }

        const category = cleanText(body.category, 40);
        const message = cleanText(body.message, 2000);
        const email = cleanText(body.email, 254).toLowerCase();
        const page = cleanText(body.page, 300) || 'unknown';

        if (!CATEGORIES.has(category)) {
            return res.status(400).json({ error: 'Please choose a feedback category.' });
        }
        if (message.length < 10) {
            return res.status(400).json({ error: 'Please describe the issue in at least 10 characters.' });
        }
        if (email && !EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email, or leave it blank.' });
        }

        const record = {
            category,
            message,
            email: email || '',
            page,
            submittedAt: new Date().toISOString(),
            userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
        };

        console.log('[FEEDBACK]', JSON.stringify(record));

        let delivered = await sendResend(record);
        if (!delivered) delivered = await sendWebhook(record);

        if (!delivered) {
            const cfg = configStatus();
            console.error('feedback not delivered', cfg);
            return res.status(503).json({
                error: 'Could not deliver feedback email yet. Please use the contact form at /contact.html#feedback.'
            });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('feedback handler failed:', err);
        return res.status(500).json({ error: 'Could not send feedback. Please use the contact form at /contact.html#feedback.' });
    }
};
