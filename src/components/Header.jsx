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
        보건실 공문 초안 작성과 공개자료 검색을 한 곳에서 처리할 수 있는 실무형 도구입니다.
      </p>
      <a className="hub-link" href={APP_CONFIG.hubUrl}>
        {APP_CONFIG.hubName}로 이동
      </a>
    </header>
  );
}
