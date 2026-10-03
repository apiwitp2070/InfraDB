/**
 * Copies text to the clipboard. Falls back to a hidden textarea and
 * `document.execCommand("copy")` where the async Clipboard API is unavailable
 * (for example on non-secure origins).
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);

    return;
  }

  const textArea = document.createElement("textarea");

  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
};
