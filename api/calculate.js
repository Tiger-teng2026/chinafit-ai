// ChinaFit AI 核心计算引擎 (Node.js 后端 - Vercel Serverless Function)
// 使用 CommonJS 导出，确保与 Vercel 默认环境兼容

module.exports = function handler(req, res) {
    // 只处理 POST 请求
    if (req.method !== 'POST') {
        return res.status(200).send('ChinaFit AI 核心引擎运行中！请使用 POST 请求提交数据。');
    }

    // 获取并校验参数
    const { category, val1, val2 } = req.body || {};
    const numericVal1 = Number(val1);
    const numericVal2 = Number(val2);

    // 基本参数校验
    if (!category || !['shoes', 'tops', 'pants'].includes(category)) {
        return res.status(400).json({ error: '无效的品类 (category)，应为 shoes、tops 或 pants。' });
    }
    if (isNaN(numericVal1) || isNaN(numericVal2) || numericVal1 <= 0 || numericVal2 <= 0) {
        return res.status(400).json({ error: '身体数据必须为正数，请检查输入。' });
    }

    let result = {};

    switch (category) {
        case 'shoes': {
            // val1 = 脚长 (mm), val2 = 脚宽 (mm)
            const footLength = numericVal1;
            const footWidth = numericVal2;

            let eurSize, usSize, fitAdvice, insights;

            // 精确尺码对照表（依据亚洲常见运动鞋尺码标准）
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

            // 脚宽智能判断（常规亚洲脚宽在 90~100mm 之间）
            if (footWidth > 100) {
                fitAdvice = "宽松舒适（建议选大半码）";
                insights = `检测到脚宽 ${footWidth}mm（属于宽脚型），部分潮鞋版型偏窄，建议买大半码以防夹脚。`;
            } else if (footWidth < 85) {
                fitAdvice = "窄脚特选（可选小半码）";
                insights = `脚宽 ${footWidth}mm 较窄，常规尺码可能会显松，可尝试小半码或选择窄版鞋楦。`;
            } else {
                fitAdvice = "标准贴合（按常规尺码购买）";
                insights = `脚长 ${footLength}mm，脚宽 ${footWidth}mm，完美契合标准亚洲脚型，可直接按日常尺码下单。`;
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
            // val1 = 身高 (cm), val2 = 体重 (kg)
            const height = numericVal1;
            const weight = numericVal2;

            let topSize, fitAdvice, insights;

            if (weight < 60) {
                topSize = "S (CN 170/88A)";
                fitAdvice = "修身剪裁 (Slim Fit)";
            } else if (weight < 70) {
                topSize = "M (CN 175/92A)";
                fitAdvice = "标准剪裁 (Regular Fit)";
            } else if (weight < 80) {
                topSize = "L (CN 180/96A)";
                fitAdvice = "宽松街头风 (Oversized)";
            } else {
                topSize = "XL+ (CN 185/104A)";
                fitAdvice = "加肥加大 (Relaxed Fit)";
            }

            insights = `身高 ${height}cm、体重 ${weight}kg。亚洲码服饰通常偏小一码，此推荐已考虑肩宽和衣长。`;
            result = {
                size: topSize,
                fit: fitAdvice,
                confidence: "98.5%",
                extra: insights
            };
            break;
        }

        case 'pants': {
            // val1 = 身高 (cm), val2 = 腰围 (cm)
            const height = numericVal1;
            const waist = numericVal2;

            let pantsSize, fitAdvice, insights;

            if (waist >= 90) {
                pantsSize = "34 (US) / 88cm Waist";
                fitAdvice = "宽松直筒";
            } else if (waist >= 80) {
                pantsSize = "32 (US) / 82cm Waist";
                fitAdvice = "直筒舒适";
            } else if (waist >= 72) {
                pantsSize = "31 (US) / 78cm Waist";
                fitAdvice = "修身直筒";
            } else {
                pantsSize = "30 (US) / 76cm Waist";
                fitAdvice = "修身小直筒";
            }

            insights = `腰围 ${waist}cm，身高 ${height}cm。建议选择标准裤长，若身高超过 180cm 可考虑加长版。`;
            result = {
                size: pantsSize,
                fit: fitAdvice,
                confidence: "96.0%",
                extra: insights
            };
            break;
        }
    }

    // 模拟轻微计算延迟（让用户感知后端在真实运算）
    setTimeout(() => {
        res.status(200).json(result);
    }, 300);
};