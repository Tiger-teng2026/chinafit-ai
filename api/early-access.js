// Early Access waitlist — records emails when checkout is being upgraded
const fs = require('fs');
const path = require('path');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStorePath() {
    if (process.env.VERCEL) {
        return path.join('/tmp', 'chinafit-early-access.jsonl');
    }
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'early-access.jsonl');
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

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = parseBody(req);
        const email = String(body.email || '').trim().toLowerCase();

        if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        const record = {
            email,
            source: 'early_access_modal',
            submittedAt: new Date().toISOString(),
            userAgent: req.headers['user-agent'] || ''
        };

        console.log('[EARLY_ACCESS]', JSON.stringify(record));

        try {
            fs.appendFileSync(getStorePath(), JSON.stringify(record) + '\n', 'utf8');
        } catch (writeErr) {
            console.error('early-access file write failed:', writeErr);
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('early-access handler failed:', err);
        return res.status(500).json({ error: 'Could not save your email. Please try again.' });
    }
};
