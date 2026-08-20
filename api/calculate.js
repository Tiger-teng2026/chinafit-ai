// ChinaFit AI 核心计算引擎 (Node.js 后端 - Vercel Serverless Function)
// 使用 CommonJS 导出，确保与 Vercel 默认环境兼容
// 接入 DeepSeek AI 进行智能尺码推理

module.exports = async function handler(req, res) {
    // 设置 CORS 头（便于本地调试）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 只接受 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
    }

    // 获取前端发送的参数（保持原有结构）
    const { category, val1, val2 } = req.body || {};
    const numericVal1 = Number(val1);
    const numericVal2 = Number(val2);

    // 基础参数校验
    if (!category || !['shoes', 'tops', 'pants'].includes(category)) {
        return res.status(400).json({ error: 'Invalid category. Must be shoes, tops, or pants.' });
    }
    if (isNaN(numericVal1) || isNaN(numericVal2) || numericVal1 <= 0 || numericVal2 <= 0) {
        return res.status(400).json({ error: 'Body measurements must be positive numbers.' });
    }

    // 检查 DeepSeek API Key 是否存在
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.error('DEEPSEEK_API_KEY is not set in Vercel environment variables.');
        return res.status(500).json({ error: 'DeepSeek API key is not configured on the server.' });
    }

    // 根据 category 构建给 DeepSeek 的提示词
    let promptContext = '';
    if (category === 'shoes') {
        promptContext = `The user is shopping for shoes on a Chinese platform. 
        - Foot length: ${numericVal1} mm
        - Foot width: ${numericVal2} mm
        Please recommend the appropriate Chinese shoe size, including EUR and US equivalents.`;
    } else if (category === 'tops') {
        promptContext = `The user is shopping for tops/outerwear on a Chinese platform.
        - Height: ${numericVal1} cm
        - Weight: ${numericVal2} kg
        Please recommend the appropriate Chinese clothing size (e.g., S, M, L, XL) and note that Chinese sizes tend to run small.`;
    } else if (category === 'pants') {
        promptContext = `The user is shopping for pants on a Chinese platform.
        - Height: ${numericVal1} cm
        - Waist circumference: ${numericVal2} cm
        Please recommend the appropriate Chinese pants size, including US waist size and fit type.`;
    }

    const prompt = `You are an expert AI fashion and sizing consultant for international shoppers buying from Chinese platforms (e.g., Taobao, JD, Poizon/Dewu).

    ${promptContext}

    Important: Respond entirely in English. Provide a clear JSON object with the following keys:
    - "recommendedSize": string (e.g., "42 EUR / 8.5 US" or "L (CN 180/96A)")
    - "confidence": string (e.g., "95%")
    - "fitAdvice": string (e.g., "Standard fit, buy regular size")
    - "insights": string (detailed explanation referencing the user's measurements and Chinese sizing characteristics)

    Ensure the JSON is valid and contains no additional text outside the JSON.`;

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: 'You are a helpful sizing assistant. Always output valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3,
                max_tokens: 500
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('DeepSeek API error:', data);
            throw new Error(data.error?.message || 'Failed to call DeepSeek API');
        }

        // 解析 DeepSeek 返回的内容
        const aiContent = data.choices[0].message.content;
        let aiResult;
        try {
            aiResult = JSON.parse(aiContent);
        } catch (parseError) {
            console.error('Failed to parse DeepSeek JSON response:', aiContent);
            throw new Error('Invalid response format from AI engine.');
        }

        // 返回标准格式给前端
        return res.status(200).json({
            success: true,
            size: aiResult.recommendedSize,
            fit: aiResult.fitAdvice,
            confidence: aiResult.confidence,
            extra: aiResult.insights
        });

    } catch (error) {
        console.error('AI Calculation Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};