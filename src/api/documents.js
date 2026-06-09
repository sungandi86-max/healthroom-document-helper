import { getValue, isTrueValue, parseCsv } from './csv.js';

const DOCUMENT_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1jUbcsbIjBuQ7aBfUBTKQ5s9uC7-VQ02x7WocRDmLb0o/gviz/tq?tqx=out:csv&sheet=%EA%B3%B5%EB%AC%B8%EC%9E%90%EB%A3%8C%EB%AA%A9%EB%A1%9D';

const hasTableLikePatterns = (text) => {
  const body = String(text || '');
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const shortLineCount = lines.filter((line) => line.length <= 12).length;

  return (
    /현황|인원|1반|2반|3반|계|합계|\t/.test(body) ||
    /\d+\s+\d+\s+\d+/.test(body) ||
    (lines.length >= 8 && shortLineCount >= 5)
  );
};

const normalizeDocument = (row) => {
  const templateBody = getValue(row, '템플릿본문');
  const dataShape = getValue(row, ['자료형태구분', '자료형태']);
  const inferredShape = dataShape || (hasTableLikePatterns(templateBody) ? '표포함' : '본문형');

  return {
    no: getValue(row, 'No'),
    documentPurpose: getValue(row, '문서목적'),
    workArea: getValue(row, '업무분야'),
    title: getValue(row, '자료명'),
    description: getValue(row, '설명'),
    sourceUrl: getValue(row, '참고문서URL'),
    fileType: getValue(row, '파일형태'),
    templateBody,
    attachmentExample: getValue(row, '붙임예시'),
    messengerExample: getValue(row, '메신저예시'),
    checklist: getValue(row, '체크리스트'),
    status: getValue(row, '상태'),
    priority: getValue(row, '우선순위'),
    memo: getValue(row, '메모'),
    dataShape: inferredShape,
    hasTable: inferredShape === '표포함' || hasTableLikePatterns(templateBody),
    searchText: [
      getValue(row, '자료명'),
      getValue(row, '설명'),
      getValue(row, '업무분야'),
      getValue(row, '문서목적'),
    ]
      .join(' ')
      .toLowerCase(),
  };
};

export const fetchDocumentReferences = async () => {
  const response = await fetch(DOCUMENT_SHEET_CSV_URL);
  if (!response.ok) {
    throw new Error('공문자료목록을 불러오지 못했습니다.');
  }

  const csvText = await response.text();
  return parseCsv(csvText)
    .filter((row) => isTrueValue(getValue(row, '사용여부')))
    .filter((row) => getValue(row, '상태') !== '보류')
    .map(normalizeDocument)
    .filter((document) => document.title);
};
