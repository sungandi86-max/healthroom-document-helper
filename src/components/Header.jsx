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
        보건실 업무에 맞는 계획 기안, 결과 보고, 안내문 발송, 실적 보고 초안을 빠르게 정리해요.
      </p>
      <a className="hub-link" href={APP_CONFIG.hubUrl}>
        ← {APP_CONFIG.hubName}로
      </a>
    </header>
  );
}
