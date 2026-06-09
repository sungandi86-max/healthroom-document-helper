import React, { useEffect, useMemo, useState } from 'react';
import { fetchDocumentReferences } from '../api/documents.js';

const tokenize = (value) =>
  String(value || '')
    .toLowerCase()
    .split(/[\s,./·_-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

const scoreReference = (reference, documentType, selectedField) => {
  if (reference.documentPurpose === documentType && reference.workArea === selectedField) {
    return 100;
  }

  const tokens = [...tokenize(documentType), ...tokenize(selectedField)];
  return tokens.reduce((score, token) => score + (reference.searchText.includes(token) ? 1 : 0), 0);
};

function ReferenceCard({ reference, onApply }) {
  return (
    <article className="reference-card">
      <div className="reference-card-header">
        <div>
          <h3>{reference.title}</h3>
          <p>
            {reference.documentPurpose || '문서목적 미정'} · {reference.workArea || '업무분야 미정'}
          </p>
        </div>
        <div className="badge-stack">
          {reference.hasTable && <span className="table-badge">표 포함</span>}
          {reference.status && <span className="status-badge subtle">{reference.status}</span>}
        </div>
      </div>
      <p className="reference-description">{reference.description || '설명 없음'}</p>
      <div className="resource-meta">
        <span>{reference.fileType || '파일형태 미정'}</span>
        {reference.priority && <span>우선순위 {reference.priority}</span>}
      </div>
      <div className="reference-actions">
        <button className="primary-button resource-link" type="button" onClick={() => onApply(reference)}>
          이 자료 적용
        </button>
        {reference.sourceUrl && (
          <a className="secondary-button resource-link" href={reference.sourceUrl} target="_blank" rel="noreferrer">
            원문 열기
          </a>
        )}
      </div>
    </article>
  );
}

export default function ReferenceDocuments({ documentType, selectedField, onApply }) {
  const [references, setReferences] = useState([]);
  const [loadState, setLoadState] = useState({ status: 'loading', message: '' });

  useEffect(() => {
    let cancelled = false;

    fetchDocumentReferences()
      .then((documents) => {
        if (cancelled) return;
        setReferences(documents);
        setLoadState({ status: 'ready', message: '' });
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadState({ status: 'error', message: error.message || '참고 공문을 불러오지 못했습니다.' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const recommendedReferences = useMemo(() => {
    const exactMatches = references.filter(
      (reference) => reference.documentPurpose === documentType && reference.workArea === selectedField,
    );

    if (exactMatches.length > 0) {
      return exactMatches.slice(0, 3);
    }

    return references
      .map((reference) => ({
        reference,
        score: scoreReference(reference, documentType, selectedField),
      }))
      .filter((item) => item.score > 0)
      .sort((first, second) => second.score - first.score)
      .slice(0, 3)
      .map((item) => item.reference);
  }, [documentType, references, selectedField]);

  return (
    <section className="section-card reference-panel">
      <div className="section-heading">
        <span className="step-badge">R</span>
        <h2>참고 공문 불러오기</h2>
      </div>
      <p className="helper-text">
        선택한 문서 목적과 업무 분야에 맞는 공문자료목록의 참고 공문을 최대 3개 추천합니다.
      </p>

      {loadState.status === 'loading' && <div className="library-message">참고 공문을 불러오는 중입니다.</div>}
      {loadState.status === 'error' && <div className="library-message error">{loadState.message}</div>}
      {loadState.status === 'ready' && recommendedReferences.length === 0 && (
        <div className="library-message">
          선택한 조건에 맞는 참고 공문이 없습니다. 문서 목적이나 업무 분야를 바꿔 다시 확인해보세요.
        </div>
      )}
      {loadState.status === 'ready' && recommendedReferences.length > 0 && (
        <div className="reference-list">
          {recommendedReferences.map((reference) => (
            <ReferenceCard key={`${reference.no}-${reference.title}`} reference={reference} onApply={onApply} />
          ))}
        </div>
      )}
    </section>
  );
}
