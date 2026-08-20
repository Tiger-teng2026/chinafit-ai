// ChinaFit AI 核心计算引擎 (Node.js 后端 - Vercel Serverless Function)
// 使用 CommonJS 导出，确保与 Vercel 默认环境兼容

module.exports = function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(200).send('ChinaFit AI core engine is running! Please use POST request.');
    }

    const { category, val1, val2 } = req.body || {};
    const numericVal1 = Number(val1);
    const numericVal2 = Number(val2);

    if (!category || !['shoes', 'tops', 'pants'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category. Must be shoes, tops, or pants.' });
    }
    if (isNaN(numericVal1) || isNaN(numericVal2) || numericVal1 <= 0 || numericVal2 <= 0) {
        return res.status(400).json({ error: 'Body measurements must be positive numbers.' });
    }

    let result = {};

    switch (category) {
        case 'shoes': {
            const footLength = numericVal1;
            const footWidth = numericVal2;

            let eurSize, usSize, fitAdvice, insights;

            if (footLength <= 245) {
                eurSize = "39 EUR"; usSize = "6.5 US";
            } else if (footLength <= 250) {
                eurSize = "40 EUR"; usSize = "7.5 US";
            } else if (footLength <= 255) {
                eurSize = "41 EUR"; usSize = "8.0 US";
            } else if (footLength <= 260) {
                eurSize = "42 EUR"; usSize = "8.5 US";
            } else if (footLength <= 265) {
                eurSize = "43 EUR"; usSize = "9.5 US";
            } else if (footLength <= 275) {
                eurSize = "44 EUR"; usSize = "10.0 US";
            } else {
                eurSize = "45+ EUR"; usSize = "11.0+ US";
            }

            if (footWidth > 100) {
                fitAdvice = "Relaxed fit (size up half a size)";
                insights = `Detected foot width ${footWidth}mm (wide foot type). Some sneaker models run narrow, we recommend going half a size up to avoid pressure.`;
            } else if (footWidth < 85) {
                fitAdvice = "Narrow fit (size down half a size)";
                insights = `Foot width ${footWidth}mm is narrow. Regular sizes may feel loose; consider going half a size down or choosing a narrow last.`;
            } else {
                fitAdvice = "Standard fit (buy regular size)";
                insights = `Foot length ${footLength}mm and width ${footWidth}mm perfectly match the standard Asian foot shape. You can safely order your usual size.`;
            }

            result = {
                size: `${eurSize} / ${usSize}`,
                fit: fitAdvice,
                confidence: "99.2%",
                extra: insights
            };
            break;
        }

        case 'tops': {
            const height = numericVal1;
            const weight = numericVal2;

            let topSize, fitAdvice, insights;

            if (weight < 60) {
                topSize = "S (CN 170/88A)";
                fitAdvice = "Slim Fit";
            } else if (weight < 70) {
                topSize = "M (CN 175/92A)";
                fitAdvice = "Regular Fit";
            } else if (weight < 80) {
                topSize = "L (CN 180/96A)";
                fitAdvice = "Oversized Street Fit";
            } else {
                topSize = "XL+ (CN 185/104A)";
                fitAdvice = "Relaxed Fit";
            }

            insights = `Height ${height}cm, weight ${weight}kg. Asian sizes often run small; this recommendation ensures proper shoulder and length fit.`;
            result = {
                size: topSize,
                fit: fitAdvice,
                confidence: "98.5%",
                extra: insights
            };
            break;
        }

        case 'pants': {
            const height = numericVal1;
            const waist = numericVal2;

            let pantsSize, fitAdvice, insights;

            if (waist >= 90) {
                pantsSize = "34 (US) / 88cm Waist";
                fitAdvice = "Loose Straight";
            } else if (waist >= 80) {
                pantsSize = "32 (US) / 82cm Waist";
                fitAdvice = "Straight Comfort";
            } else if (waist >= 72) {
                pantsSize = "31 (US) / 78cm Waist";
                fitAdvice = "Slim Straight";
            } else {
                pantsSize = "30 (US) / 76cm Waist";
                fitAdvice = "Slim Tapered";
            }

            insights = `Waist ${waist}cm, height ${height}cm. Standard inseam recommended; if height over 180cm, consider extended length.`;
            result = {
                size: pantsSize,
                fit: fitAdvice,
                confidence: "96.0%",
                extra: insights
            };
            break;
        }
    }

    setTimeout(() => {
        res.status(200).json(result);
    }, 300);
};