import React from 'react';
import CopyButton from './CopyButton.jsx';
import { composeAllResults } from '../utils/generateDocument.js';

const RESULT_SECTIONS = [
  ['공문 제목', 'title'],
  ['기안문 본문', 'body'],
  ['붙임 목록', 'attachments'],
  ['교직원 메신저 안내문', 'messenger'],
  ['기안 전 체크리스트', 'checklist'],
];

export default function ResultPanel({ result, onCopied }) {
  return (
    <section className="section-card result-card">
      <div className="result-header">
        <div className="section-heading">
          <span className="step-badge">4</span>
          <h2>생성 결과</h2>
        </div>
        {result && (
          <CopyButton text={composeAllResults(result)} onCopied={onCopied} variant="wide">
            전체 복사
          </CopyButton>
        )}
      </div>

      {!result ? (
        <div className="empty-result">
          <div className="empty-result-inner">
            <p>
              왼쪽에서 문서 목적과 보건업무 분야를 선택한 뒤 기본 정보를 입력하고{' '}
              <strong>[문서 초안 생성]</strong>을 눌러 주세요.
            </p>
            <p>생성 후에는</p>
            <ol>
              <li>공문 제목</li>
              <li>기안문 본문</li>
              <li>붙임 목록</li>
              <li>교직원 메신저</li>
              <li>기안 전 체크리스트</li>
            </ol>
            <p>가 순서대로 표시됩니다.</p>
          </div>
        </div>
      ) : (
        <div className="result-sections">
          {RESULT_SECTIONS.map(([label, key]) => (
            <article className="result-section" key={key}>
              <div className="result-section-title">
                <h3>{label}</h3>
                <CopyButton text={result[key]} onCopied={onCopied} />
              </div>
              <pre>{result[key]}</pre>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
