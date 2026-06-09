/**
 * 공문자료목록의 PDF 추출 본문을 Gemini API로 정리합니다.
 *
 * 주의:
 * - 이 기능은 관리자용 Apps Script 메뉴에서만 실행합니다. Web App/doGet/doPost 기능으로 노출하지 않습니다.
 * - Gemini API Key는 코드에 직접 쓰지 않고 Script Properties의 GEMINI_API_KEY로 저장합니다.
 * - API Key를 GitHub, Vercel, 프론트엔드 코드, 로그에 노출하지 않습니다.
 * - 템플릿본문과 행 메타데이터가 Gemini API로 전송됩니다.
 * - 공문자료목록에는 비식별 공문 템플릿 자료만 올리는 전제로 사용합니다.
 */

const GEMINI_MODEL = 'gemini-1.5-flash-latest';

const AI_CLEANUP_CONFIG = {
  SPREADSHEET_ID: '1jUbcsbIjBuQ7aBfUBTKQ5s9uC7-VQ02x7WocRDmLb0o',
  SHEET_NAME: '공문자료목록',
  MAX_ROWS_PER_RUN: 5,
  API_KEY_PROPERTY: 'GEMINI_API_KEY',
};

const AI_CLEANUP_COLUMNS = [
  '자료형태구분',
  '비식별원문URL',
  '원문노출여부',
  '표복사용본문',
  '표복사안내',
  'AI정리상태',
  'AI정리일시',
  'AI검토필요',
  'AI정리메모',
];

function addAiDocumentCleanupMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('공문자료 AI 정리')
    .addItem('선택 행 AI 정리', 'cleanSelectedDocumentRowWithGemini')
    .addItem('Gemini API Key 설정 안내', 'showGeminiApiKeyGuide')
    .addToUi();
}

function cleanSelectedDocumentRowWithGemini() {
  const ui = SpreadsheetApp.getUi();
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet ? spreadsheet.getActiveSheet() : null;

  if (!sheet || sheet.getName() !== AI_CLEANUP_CONFIG.SHEET_NAME) {
    ui.alert('공문자료목록 탭에서 정리할 셀을 선택한 뒤 다시 실행해 주세요.');
    return;
  }

  const activeRange = sheet.getActiveRange();
  const rowNumber = activeRange ? activeRange.getRow() : 0;

  if (rowNumber < 2) {
    ui.alert('헤더 행이 아닌 데이터 행의 셀을 선택한 뒤 다시 실행해 주세요.');
    return;
  }

  const headerMap = ensureAiCleanupColumns_(sheet);
  const rowObject = getAiCleanupRowObject_(sheet, headerMap, rowNumber);

  if (isAiCleanupEmptySelectedRow_(rowObject)) {
    ui.alert('선택한 행에 정리할 데이터가 없습니다. 자료명, 사용여부, 템플릿본문이 있는 행을 선택해 주세요.');
    return;
  }

  runGeminiCleanupForRows_([rowNumber], { skipCompleted: false, tableOnly: false });
}

function cleanPendingDocumentRowsWithGemini() {
  SpreadsheetApp.getUi().alert('Gemini 사용량 보호를 위해 미정리 자료 일괄 정리는 일시적으로 비활성화했습니다. 선택 행 AI 정리만 사용해 주세요.');
}

function cleanTableDocumentRowsWithGemini() {
  SpreadsheetApp.getUi().alert('Gemini 사용량 보호를 위해 표포함 자료 일괄 정리는 일시적으로 비활성화했습니다. 선택 행 AI 정리만 사용해 주세요.');
}

function showGeminiApiKeyGuide() {
  SpreadsheetApp.getUi().alert(
    'Gemini API Key 설정 안내',
    '1. Apps Script 왼쪽 프로젝트 설정 클릭\n' +
      '2. 스크립트 속성 추가\n' +
      '3. 속성 이름: GEMINI_API_KEY\n' +
      '4. 값: 발급받은 Gemini API Key 입력\n' +
      '5. 저장 후 다시 실행\n\n' +
      'API Key는 코드에 직접 입력하지 말고 Script Properties에만 저장하세요.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function runGeminiCleanupForRows_(rowNumbers, options) {
  const ui = SpreadsheetApp.getUi();
  const apiKey = getGeminiApiKey_();

  if (!apiKey) {
    showGeminiApiKeyGuide();
    return;
  }

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    const sheet = getAiDocumentSheet_();
    const headerMap = ensureAiCleanupColumns_(sheet);
    const rows = (rowNumbers || []).slice(0, AI_CLEANUP_CONFIG.MAX_ROWS_PER_RUN);
    const summary = { processed: 0, success: 0, review: 0, failed: 0 };

    if (!rows.length) {
      ui.alert('정리할 자료가 없습니다.');
      return;
    }

    rows.forEach(function (rowNumber) {
      summary.processed += 1;

      try {
        const rowObject = getAiCleanupRowObject_(sheet, headerMap, rowNumber);
        const skipReason = getAiCleanupSkipReason_(rowObject, options);

        if (skipReason) {
          writeAiCleanupFailure_(sheet, headerMap, rowNumber, skipReason);
          summary.failed += 1;
          return;
        }

        const result = requestGeminiCleanup_(apiKey, rowObject);
        writeAiCleanupResult_(sheet, headerMap, rowNumber, result);

        if (toAiBoolean_(result.AI검토필요) || result.AI정리상태 === '검토필요') {
          summary.review += 1;
        } else {
          summary.success += 1;
        }
      } catch (error) {
        writeAiCleanupFailure_(sheet, headerMap, rowNumber, sanitizeAiError_(error));
        summary.failed += 1;
      }
    });

    ui.alert(
      '공문자료 AI 정리 완료',
      '처리 건수: ' + summary.processed + '건\n' +
        '성공: ' + summary.success + '건\n' +
        '검토필요: ' + summary.review + '건\n' +
        '실패: ' + summary.failed + '건',
      ui.ButtonSet.OK
    );
  } finally {
    lock.releaseLock();
  }
}

function getAiDocumentSheet_() {
  const spreadsheet = SpreadsheetApp.openById(AI_CLEANUP_CONFIG.SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(AI_CLEANUP_CONFIG.SHEET_NAME);

  if (!sheet) {
    throw new Error('시트 탭을 찾을 수 없습니다: ' + AI_CLEANUP_CONFIG.SHEET_NAME);
  }

  return sheet;
}

function ensureAiCleanupColumns_(sheet) {
  const headerMap = buildAiHeaderMap_(sheet);

  AI_CLEANUP_COLUMNS.forEach(function (columnName) {
    if (!headerMap[columnName]) {
      const column = sheet.getLastColumn() + 1;
      sheet.getRange(1, column).setValue(columnName);
      headerMap[columnName] = column;
    }
  });

  return headerMap;
}

function buildAiHeaderMap_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const map = {};

  headers.forEach(function (header, index) {
    const name = String(header || '').trim();
    if (name) {
      map[name] = index + 1;
    }
  });

  return map;
}

function collectAiCleanupTargetRows_(sheet, headerMap, options) {
  const lastRow = sheet.getLastRow();
  const rows = [];

  for (let rowNumber = 2; rowNumber <= lastRow; rowNumber += 1) {
    const rowObject = getAiCleanupRowObject_(sheet, headerMap, rowNumber);

    if (getAiCleanupSkipReason_(rowObject, options)) {
      continue;
    }

    rows.push(rowNumber);
    if (rows.length >= options.maxRows) {
      break;
    }
  }

  return rows;
}

function getAiCleanupRowObject_(sheet, headerMap, rowNumber) {
  const values = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowObject = {};

  Object.keys(headerMap).forEach(function (columnName) {
    rowObject[columnName] = values[headerMap[columnName] - 1];
  });

  return rowObject;
}

function isAiCleanupEmptySelectedRow_(rowObject) {
  return !String(rowObject['자료명'] || '').trim() &&
    !String(rowObject['템플릿본문'] || '').trim() &&
    !String(rowObject['사용여부'] || '').trim();
}

function getAiCleanupSkipReason_(rowObject, options) {
  if (!toAiBoolean_(rowObject['사용여부'])) {
    return '사용여부가 TRUE가 아닙니다.';
  }

  if (String(rowObject['상태'] || '').trim() === '보류') {
    return '상태가 보류인 자료입니다.';
  }

  if (!toAiBoolean_(rowObject['비식별여부'])) {
    return '비식별여부가 TRUE인 공문 템플릿 자료만 처리합니다.';
  }

  if (!String(rowObject['템플릿본문'] || '').trim()) {
    return '템플릿본문이 비어 있습니다.';
  }

  if (options && options.skipCompleted && String(rowObject['AI정리상태'] || '').trim() === '완료') {
    return '이미 AI 정리 완료 상태입니다.';
  }

  if (options && options.tableOnly && String(rowObject['자료형태구분'] || '').trim() !== '표포함') {
    return '자료형태구분이 표포함이 아닙니다.';
  }

  return '';
}

function getGeminiApiKey_() {
  return PropertiesService.getScriptProperties().getProperty(AI_CLEANUP_CONFIG.API_KEY_PROPERTY);
}

function requestGeminiCleanup_(apiKey, rowObject) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: buildGeminiCleanupPrompt_(rowObject),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  const statusCode = response.getResponseCode();
  const body = response.getContentText();

  if (statusCode < 200 || statusCode >= 300) {
    if (statusCode === 429) {
      throw new Error('Gemini quota 초과. 나중에 다시 시도');
    }
    throw new Error('Gemini API 호출 실패: HTTP ' + statusCode + ' / 응답: ' + summarizeGeminiResponseBody_(body));
  }

  const responseJson = JSON.parse(body);
  const text = responseJson &&
    responseJson.candidates &&
    responseJson.candidates[0] &&
    responseJson.candidates[0].content &&
    responseJson.candidates[0].content.parts &&
    responseJson.candidates[0].content.parts[0] &&
    responseJson.candidates[0].content.parts[0].text;

  if (!text) {
    throw new Error('Gemini 응답에서 JSON 텍스트를 찾지 못했습니다.');
  }

  return parseGeminiCleanupJson_(text);
}

function buildGeminiCleanupPrompt_(rowObject) {
  return [
    '보건실 공문 참고자료를 가볍게 분류하고 보조 항목만 정리하세요.',
    '반드시 JSON 객체 하나만 반환하세요. 설명 문장, Markdown, 코드블록은 쓰지 마세요.',
    '',
    '반환 키:',
    '자료형태구분, 붙임예시, 체크리스트, AI검토필요, AI정리메모',
    '',
    '자료형태구분은 본문형, 표포함, 서식중심 중 하나입니다.',
    '본문 전체를 다시 쓰거나 정리본문을 만들지 마세요.',
    '표복사용본문은 생성하지 마세요.',
    '메신저예시는 생성하지 마세요.',
    '붙임 목록은 붙임예시로 추출하세요.',
    '체크리스트는 기안 전 확인할 항목 3~6개를 줄바꿈으로 작성하세요.',
    '표 구조가 있거나 OCR 상태가 불확실하면 AI검토필요를 true로 하세요.',
    '',
    '자료명: ' + String(rowObject['자료명'] || ''),
    '문서목적: ' + String(rowObject['문서목적'] || ''),
    '업무분야: ' + String(rowObject['업무분야'] || ''),
    '설명: ' + String(rowObject['설명'] || ''),
    '',
    '템플릿본문:',
    String(rowObject['템플릿본문'] || '').slice(0, 3000),
  ].join('\n');
}

function parseGeminiCleanupJson_(text) {
  try {
    return normalizeGeminiCleanupResult_(JSON.parse(text));
  } catch (firstError) {
    const cleaned = String(text || '')
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error('Gemini JSON 파싱 실패');
    }

    try {
      return normalizeGeminiCleanupResult_(JSON.parse(match[0]));
    } catch (secondError) {
      throw new Error('Gemini JSON 파싱 실패');
    }
  }
}

function normalizeGeminiCleanupResult_(result) {
  const documentType = String(result['자료형태구분'] || '본문형').trim();
  const reviewNeeded = toAiBoolean_(result['AI검토필요']);

  return {
    '자료형태구분': ['본문형', '표포함', '서식중심'].indexOf(documentType) !== -1 ? documentType : '본문형',
    '붙임예시': String(result['붙임예시'] || '').trim(),
    '체크리스트': String(result['체크리스트'] || '').trim(),
    'AI검토필요': reviewNeeded,
    'AI정리상태': reviewNeeded ? '검토필요' : '완료',
    'AI정리메모': String(result['AI정리메모'] || '').trim(),
  };
}

function writeAiCleanupResult_(sheet, headerMap, rowNumber, result) {
  const now = new Date();
  const values = {
    '자료형태구분': result['자료형태구분'],
    '붙임예시': result['붙임예시'],
    '체크리스트': result['체크리스트'],
    'AI정리상태': result['AI정리상태'],
    'AI정리일시': now,
    'AI검토필요': result['AI검토필요'],
    'AI정리메모': result['AI정리메모'] || (result['AI검토필요'] ? 'AI 정리 완료. 원문 검토가 필요합니다.' : 'AI 정리 완료'),
  };

  Object.keys(values).forEach(function (columnName) {
    if (headerMap[columnName]) {
      sheet.getRange(rowNumber, headerMap[columnName]).setValue(values[columnName]);
    }
  });
}

function writeAiCleanupFailure_(sheet, headerMap, rowNumber, message) {
  const values = {
    'AI정리상태': '실패',
    'AI정리일시': new Date(),
    'AI검토필요': true,
    'AI정리메모': String(message || '알 수 없는 오류').slice(0, 300),
  };

  Object.keys(values).forEach(function (columnName) {
    if (headerMap[columnName]) {
      sheet.getRange(rowNumber, headerMap[columnName]).setValue(values[columnName]);
    }
  });
}

function toAiBoolean_(value) {
  if (value === true) {
    return true;
  }

  const normalized = String(value || '').trim().toUpperCase();
  return normalized === 'TRUE' || normalized === 'Y' || normalized === 'YES' || normalized === '1';
}

function sanitizeAiError_(error) {
  return String(error && error.message ? error.message : error || '알 수 없는 오류')
    .replace(/key=[^&\s]+/gi, 'key=[hidden]')
    .slice(0, 500);
}

function summarizeGeminiResponseBody_(body) {
  return String(body || '')
    .replace(/key=[^&\s"]+/gi, 'key=[hidden]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 350);
}
