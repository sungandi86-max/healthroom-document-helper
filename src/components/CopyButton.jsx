import React from 'react';
import { copyText } from '../utils/copyText.js';

export default function CopyButton({ text, onCopied, children = '복사하기', variant = 'small' }) {
  const handleCopy = async () => {
    const copied = await copyText(text);
    if (copied) onCopied?.();
  };

  return (
    <button className={variant === 'wide' ? 'copy-button wide' : 'copy-button'} type="button" onClick={handleCopy}>
      {children}
    </button>
  );
}
