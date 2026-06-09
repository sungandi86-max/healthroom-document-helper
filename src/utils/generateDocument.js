import { DEFAULT_CHECKLIST, findTemplateByLabel } from '../data/templates.js';

export const TABLE_NOTICE =
  '이 참고 공문에는 표 또는 현황 자료가 포함되어 있어 앱 화면에서는 표가 정확히 재현되지 않을 수 있습니다. 원문을 열어 표 형식을 확인한 뒤 필요한 부분을 복사해 주세요.';

const PURPOSE_ENDING = {
  '계획 기안': '시행하고자 합니다.',
  '결과 보고': '결과를 다음과 같이 보고합니다.',
  '안내문 발송': '안내문을 발송하고자 합니다.',
  '가정통신문 발송': '가정통신문을 발송하고자 합니다.',
  '실적 보고': '실적을 다음과 같이 보고합니다.',
  '외부기관 제출': '결과를 다음과 같이 제출합니다.',
  품의: '품의하고자 합니다.',
  인수인계서: '내용을 다음과 같이 정리합니다.',
};

const clean = (value) => String(value || '').trim();
const valueOrNeed = (value) => clean(value) || '[입력 필요]';

const optionalLine = (label, value) => {
  const cleaned = clean(value);
  return cleaned ? `${label}: ${cleaned}` : null;
};

const splitAttachments = (value) =>
  clean(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatAttachments = (attachments) => {
  const list = attachments.length ? attachments : ['관련 자료'];
  return `붙임\n${list.map((item, index) => `${index + 1}. ${item} 1부.`).join('\n')}\n끝.`;
};

const applyTemplate = (templateText, fields) =>
  templateText.replace(/\{(\w+)\}/g, (_, key) => valueOrNeed(fields[key]));

const buildTitle = ({ formValues, documentType, selectedField, template }) => {
  const schoolYear = clean(formValues.schoolYear);
  const workName = clean(formValues.workName) || selectedField || template.label;
  const suffixMap = {
    '계획 기안': '시행계획',
    '결과 보고': '결과보고',
    '안내문 발송': '안내문 발송',
    '가정통신문 발송': '가정통신문 발송',
    '실적 보고': '실적 보고',
    '외부기관 제출': '결과 제출',
    품의: '구입 품의',
    인수인계서: '인수인계서',
  };

  const suffix = suffixMap[documentType] || '기안';
  const hasSuffix = workName.includes(suffix) || workName.endsWith('계획') || workName.endsWith('보고');
  return [schoolYear, hasSuffix ? workName : `${workName} ${suffix}`].filter(Boolean).join(' ');
};

const buildBody = ({ formValues, documentType, template }) => {
  const purpose = clean(formValues.mainContent) || template.defaultPurposeSentence;
  const ending = PURPOSE_ENDING[documentType] || `${template.defaultActionVerb}하고자 합니다.`;
  const intro = `${purpose}을(를) 위해 다음과 같이 ${ending}`;

  const detailLines = [
    optionalLine('가. 대상', formValues.target),
    optionalLine('나. 일시', formValues.dateTime),
    optionalLine('다. 장소', formValues.place),
    optionalLine('라. 방법', formValues.method),
    optionalLine('마. 기관명', formValues.organization),
    optionalLine('바. 인원', formValues.peopleCount),
    optionalLine('사. 비용 또는 예산', formValues.budget),
    optionalLine('아. 주요 내용', formValues.mainContent),
    optionalLine('자. 특이사항', formValues.notes),
  ].filter(Boolean);

  const attachmentNames = splitAttachments(formValues.attachments);
  const attachmentText = attachmentNames.length
    ? attachmentNames.map((item) => `${item} 1부.`).join('\n')
    : '[붙임 자료 입력 필요] 1부.';

  return [
    `1. 관련: ${valueOrNeed(formValues.relatedDocument)}`,
    '',
    `2. ${intro}`,
    '',
    detailLines.length ? detailLines.join('\n') : '가. 세부 내용: [입력 필요]',
    '',
    `붙임  ${attachmentText}  끝.`,
  ].join('\n');
};

const buildMessenger = ({ formValues, template, title }) => {
  const fields = {
    ...formValues,
    workName: clean(formValues.workName) || template.label,
  };

  return {
    title: clean(template.messengerTitle) || `${title} 안내`,
    body: applyTemplate(template.messengerBodyTemplate, fields),
  };
};

export const getExampleValues = (selectedField) => {
  const template = findTemplateByLabel(selectedField);

  return {
    ...template.defaultFields,
    schoolYear: '2026학년도',
    schoolName: '○○고등학교',
    relatedDocument: '교육지원청 보건교육과-0000',
    target: '해당 학년 학생 전체',
    place: '각 교실 및 보건실',
    organization: '○○검진기관',
    peopleCount: '학생 180명, 교직원 32명',
    budget: '비예산',
  };
};

export const generateDocument = ({ documentType, selectedField, formValues }) => {
  const template = findTemplateByLabel(selectedField);
  const attachments = splitAttachments(formValues.attachments);
  const recommendedAttachments = attachments.length ? attachments : template.attachmentExamples;
  const title = buildTitle({ formValues, documentType, selectedField, template });
  const messenger = buildMessenger({ formValues, template, title });
  const checklist = [...DEFAULT_CHECKLIST, ...template.checklistItems];

  return {
    sourceLabel: '',
    title,
    body: buildBody({ formValues, documentType, template }),
    attachments: formatAttachments(recommendedAttachments),
    messenger: `제목: ${messenger.title}\n\n${messenger.body}`,
    checklist: checklist.map((item) => `□ ${item}`).join('\n'),
  };
};

const applyUserFieldsToReferenceBody = (body, formValues) => {
  let nextBody = clean(body);
  if (!nextBody) {
    return '';
  }

  const replacements = [
    [/(20\d{2})학년도/g, formValues.schoolYear],
    [/○○고등학교/g, formValues.schoolName],
    [/\[학교명\]/g, formValues.schoolName],
    [/\[관련 공문\]/g, formValues.relatedDocument],
    [/\[대상\]/g, formValues.target],
    [/\[일시\]/g, formValues.dateTime],
    [/\[장소\]/g, formValues.place],
    [/\[주요 내용\]/g, formValues.mainContent],
  ];

  replacements.forEach(([pattern, value]) => {
    if (clean(value)) {
      nextBody = nextBody.replace(pattern, value);
    }
  });

  const contextLines = [
    optionalLine('관련', formValues.relatedDocument),
    optionalLine('대상', formValues.target),
    optionalLine('일시', formValues.dateTime),
    optionalLine('장소', formValues.place),
    optionalLine('주요 내용', formValues.mainContent),
  ].filter(Boolean);

  if (contextLines.length > 0 && !nextBody.includes('관련:')) {
    nextBody = `${contextLines.join('\n')}\n\n${nextBody}`;
  }

  return nextBody;
};

const replaceTableLikeBlock = (body) => {
  const lines = clean(body).split(/\r?\n/);
  const cleanedLines = [];
  let insertedNotice = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    const looksLikeTableLine =
      /\t/.test(line) ||
      /현황|합계/.test(trimmed) ||
      /\d+\s+\d+\s+\d+/.test(trimmed) ||
      (/^(계|[1-9]반|합계)$/.test(trimmed) && trimmed.length <= 8);

    if (looksLikeTableLine) {
      if (!insertedNotice) {
        cleanedLines.push('[표/현황 자료는 원문 참조]');
        insertedNotice = true;
      }
      return;
    }

    cleanedLines.push(line);
  });

  return cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

export const applyReferenceDocument = ({ reference, formValues, documentType, selectedField }) => {
  const baseTitle = clean(formValues.workName) || reference.title;
  const title = [clean(formValues.schoolYear), baseTitle].filter(Boolean).join(' ');
  const bodyFromReference = applyUserFieldsToReferenceBody(reference.templateBody, formValues);
  const body = reference.hasTable ? replaceTableLikeBlock(bodyFromReference) : bodyFromReference;
  const template = findTemplateByLabel(selectedField);
  const fallback = generateDocument({ documentType, selectedField, formValues });

  return {
    sourceLabel: '참고자료 기반 초안',
    sourceUrl: reference.sourceUrl,
    hasTable: reference.hasTable,
    tableNotice: reference.hasTable ? TABLE_NOTICE : '',
    title: title || fallback.title,
    body: body || fallback.body,
    attachments: clean(reference.attachmentExample) || fallback.attachments,
    messenger:
      clean(reference.messengerExample) ||
      applyTemplate(template.messengerBodyTemplate, {
        ...formValues,
        workName: baseTitle || reference.title,
      }),
    checklist: clean(reference.checklist) || fallback.checklist,
  };
};

export const composeAllResults = (result) => {
  if (!result) return '';

  return [
    result.sourceLabel,
    result.title && '공문 제목',
    result.title,
    '',
    '기안문 본문',
    result.body,
    '',
    result.tableNotice && '표/현황 자료 안내',
    result.tableNotice,
    result.tableNotice && '',
    '붙임 목록',
    result.attachments,
    '',
    '교직원 메신저 안내문',
    result.messenger,
    '',
    '기안 전 체크리스트',
    result.checklist,
  ]
    .filter((line) => line !== false && line !== undefined && line !== null)
    .join('\n');
};
