function copyWithSelection(value: string): boolean {
  const element = document.createElement('textarea');
  element.value = value;
  element.setAttribute('readonly', 'true');
  element.style.position = 'fixed';
  element.style.top = '0';
  element.style.left = '0';
  element.style.width = '1px';
  element.style.height = '1px';
  element.style.opacity = '0';
  document.body.appendChild(element);
  element.focus();
  element.select();
  element.setSelectionRange(0, value.length);

  try {
    return typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch (error) {
    console.warn('Selection clipboard copy failed:', error instanceof Error ? error.message : String(error));
    return false;
  } finally {
    document.body.removeChild(element);
  }
}

export async function copyToClipboard(value: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (error) {
      console.warn('Async clipboard copy failed:', error instanceof Error ? error.message : String(error));
    }
  }

  return copyWithSelection(value);
}
