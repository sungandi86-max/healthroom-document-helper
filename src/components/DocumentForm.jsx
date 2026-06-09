import React, { useState } from 'react';
import { FORM_FIELDS } from '../data/options.js';

const primaryFieldNames = new Set([
  'schoolYear',
  'schoolName',
  'relatedDocument',
  'workName',
  'target',
  'dateTime',
  'place',
  'mainContent',
]);

const longFields = new Set(['mainContent', 'attachments', 'notes']);

const renderField = (field, values, onFieldChange) => (
  <label className={longFields.has(field.name) ? 'field full' : 'field'} key={field.name}>
    <span>{field.label}</span>
    {longFields.has(field.name) ? (
      <textarea
        value={values[field.name]}
        placeholder={field.placeholder}
        rows={field.name === 'mainContent' ? 4 : 3}
        onChange={(event) => onFieldChange(field.name, event.target.value)}
      />
    ) : (
      <input
        value={values[field.name]}
        placeholder={field.placeholder}
        onChange={(event) => onFieldChange(field.name, event.target.value)}
      />
    )}
  </label>
);

export default function DocumentForm({ values, onChange, onGenerate, onReset, onLoadExample }) {
  const [isOptionalOpen, setIsOptionalOpen] = useState(false);
  const primaryFields = FORM_FIELDS.filter((field) => primaryFieldNames.has(field.name));
  const optionalFields = FORM_FIELDS.filter((field) => !primaryFieldNames.has(field.name));

  const handleChange = (name, value) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <section className="section-card form-card">
      <div className="section-heading">
        <span className="step-badge">3</span>
        <h2>기본 정보 입력</h2>
      </div>
      <p className="helper-text">
        자주 쓰는 항목만 먼저 입력해도 초안을 만들 수 있습니다. 선택 입력은 필요한 경우 펼쳐서 작성하세요.
      </p>

      <div className="form-grid">{primaryFields.map((field) => renderField(field, values, handleChange))}</div>

      <div className="optional-fields">
        <button
          className="optional-toggle"
          type="button"
          onClick={() => setIsOptionalOpen((current) => !current)}
          aria-expanded={isOptionalOpen}
        >
          <span>{isOptionalOpen ? '선택 입력 접기' : '선택 입력 펼치기'}</span>
          <span aria-hidden="true">{isOptionalOpen ? '−' : '+'}</span>
        </button>
        {isOptionalOpen && (
          <div className="form-grid optional-grid">
            {optionalFields.map((field) => renderField(field, values, handleChange))}
          </div>
        )}
      </div>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={onGenerate}>
          문서 초안 생성
        </button>
        <button className="secondary-button" type="button" onClick={onLoadExample}>
          예시 불러오기
        </button>
        <button className="ghost-button" type="button" onClick={onReset}>
          초기화
        </button>
      </div>
    </section>
  );
}
