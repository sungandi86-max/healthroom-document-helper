import React, { useMemo, useState } from 'react';
import Header from './components/Header.jsx';
import PrivacyNotice from './components/PrivacyNotice.jsx';
import DocumentTypeTabs from './components/DocumentTypeTabs.jsx';
import FieldSelect from './components/FieldSelect.jsx';
import DocumentForm from './components/DocumentForm.jsx';
import ResultPanel from './components/ResultPanel.jsx';
import Toast from './components/Toast.jsx';
import { DEFAULT_FORM_VALUES, DOCUMENT_TYPES, FIELD_OPTIONS } from './data/options.js';
import { generateDocument, getExampleValues } from './utils/generateDocument.js';

export default function App() {
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [selectedField, setSelectedField] = useState(FIELD_OPTIONS[0]);
  const [formValues, setFormValues] = useState(DEFAULT_FORM_VALUES);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState('');

  const generationInput = useMemo(
    () => ({ documentType, selectedField, formValues }),
    [documentType, selectedField, formValues],
  );

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 1800);
  };

  const handleGenerate = () => {
    setResult(generateDocument(generationInput));
  };

  const handleReset = () => {
    setFormValues(DEFAULT_FORM_VALUES);
    setResult(null);
    showToast('초기화되었습니다');
  };

  const handleLoadExample = () => {
    setFormValues({ ...DEFAULT_FORM_VALUES, ...getExampleValues(selectedField) });
    setResult(null);
    showToast('예시를 불러왔습니다');
  };

  return (
    <div className="app-shell">
      <Header />
      <main>
        <PrivacyNotice />
        <div className="workspace-grid">
          <div className="input-stack">
            <DocumentTypeTabs value={documentType} onChange={setDocumentType} />
            <FieldSelect value={selectedField} onChange={setSelectedField} />
            <DocumentForm
              values={formValues}
              onChange={setFormValues}
              onGenerate={handleGenerate}
              onReset={handleReset}
              onLoadExample={handleLoadExample}
            />
          </div>
          <ResultPanel result={result} onCopied={() => showToast('복사되었습니다')} />
        </div>
      </main>
      <footer>© 쑤캥T 보건실 공문·보고서 도우미 · 개인 업무용 문서 작성 도구</footer>
      <Toast message={toast} />
    </div>
  );
}
