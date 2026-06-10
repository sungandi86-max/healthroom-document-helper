/**
 * PDF 공문자료 폴더의 PDF를 Google Docs로 임시 변환한 뒤,
 * 본문 텍스트를 추출해 "쑤캥T 보건실 공문 참고자료 시트"의 공문자료목록 탭에 반영합니다.
 *
 * 사용 전 Apps Script 편집기에서 다음 설정이 필요합니다.
 * 1. 서비스 -> Drive API를 추가합니다. PDF를 Google Docs로 변환할 때 Advanced Drive Service가 필요합니다.
 * 2. Google Cloud 콘솔에서 Drive API 활성화가 필요할 수 있습니다.
 */

const PDF_IMPORT_CONFIG = {
  SPREADSHEET_ID: '1jUbcsbIjBuQ7aBfUBTKQ5s9uC7-VQ02x7WocRDmLb0o',
  SHEET_NAME: '공문자료목록',
  LOG_SHEET_NAME: '업데이트로그',
  PDF_INPUT_FOLDER_ID: '1CEIgt1jT8_55rMWvPUfeltsa25RMr3jv',
  PDF_DONE_FOLDER_ID: '1cHHcFu-Ae7Dhhnlac0wz4EUXoCMxeFLZ',
  PDF_FAILED_FOLDER_ID: '1UfeXCeuSKOaW4djvsNiWvY58r5kMRUgW',
  TEMP_DOC_FOLDER_ID: '165EQtfi999ZENda8gzi66A9Tgqu0i0Iz',
};

const MAX_FILES_PER_RUN = 5;

const PDF_IMPORT_COLUMNS = [
  'No',
  '사용여부',
  '문서목적',
  '업무분야',
  '자료명',
  '설명',
  '참고문서URL',
  '문서ID',
  '파일형태',
  '템플릿본문',
  '붙임예시',
  '메신저예시',
  '체크리스트',
  '공개구분',
  '비식별여부',
  '자동본문추출',
  '상태',
  '우선순위',
  '열기',
  '메모',
];

// 문서목적에는 계획 기안, 결과 보고, 실적 보고, 외부기관 제출, 가정통신문 발송, 품의 등을 사용할 수 있습니다.
const PDF_IMPORT_CLASSIFICATION_RULES = [
  { keywords: ['보건지원강사'], workArea: '학교보건지원강사', purpose: '계획 기안' },
  { keywords: ['건강검진 결과보고', '건강검진 결과'], workArea: '건강검진 결과보고', purpose: '결과 보고' },
  { keywords: ['건강검진 미검자', '추가 검진 계획'], workArea: '건강검진 미검자 추가검진', purpose: '계획 기안' },
  { keywords: ['추가검진 결과보고'], workArea: '건강검진 미검자 추가검진', purpose: '결과 보고' },
  { keywords: ['건강검진 비용', '비용 청구'], workArea: '건강검진 비용 청구', purpose: '품의' },
  { keywords: ['건강검진 시행'], workArea: '건강검진 시행계획', purpose: '계획 기안' },
  { keywords: ['결핵검사 결과', '결핵검진 결과'], workArea: '결핵검사 결과보고', purpose: '결과 보고' },
  { keywords: ['교직원 결핵검진'], workArea: '교직원 결핵검진', purpose: '계획 기안' },
  { keywords: ['결핵검진 이행 점검'], workArea: '결핵검진 이행 점검 결과 제출', purpose: '외부기관 제출' },
  { keywords: ['결핵검사 시행'], workArea: '결핵검사 시행계획', purpose: '계획 기안' },
  { keywords: ['소변검사 결과'], workArea: '소변검사 결과보고', purpose: '결과 보고' },
  { keywords: ['소변검사 미검자'], workArea: '소변검사 미검자 추가검진', purpose: '결과 보고' },
  { keywords: ['소변검사 시행'], workArea: '소변검사 시행계획', purpose: '계획 기안' },
  { keywords: ['심폐소생술 교육 실시 결과'], workArea: '심폐소생술 결과보고', purpose: '결과 보고' },
  { keywords: ['심폐소생술 교육계획'], workArea: '심폐소생술 교육계획', purpose: '계획 기안' },
  { keywords: ['학생 응급처치교육'], workArea: '학생 응급처치교육', purpose: '계획 기안' },
  { keywords: ['성매매 예방교육 실시 결과'], workArea: '학생 성매매 예방교육', purpose: '결과 보고' },
  { keywords: ['성매매 예방교육 계획'], workArea: '학생 성매매 예방교육', purpose: '계획 기안' },
  { keywords: ['성폭력 예방교육 실시 결과'], workArea: '학생 성폭력 예방교육', purpose: '결과 보고' },
  { keywords: ['성폭력 예방교육 계획'], workArea: '학생 성폭력 예방교육', purpose: '계획 기안' },
  { keywords: ['가정폭력 예방교육 실시 결과'], workArea: '학생 가정폭력 예방교육', purpose: '결과 보고' },
  { keywords: ['가정폭력 예방교육 계획'], workArea: '학생 가정폭력 예방교육', purpose: '계획 기안' },
  { keywords: ['흡연 및 음주 예방교육'], workArea: '학생 흡연 및 음주 예방교육', purpose: '계획 기안' },
  { keywords: ['약물 오남용예방교육'], workArea: '학생 약물 오남용 예방교육', purpose: '계획 기안' },
  { keywords: ['장애인식개선교육 계획'], workArea: '장애인식개선교육', purpose: '계획 기안' },
  { keywords: ['장애인학대', '장애인 대상 성범죄'], workArea: '장애인학대 및 성범죄 신고의무자 교육', purpose: '실적 보고' },
  { keywords: ['아동학대'], workArea: '아동학대 신고의무자 교육', purpose: '실적 보고' },
  { keywords: ['폭력예방교육 실적'], workArea: '폭력예방교육 실적 보고', purpose: '실적 보고' },
  { keywords: ['성희롱', '성매매', '성폭력', '예방 대면 연수 계획'], matchAll: true, workArea: '교직원 폭력예방교육 계획', purpose: '계획 기안' },
  { keywords: ['성희롱', '성매매', '성폭력', '예방 대면 연수 실시 결과'], matchAll: true, workArea: '교직원 폭력예방교육 결과보고', purpose: '결과 보고' },
  { keywords: ['성희롱', '성매매', '성폭력', '가정폭력 예방교육 결과보고'], matchAll: true, workArea: '교직원 폭력예방교육 결과보고', purpose: '실적 보고' },
  { keywords: ['고위직'], workArea: '고위직 맞춤형 폭력예방교육', purpose: '결과 보고' },
  { keywords: ['감염병 위기대응'], workArea: '감염병 위기대응 모의훈련', purpose: '계획 기안' },
  { keywords: ['수두 확진'], workArea: '감염병 확진 안내문 발송', purpose: '가정통신문 발송' },
  { keywords: ['호흡기 감염병'], workArea: '호흡기 감염병 예방 수칙 안내', purpose: '가정통신문 발송' },
  { keywords: ['감염병 예방 및 결핵 예방교육'], workArea: '감염병 및 결핵 예방교육', purpose: '계획 기안' },
  { keywords: ['상비약'], workArea: '현장체험학습 개인 상비약 안내', purpose: '가정통신문 발송' },
  { keywords: ['일반의약품 취급 안내'], workArea: '일반의약품 취급 안내', purpose: '가정통신문 발송' },
  { keywords: ['의약품 및 운영 물품 구입'], workArea: '보건실 물품 구입', purpose: '품의' },
  { keywords: ['청소년 건강행태'], workArea: '청소년 건강행태조사', purpose: '계획 기안 또는 외부기관 제출' },
  { keywords: ['인수인계서'], workArea: '보건실 업무 인수인계서', purpose: '인수인계서' },
  { keywords: ['키오스크', '셀프처치대'], workArea: '보건실 운영계획', purpose: '계획 기안' },
  { keywords: ['건강상태 조사', '응급처치 동의'], workArea: '건강상태 조사 및 응급처치 동의', purpose: '가정통신문 발송' },
  { keywords: ['학교보건', '건강증진'], workArea: '학교보건 기본계획', purpose: '계획 기안' },
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('공문자료 가져오기')
    .addItem('PDF 폴더에서 전체 가져오기', 'importAllPdfDocumentsToSheet')
    .addItem('추출 결과 로그 보기', 'showPdfImportLogSheet')
    .addItem('폴더 ID 설정 안내', 'showPdfImportFolderIdGuide')
    .addToUi();

  addAiDocumentCleanupMenu_();
}

function importAllPdfDocumentsToSheet() {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = SpreadsheetApp.openById(PDF_IMPORT_CONFIG.SPREADSHEET_ID);
    const sheet = getOrCreateSheet_(spreadsheet, PDF_IMPORT_CONFIG.SHEET_NAME, PDF_IMPORT_COLUMNS);
    const logSheet = getOrCreateLogSheet_(spreadsheet);
    const inputFolder = DriveApp.getFolderById(PDF_IMPORT_CONFIG.PDF_INPUT_FOLDER_ID);
    const files = inputFolder.getFilesByType(MimeType.PDF);
    const nameRowMap = buildDocumentNameRowMap_(sheet);
    const results = { success: 0, failed: 0, skipped: 0 };

    while (files.hasNext() && results.success + results.failed < MAX_FILES_PER_RUN) {
      const file = files.next();
      try {
        const extracted = extractPdfTextViaGoogleDoc_(file);
        const rowNumber = upsertPdfDocumentRow_(sheet, nameRowMap, file, extracted.text, '완료');
        moveFileToFolder_(file, PDF_IMPORT_CONFIG.PDF_INPUT_FOLDER_ID, PDF_IMPORT_CONFIG.PDF_DONE_FOLDER_ID);
        appendPdfImportLog_(logSheet, '성공', file, rowNumber, '', extracted.text.length);
        results.success += 1;
      } catch (error) {
        const rowNumber = upsertPdfDocumentRow_(sheet, nameRowMap, file, '', '실패');
        moveFileToFolder_(file, PDF_IMPORT_CONFIG.PDF_INPUT_FOLDER_ID, PDF_IMPORT_CONFIG.PDF_FAILED_FOLDER_ID);
        appendPdfImportLog_(logSheet, '실패', file, rowNumber, errorToMessage_(error), 0);
        results.failed += 1;
      }
    }

    const processedCount = results.success + results.failed;
    SpreadsheetApp.getUi().alert(
      'PDF 가져오기 완료',
      '이번 실행에서 처리한 파일: ' + processedCount + '개 / 남은 파일이 있으면 메뉴를 다시 실행해 주세요.\n' +
        '처리 한도: 최대 ' + MAX_FILES_PER_RUN + '건\n' +
        '성공: ' + results.success + '건\n실패: ' + results.failed + '건\n건너뜀: ' + results.skipped + '건\n\n' +
        '성공한 파일은 완료 폴더로 이동되어 다음 실행에서는 남은 PDF만 처리됩니다.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } finally {
    lock.releaseLock();
  }
}

function showPdfImportLogSheet() {
  const spreadsheet = SpreadsheetApp.openById(PDF_IMPORT_CONFIG.SPREADSHEET_ID);
  const logSheet = getOrCreateLogSheet_(spreadsheet);
  spreadsheet.setActiveSheet(logSheet);
}

function showPdfImportFolderIdGuide() {
  SpreadsheetApp.getUi().alert(
    '폴더 ID 설정 안내',
    'apps-script/pdfImportToSheet.gs 상단의 PDF_IMPORT_CONFIG에서 폴더 ID를 수정합니다.\n\n' +
      'PDF_INPUT_FOLDER_ID: 가져올 PDF가 있는 폴더\n' +
      'PDF_DONE_FOLDER_ID: 성공한 PDF를 옮길 폴더\n' +
      'PDF_FAILED_FOLDER_ID: 실패한 PDF를 옮길 폴더\n' +
      'TEMP_DOC_FOLDER_ID: 임시 Google Docs 변환 문서를 만들 폴더\n\n' +
      'PDF 변환을 위해 Apps Script 서비스에서 Drive API를 추가하고, 필요 시 Google Cloud 콘솔에서도 Drive API를 활성화하세요.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function extractPdfTextViaGoogleDoc_(pdfFile) {
  const resource = {
    title: '[임시변환] ' + pdfFile.getName(),
    mimeType: MimeType.GOOGLE_DOCS,
    parents: [{ id: PDF_IMPORT_CONFIG.TEMP_DOC_FOLDER_ID }],
  };
  const options = {
    convert: true,
    ocr: true,
    ocrLanguage: 'ko',
  };
  const tempDocFile = Drive.Files.insert(resource, pdfFile.getBlob(), options);
  const tempDocId = tempDocFile.id;

  try {
    const doc = DocumentApp.openById(tempDocId);
    const text = doc.getBody().getText().trim();
    if (!text) {
      throw new Error('변환된 Google Docs 문서에서 본문 텍스트를 찾지 못했습니다.');
    }
    return { docId: tempDocId, text: cleanExtractedDocumentText_(text) };
  } finally {
    try {
      DriveApp.getFileById(tempDocId).setTrashed(true);
    } catch (cleanupError) {
      console.warn('임시 문서 삭제 실패: ' + errorToMessage_(cleanupError));
    }
  }
}

function cleanExtractedDocumentText_(text) {
  if (!text) {
    return '';
  }

  const normalizedText = String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/세화여자고등학교\s*-\s*\d+/g, '[학교명]-[기안번호]')
    .replace(/세화여자고등학교-\d+/g, '[학교명]-[기안번호]')
    .replace(/세화여자고등학교/g, '○○고등학교');

  const lines = normalizedText.split('\n');
  const cleanedLines = [];
  let blankPending = false;

  lines.forEach(function (line, index) {
    const trimmed = line.replace(/\s+/g, ' ').trim();

    if (!trimmed) {
      blankPending = cleanedLines.length > 0;
      return;
    }

    if (shouldRemoveExtractedDocumentLine_(trimmed, index)) {
      return;
    }

    if (blankPending) {
      cleanedLines.push('');
      blankPending = false;
    }
    cleanedLines.push(trimmed);
  });

  // 개인용 참고자료에서는 날짜, 인원, 금액은 유지합니다. 공개용 Lite 변환 시 별도 치환 규칙을 추가할 수 있습니다.
  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function shouldRemoveExtractedDocumentLine_(line, index) {
  const topHeaderLimit = 12;
  const topHeaderPatterns = [
    /교육청/,
    /교육지원청/,
    /함께\s*배우/,
    /행복한\s*학교/,
    /미래를\s*여는/,
    /꿈을\s*키우/,
  ];
  const contactOrAddressPatterns = [
    /@/,
    /E-?mail/i,
    /이메일/,
    /주소/,
    /팩스/i,
    /FAX/i,
    /전송/,
    /전화/,
    /^우\s*\d{3,}/,
    /^\(\d{5}\)/,
  ];
  const documentMetaPatterns = [
    /^★?\s*보건교사\b/,
    /^협조자\b/,
    /^시행\b/,
    /^접수\b/,
    /^우\b/,
    /^전화\b/,
    /^전송\b/,
    /^결재\b/,
    /^담당\b/,
    /^기안자\b/,
  ];
  const approvalRolePattern = /(교장|교감|행정실장|부장|담당자|보건교사|주무관|행정과장)/;
  const koreanNamePattern = /[가-힣]{2,4}/g;

  if (index < topHeaderLimit && topHeaderPatterns.some(function (pattern) {
    return pattern.test(line);
  })) {
    return true;
  }

  if (contactOrAddressPatterns.some(function (pattern) {
    return pattern.test(line);
  })) {
    return true;
  }

  if (documentMetaPatterns.some(function (pattern) {
    return pattern.test(line);
  })) {
    return true;
  }

  if (approvalRolePattern.test(line)) {
    const names = line.match(koreanNamePattern) || [];
    return names.length >= 2 && line.length <= 80;
  }

  return false;
}

function upsertPdfDocumentRow_(sheet, nameRowMap, file, extractedText, extractionStatus) {
  const fileName = file.getName();
  const documentName = normalizeDocumentName_(fileName);
  const classification = classifyPdfFileName_(fileName);
  const existingRow = nameRowMap[documentName];
  const nowStatus = extractionStatus === '완료' ? '완료' : '실패';
  const rowValues = buildPdfDocumentRow_(sheet, file, documentName, classification, extractedText, nowStatus);

  if (existingRow) {
    updateExistingPdfDocumentRow_(sheet, existingRow, rowValues);
    return existingRow;
  }

  const rowNumber = Math.max(sheet.getLastRow() + 1, 2);
  rowValues[columnIndex_('No') - 1] = rowNumber - 1;
  sheet.getRange(rowNumber, 1, 1, PDF_IMPORT_COLUMNS.length).setValues([rowValues]);
  nameRowMap[documentName] = rowNumber;
  return rowNumber;
}

function buildPdfDocumentRow_(sheet, file, documentName, classification, extractedText, extractionStatus) {
  const row = new Array(PDF_IMPORT_COLUMNS.length).fill('');
  row[columnIndex_('사용여부') - 1] = true;
  row[columnIndex_('문서목적') - 1] = classification.purpose;
  row[columnIndex_('업무분야') - 1] = classification.workArea;
  row[columnIndex_('자료명') - 1] = documentName;
  row[columnIndex_('설명') - 1] = documentName + ' PDF 자동 추출 자료';
  row[columnIndex_('참고문서URL') - 1] = file.getUrl();
  row[columnIndex_('문서ID') - 1] = file.getId();
  row[columnIndex_('파일형태') - 1] = 'PDF';
  row[columnIndex_('템플릿본문') - 1] = extractedText || '';
  row[columnIndex_('공개구분') - 1] = '개인용';
  row[columnIndex_('비식별여부') - 1] = true;
  row[columnIndex_('자동본문추출') - 1] = extractionStatus;
  row[columnIndex_('상태') - 1] = '검토 필요';
  row[columnIndex_('우선순위') - 1] = '중간';
  row[columnIndex_('열기') - 1] = '열기';
  row[columnIndex_('메모') - 1] = 'PDF 자동 추출 후 비식별 정리 필요';
  return row;
}

function updateExistingPdfDocumentRow_(sheet, rowNumber, rowValues) {
  const updateColumns = [
    '참고문서URL',
    '문서ID',
    '파일형태',
    '템플릿본문',
    '자동본문추출',
    '상태',
    '메모',
  ];

  updateColumns.forEach(function (columnName) {
    const column = columnIndex_(columnName);
    sheet.getRange(rowNumber, column).setValue(rowValues[column - 1]);
  });
}

function buildDocumentNameRowMap_(sheet) {
  ensureHeaderRow_(sheet, PDF_IMPORT_COLUMNS);
  const lastRow = sheet.getLastRow();
  const map = {};
  if (lastRow < 2) {
    return map;
  }

  const documentNameColumn = columnIndex_('자료명');
  const values = sheet.getRange(2, documentNameColumn, lastRow - 1, 1).getValues();
  values.forEach(function (row, index) {
    const documentName = String(row[0] || '').trim();
    if (documentName && !map[documentName]) {
      map[documentName] = index + 2;
    }
  });
  return map;
}

function classifyPdfFileName_(fileName) {
  const normalizedName = normalizeDocumentName_(fileName);
  const matchedRule = PDF_IMPORT_CLASSIFICATION_RULES.find(function (rule) {
    const matcher = rule.matchAll ? 'every' : 'some';
    return rule.keywords[matcher](function (keyword) {
      return normalizedName.indexOf(keyword) !== -1;
    });
  });

  if (matchedRule) {
    return { workArea: matchedRule.workArea, purpose: matchedRule.purpose };
  }

  return { workArea: '미분류', purpose: '검토 필요' };
}

function normalizeDocumentName_(fileName) {
  return String(fileName || '')
    .replace(/\.pdf$/i, '')
    .replace(/^\s*(?:\([^()]*?(?:\s*\([^()]*\))?\)\s*)+/, '')
    .replace(/20\d{2}\s*(?:학년도|년)/g, '')
    .replace(/[\s_\-]+/g, ' ')
    .trim();
}

function getOrCreateSheet_(spreadsheet, sheetName, headers) {
  const sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  ensureHeaderRow_(sheet, headers);
  return sheet;
}

function ensureHeaderRow_(sheet, headers) {
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  const currentHeaders = headerRange.getValues()[0];
  const hasAnyHeader = currentHeaders.some(function (value) {
    return String(value || '').trim() !== '';
  });

  if (!hasAnyHeader) {
    headerRange.setValues([headers]);
    sheet.setFrozenRows(1);
    return;
  }

  headers.forEach(function (header, index) {
    const currentValue = String(currentHeaders[index] || '').trim();
    if (!currentValue) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });
}

function getOrCreateLogSheet_(spreadsheet) {
  const headers = ['일시', '결과', '파일명', '파일ID', '자료명', '행번호', '본문길이', '오류메시지', 'PDF URL'];
  const sheet = spreadsheet.getSheetByName(PDF_IMPORT_CONFIG.LOG_SHEET_NAME) || spreadsheet.insertSheet(PDF_IMPORT_CONFIG.LOG_SHEET_NAME);
  ensureHeaderRow_(sheet, headers);
  return sheet;
}

function appendPdfImportLog_(logSheet, result, file, rowNumber, errorMessage, textLength) {
  logSheet.appendRow([
    new Date(),
    result,
    file.getName(),
    file.getId(),
    normalizeDocumentName_(file.getName()),
    rowNumber || '',
    textLength || 0,
    errorMessage || '',
    file.getUrl(),
  ]);
}

function moveFileToFolder_(file, fromFolderId, toFolderId) {
  const toFolder = DriveApp.getFolderById(toFolderId);
  file.moveTo(toFolder);
}

function columnIndex_(columnName) {
  const index = PDF_IMPORT_COLUMNS.indexOf(columnName);
  if (index === -1) {
    throw new Error('공문자료목록 컬럼을 찾을 수 없습니다: ' + columnName);
  }
  return index + 1;
}

function errorToMessage_(error) {
  if (!error) {
    return '';
  }
  return error.message || String(error);
}
