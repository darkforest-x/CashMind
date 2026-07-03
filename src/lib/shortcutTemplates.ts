type ShortcutTemplateInput = {
  readonly captureUrl: string | null;
  readonly shortcutToken: string;
};

export type ShortcutTemplateBundle = {
  readonly captureUrl: string;
  readonly walletBody: string;
  readonly textBody: string;
  readonly packageText: string;
};

function getTokenizedCaptureUrl(captureUrl: string | null, shortcutToken: string): string {
  if (!captureUrl) {
    return '请先配置 API 地址';
  }
  const token = shortcutToken.trim();
  return token ? `${captureUrl}?token=${encodeURIComponent(token)}` : captureUrl;
}

export function buildShortcutTemplates(input: ShortcutTemplateInput): ShortcutTemplateBundle {
  const captureUrl = getTokenizedCaptureUrl(input.captureUrl, input.shortcutToken);
  const walletBody = JSON.stringify({
    amount: '交易金额',
    merchant: '商户名称',
    card: '卡片或账户',
    currency: 'CNY',
    source: 'wallet',
  }, null, 2);
  const textBody = JSON.stringify({
    text: '短信、邮件、通知或 OCR 识别出的完整文本',
    source: 'sms',
  }, null, 2);
  const packageText = [
    'AI 管钱花快捷指令配置包',
    '',
    '这套配置只负责写入流水。浏览器读取和编辑账单需要先授权一次。',
    '',
    '万能入口 URL:',
    captureUrl,
    '',
    '快捷指令动作:',
    '1. 新建自动化，触发条件可选 Wallet、短信、邮件或 OCR 文本。',
    '2. 添加动作: 获取 URL 内容。',
    '3. URL: 粘贴上面的万能入口 URL。',
    '4. 方法: POST。',
    '5. 请求正文: JSON。',
    '6. Headers: 不需要填。',
    '',
    'Wallet / Apple Pay 请求体:',
    walletBody,
    '',
    '短信 / 邮件 / OCR 请求体:',
    textBody,
  ].join('\n');

  return { captureUrl, walletBody, textBody, packageText };
}
