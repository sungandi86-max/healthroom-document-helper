import React from 'react';
import { NOTICE_TEXT } from '../data/config.js';

export default function FooterNotice({ showUsage = false }) {
  return (
    <footer className="footer-notice">
      <p>{NOTICE_TEXT.copyright}</p>
      {showUsage && <p>{NOTICE_TEXT.footer}</p>}
    </footer>
  );
}
