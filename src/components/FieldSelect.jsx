import React from 'react';
import { FIELD_OPTIONS } from '../data/options.js';

export default function FieldSelect({ value, onChange }) {
  return (
    <section className="section-card">
      <div className="section-heading">
        <span className="step-badge">2</span>
        <h2>보건업무 분야 선택</h2>
      </div>
      <label className="select-label" htmlFor="field-select">
        업무 분야
      </label>
      <select id="field-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {FIELD_OPTIONS.map((field) => (
          <option key={field} value={field}>
            {field}
          </option>
        ))}
      </select>
    </section>
  );
}
