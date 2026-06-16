import React from 'react';
import { NOTICE_TEXT } from '../data/config.js';

export default function PrivacyNotice() {
  return (
    <section className="privacy-notice" aria-label="개인정보 주의 안내">
      <strong>개인정보 주의</strong>
      <p>{NOTICE_TEXT.privacy} 필요한 경우 학년, 학급, 인원처럼 비식별 정보로 작성해 주세요.</p>
    </section>
  );
}
