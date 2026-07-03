import React from 'react';
import { APP_CONFIG } from '../data/config.js';

export default function Header() {
  return (
    <header className="app-header">
      <div className="brand-row">
        <div className="logo-mark" aria-hidden="true">
          보
        </div>
        <div>
          <p className="eyebrow">쑤캥T 보건실 업무도구</p>
          <h1>{APP_CONFIG.appName}</h1>
        </div>
      </div>
      <p className="subtitle">
        보건교사를 위한 공문·문서 작성 보조 도구입니다.
      </p>
      <div className="header-character">
        <img src="/otter-health-teacher.png" alt="수달 보건교사 캐릭터" />
      </div>
    </header>
  );
}
