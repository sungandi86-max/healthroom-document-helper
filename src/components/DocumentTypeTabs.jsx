import React from 'react';
import { DOCUMENT_TYPES } from '../data/options.js';

export default function DocumentTypeTabs({ value, onChange }) {
  return (
    <section className="section-card">
      <div className="section-heading">
        <span className="step-badge">1</span>
        <h2>문서 목적 선택</h2>
      </div>
      <div className="tab-grid" role="tablist" aria-label="문서 목적">
        {DOCUMENT_TYPES.map((type) => (
          <button
            className={value === type ? 'tab-button active' : 'tab-button'}
            key={type}
            type="button"
            onClick={() => onChange(type)}
            role="tab"
            aria-selected={value === type}
          >
            {type}
          </button>
        ))}
      </div>
    </section>
  );
}
