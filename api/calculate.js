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
  3. **Key Measurements to Check** (e.g. Chest/Shoulder/Insole in cm).
  4. **Tailored Advice** (Shrinkage risk, loose vs slim cut recommendation).
  
  **CRITICAL RULES**:
  - Respond entirely in English. Do NOT include any Chinese characters, pinyin, or non-English scripts.
  - Only mention these platforms: Taobao, JD.com, Poizon/Dewu, 1688. Do not mention any other platforms.
  - Use standard English brand names (e.g., "New Balance", not "新平衡牌鞋").
  - Avoid random characters, symbols, or formatting artifacts.
  - Ensure all measurement units are clear and consistent.
  - Keep the response professional, concise, and actionable.`;
  
      const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are ChinaFit AI sizing expert. Always output valid English markdown only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6,
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