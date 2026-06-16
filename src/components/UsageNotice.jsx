import React from 'react';
import { NOTICE_TEXT } from '../data/config.js';

export default function UsageNotice({ compact = false, title = '저작권 및 이용 안내' }) {
  return (
    <section className={compact ? 'usage-notice compact' : 'usage-notice'} aria-label={title}>
      <strong>{title}</strong>
      <p>{NOTICE_TEXT.usage}</p>
      {!compact && <p>{NOTICE_TEXT.usageDetail}</p>}
    </section>
  );
}
