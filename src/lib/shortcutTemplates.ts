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
    amount: 'Shortcut Input 的 Amount',
    merchant: 'Shortcut Input 的 Merchant',
    card: 'Shortcut Input 的 Card',
    currency: 'CNY',
    source: 'wallet',
  }, null, 2);
  const textBody = JSON.stringify({
    text: 'Shortcut Input',
    source: 'sms',
  }, null, 2);
  const packageText = [
    'CashMind 快捷指令配置包',
    '',
    '通用入口 URL:',
    captureUrl,
    '',
    '动作: 获取 URL 内容',
    '方法: POST',
    '请求体: JSON',
    'Headers: 不需要填',
    '',
    'Wallet / Apple Pay 请求体:',
    walletBody,
    '',
    '短信 / 邮件 / OCR 请求体:',
    textBody,
  ].join('\n');

  return { captureUrl, walletBody, textBody, packageText };
}
