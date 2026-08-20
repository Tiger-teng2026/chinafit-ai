// 真实后端接口 (Vercel Serverless Function)
// 使用 CommonJS 风格，兼容性最好
module.exports = function handler(req, res) {
    // 只处理 POST 请求
    if (req.method !== 'POST') {
      res.status(200).send('ChinaFit AI 后端引擎运行正常！请使用 POST 请求提交数据。');
      return;
    }
  
    // 获取并校验参数
    const { category, val1, val2 } = req.body || {};
    const numericVal1 = Number(val1);
    const numericVal2 = Number(val2);
  
    if (!category || !['shoes', 'tops', 'pants'].includes(category)) {
      return res.status(400).json({ error: '无效的品类 (category)，应为 shoes/tops/pants。' });
    }
  
    if (isNaN(numericVal1) || isNaN(numericVal2) || numericVal1 <= 0 || numericVal2 <= 0) {
      return res.status(400).json({ error: '身体数据必须为正数，请检查输入。' });
    }
  
    let result = {};
  
    switch (category) {
      case 'shoes':
        // 脚长 mm 和脚宽 mm
        if (numericVal1 >= 270) {
          result = {
            size: '44 (EUR) / 10 (US)',
            fit: '标准偏大',
            confidence: '98%',
            extra: '脚长超过 270mm，建议选大半码以获得舒适空间。'
          };
        } else if (numericVal1 >= 250) {
          result = {
            size: '42 (EUR) / 8.5 (US)',
            fit: '标准尺码',
            confidence: '95%',
            extra: '常规亚洲脚型，推荐标准宽度 D。'
          };
        } else {
          result = {
            size: '40 (EUR) / 7 (US)',
            fit: '标准偏小',
            confidence: '93%',
            extra: '脚长较短，注意选择窄版或女款尺码。'
          };
        }
        // 根据脚宽微调
        if (numericVal2 > 105) {
          result.fit = '宽脚版型';
          result.extra += ' 脚宽超出平均，建议选择宽版 (2E) 或大半码。';
        }
        break;
  
      case 'tops':
        // 身高 cm 和体重 kg
        if (numericVal2 >= 85) {
          result = {
            size: 'XL (US) / 185/104A (CN)',
            fit: '宽松剪裁',
            confidence: '96%',
            extra: '体重较大，建议选 XL 保证肩部和胸部舒适。'
          };
        } else if (numericVal2 >= 70) {
          result = {
            size: 'L (US) / 180/100A (CN)',
            fit: '标准剪裁',
            confidence: '97%',
            extra: '标准身材，推荐 L 码，版型适中。'
          };
        } else {
          result = {
            size: 'M (US) / 175/96A (CN)',
            fit: '修身剪裁',
            confidence: '97%',
            extra: '体重较轻，M 码修身效果更佳。'
          };
        }
        break;
  
      case 'pants':
        // 身高 cm 和腰围 cm
        if (numericVal2 >= 90) {
          result = {
            size: '34 (US) / 88cm Waist',
            fit: '宽松直筒',
            confidence: '92%',
            extra: '腰围偏大，建议选择 34 或以上，避免紧绷。'
          };
        } else if (numericVal2 >= 80) {
          result = {
            size: '32 (US) / 82cm Waist',
            fit: '直筒舒适',
            confidence: '95%',
            extra: '标准腰围，32 码最合适。'
          };
        } else {
          result = {
            size: '30 (US) / 76cm Waist',
            fit: '修身直筒',
            confidence: '94%',
            extra: '腰围较细，30 码即可，注意裤长是否足够。'
          };
        }
        // 根据身高提示裤长
        if (numericVal1 >= 180) {
          result.extra += ' 身高较高，建议选择长裤版本或定制裤长。';
        }
        break;
  
      default:
        // 理论上不会走到这里，因为前面已校验
        break;
    }
  
    // 模拟真实计算延迟（可选，让用户感知后端在运行）
    setTimeout(() => {
      res.status(200).json(result);
    }, 300);
  };