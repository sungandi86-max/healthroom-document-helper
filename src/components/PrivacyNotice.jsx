import React from 'react';
import { NOTICE_TEXT } from '../data/config.js';

export default function PrivacyNotice() {
  return (
    <section className="privacy-notice" aria-label="개인정보 주의 안내">
      <strong>개인정보 주의</strong>
      <p>{NOTICE_TEXT.privacy} 필요한 경우 학년, 학급, 인원처럼 비식별 정보로 작성해 주세요.</p>
      <p>공문도우미는 입력한 내용을 저장하지 않습니다. 개인정보가 포함된 문서는 제출 전 반드시 확인해주세요.</p>
    </section>
  );
}
