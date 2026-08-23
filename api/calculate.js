// ChinaFit AI 核心计算引擎 (Node.js 后端 - Vercel Serverless Function)
// 使用 CommonJS 导出，兼容 Vercel 默认环境
// 免费用户走基础规则引擎，付费用户调用 DeepSeek 深度分析

module.exports = async function handler(req, res) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-premium-token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { category, footLength, footWidth, height, weight, waist, gender = 'Unisex' } = req.body;
        const clientToken = req.headers['x-premium-token'] || '';
        const validToken = process.env.PRO_PASS_KEY || 'pro_pass_2026';
        const isPro = clientToken === validToken;

        // ---------- 1. 基础规则引擎（免费用户可见） ----------
        let baseResult = {};

        if (category === 'shoes') {
            const fl = parseFloat(footLength) || 260;
            let euSize, usSize;
            if (fl <= 245) { euSize = 39; usSize = '6.5'; }
            else if (fl <= 250) { euSize = 40; usSize = '7.5'; }
            else if (fl <= 255) { euSize = 41; usSize = '8.0'; }
            else if (fl <= 260) { euSize = 42; usSize = '8.5'; }
            else if (fl <= 265) { euSize = 43; usSize = '9.5'; }
            else if (fl <= 275) { euSize = 44; usSize = '10.0'; }
            else { euSize = 45; usSize = '11.0'; }

            baseResult = {
                recommendedSize: `EU ${euSize} / US ${usSize}`,
                confidence: '88%',
                quickTip: 'Standard fit. Asian lasts may run slightly narrower than Western brands.'
            };
        } else if (category === 'tops') {
            const h = parseFloat(height) || 175;
            const w = parseFloat(weight) || 70;
            let size;
            if (h < 165 || w < 55) size = 'S';
            else if (h < 172 || w < 65) size = 'M';
            else if (h < 180 || w < 78) size = 'L';
            else if (h < 188 || w < 88) size = 'XL';
            else size = '2XL+';

            baseResult = {
                recommendedSize: `CN / Asian Size: ${size}`,
                confidence: '85%',
                quickTip: 'Asian garment sizes run 1 to 2 sizes smaller than US/EU standards.'
            };
        } else if (category === 'pants') {
            const h = parseFloat(height) || 175;
            const w = parseFloat(waist) || 75;
            let size;
            if (w >= 90) size = '34 (US) / 88cm';
            else if (w >= 80) size = '32 (US) / 82cm';
            else if (w >= 72) size = '31 (US) / 78cm';
            else size = '30 (US) / 76cm';

            baseResult = {
                recommendedSize: `Waist ${size}`,
                confidence: '90%',
                quickTip: `Waist ${w}cm, height ${h}cm. Standard length recommended.`
            };
        } else {
            return res.status(400).json({ error: 'Invalid category. Must be shoes, tops, or pants.' });
        }

        if (!isPro) {
            return res.status(200).json({
                isPro: false,
                baseResult,
                proAnalysis: null,
                message: 'Base calculation complete. Upgrade to Pro for deep AI breakdown.'
            });
        }

        // ---------- 2. Pro 用户：调用 DeepSeek 深度分析 ----------
        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
            return res.status(200).json({
                isPro: true,
                baseResult,
                proAnalysis: 'AI Engine configured, but DEEPSEEK_API_KEY is missing in Vercel.',
            });
        }

        // 根据品类构建针对性的提示词
        let promptContext = '';
        if (category === 'shoes') {
            promptContext = `The user is shopping for shoes on Chinese platforms.
- Foot Length: ${footLength || 'N/A'} mm
- Foot Width: ${footWidth || 'N/A'} mm`;
        } else if (category === 'tops') {
            promptContext = `The user is shopping for tops/outerwear on Chinese platforms.
- Height: ${height || 'N/A'} cm
- Weight: ${weight || 'N/A'} kg`;
        } else if (category === 'pants') {
            promptContext = `The user is shopping for pants on Chinese platforms.
- Height: ${height || 'N/A'} cm
- Waist: ${waist || 'N/A'} cm`;
        }

        const prompt = `You are a professional cross-border fashion sizing expert specializing in Chinese e-commerce platforms for international buyers.
${promptContext}
- Target Gender: ${gender}

Please provide an in-depth, structured sizing breakdown in clear English markdown:
1. **Precise Size Conversion** (CN / EU / US / UK).
2. **Platform Specific Fit Warnings** (Taobao/1688 sizing vs Poizon streetwear sizing).
3. **Key Measurements to Check** (e.g. Chest/Shoulder/Insole in cm or mm as appropriate).
4. **Tailored Advice** (Shrinkage risk, loose vs slim cut recommendation).

**CRITICAL RULES (MUST FOLLOW)**:
- You are ONLY allowed to respond in English. Using any Chinese characters, pinyin, or non-English scripts (including inside parentheses, annotations, or examples) is STRICTLY FORBIDDEN.
- This rule applies to the ENTIRE main report body. Do NOT add Chinese translations or annotations next to English terms. For example, write "Insole Length" only, NOT "Insole Length (鞋垫长度)".
- **Units must be consistent with the input field units for the category**:
  - For shoes: ALL length and width measurements MUST be in millimeters (mm). Do NOT convert to centimeters. Example: say "260 mm" not "26.0 cm".
  - For tops and pants: ALL body and garment measurements MUST be in centimeters (cm) as provided (height, weight, chest, waist, etc.). Do NOT convert to other units.
  - Heel-to-toe drop is an exception and may be given in millimeters (mm) if conventional, but for shoes it should also be in mm only.
- **IMPORTANT for Pants measurements**:
  - All garment measurements in Section 3 and in the seller message must be **flat-lay (one side, half of full circumference)** values, because that is how Chinese sellers usually provide them.
  - Do NOT give full circumference values as flat-lay. For example, for a user with 75 cm waist, the flat waist target should be about 38–40 cm (not 76–80 cm). Similar conversion should be applied for hip and thigh: half of full circumference plus 2–4 cm ease.
  - In the report, clearly label measurements as "flat-lay" and provide both the flat target and the full circumference equivalent if helpful, but ensure the primary target is flat.
- EXCEPTION: At the very end of your response, include a special section for the buyer to copy and send to the seller. This section MAY contain Chinese text. Format it EXACTLY as follows:
  ---SELLER_MESSAGE_START---
  **Seller Message (Copy-Paste to Taobao/1688):**  
  [Chinese sentence asking about measurements]
  *(English translation: [English sentence])*
  ---SELLER_MESSAGE_END---
- Inside the Chinese seller message:
  1. Provide the buyer's body measurements using the SAME units as the input fields (for shoes: mm, for clothing: cm). For example, "脚长260毫米，脚宽95毫米" for shoes, or "身高175厘米，体重70公斤" for tops.
  2. Ask ONLY for the product's objective measurements for the recommended size. The recommended size is: ${baseResult.recommendedSize}. Use appropriate units:
     - For shoes: Ask for the insole length and widest width in mm for the recommended size. The question should reference the exact EU size, e.g., "EU42码". Do NOT include US size or descriptive text like "EU 42 / US 8.5".
     - For tops: Ask for chest, shoulder, length, and sleeve in cm for the recommended size. The question should reference the exact letter size, e.g., "L码". Do NOT include "CN / Asian Size" or any descriptive text.
     - For pants: Ask for waist, hip, inseam, and thigh in cm for the recommended size. The question should reference the exact waist size, e.g., "31码". Do NOT include "(US) / 78cm" or any descriptive text.
  3. Do NOT ask the seller to recommend a different size, and do NOT ask questions like "should I buy size X?" or "what size do you recommend?". The buyer will decide based on the measurements.
  4. Avoid subjective phrases that invite opinions, such as "想确认一下尺寸是否合适", "您觉得合适吗", or similar. Only provide body measurements and ask for objective product measurements.
  5. Avoid duplicate questions about the same measurement. Combine into one clear question.
  6. Keep the Chinese sentence polite and concise.
- Only mention these platforms: Taobao, JD.com, Poizon/Dewu, 1688. Do not mention any other platforms.
- Use standard English brand names (e.g., "New Balance", not "新平衡牌鞋").
- Avoid random characters, symbols, or formatting artifacts.
- Ensure all measurement units are clear and consistent.
- Keep the response professional, concise, and actionable.
- The base recommendation from our system is: ${baseResult.recommendedSize}. Please ensure your "Precise Size Conversion" section uses the same size values as the base recommendation to avoid inconsistency. Do not introduce a different size.`;

        const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are ChinaFit AI sizing expert. You must respond ONLY in English, except for the seller message section which may contain Chinese.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 1500
            })
        });

        const aiData = await deepseekResponse.json();
        if (!deepseekResponse.ok) {
            console.error('DeepSeek API error:', aiData);
            throw new Error(aiData.error?.message || 'Failed to call DeepSeek API');
        }

        const proAnalysis = aiData.choices?.[0]?.message?.content || 'AI analysis completed.';

        return res.status(200).json({
            isPro: true,
            baseResult,
            proAnalysis
        });
    } catch (error) {
        console.error('Calculation error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};