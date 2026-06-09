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
  const sections = result?.tableNotice
    ? [
        ['공문 제목', 'title'],
        ['기안문 본문', 'body'],
        ['표/현황 자료 안내', 'tableNotice'],
        ['붙임 목록', 'attachments'],
        ['교직원 메신저 안내문', 'messenger'],
        ['기안 전 체크리스트', 'checklist'],
      ]
    : RESULT_SECTIONS;

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
              왼쪽에서 문서 목적과 보건업무 분야를 선택하고 기본 정보를 입력한 뒤{' '}
              <strong>[문서 초안 생성]</strong> 또는 <strong>[이 자료 적용]</strong>을 눌러 주세요.
            </p>
            <p>생성 후에는 공문 제목, 본문, 붙임, 메신저 안내문, 체크리스트를 순서대로 확인할 수 있습니다.</p>
          </div>
        </div>
      ) : (
        <div className="result-sections">
          {result.sourceLabel && <div className="source-label">{result.sourceLabel}</div>}
          {result.tableCopyText && (
            <div className="table-copy-box">
              <div>
                <strong>표 복사용 본문</strong>
                <p>{result.tableCopyGuide || '버튼을 누르면 스프레드시트에 붙여넣기 좋은 탭 구분 텍스트가 복사됩니다.'}</p>
              </div>
              <CopyButton text={result.tableCopyText} onCopied={onCopied} variant="wide">
                표 복사
              </CopyButton>
            </div>
          )}
          {sections.map(([label, key]) => (
            <article className={key === 'tableNotice' ? 'result-section table-notice-section' : 'result-section'} key={key}>
              <div className="result-section-title">
                <h3>{label}</h3>
                {key !== 'tableNotice' && <CopyButton text={result[key]} onCopied={onCopied} />}
              </div>
              <pre>{result[key]}</pre>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
