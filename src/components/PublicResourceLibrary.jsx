import React, { useEffect, useMemo, useState } from 'react';

const RESOURCE_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1jUbcsbIjBuQ7aBfUBTKQ5s9uC7-VQ02x7WocRDmLb0o/gviz/tq?tqx=out:csv&sheet=%EA%B3%B5%EA%B0%9C%EC%9E%90%EB%A3%8C%EB%AA%A9%EB%A1%9D';

const ALL = '전체';
const POPULAR_KEYWORDS = ['건강검진', '결핵검진', '감염병', '가정통신문', '인수인계', '교직원 연수', 'AED', '계획서'];
const CATEGORY_FILTERS = [ALL, '가정통신문', '서식', '계획서 템플릿', '연수자료', '시트형 도구', '관리자료'];
const FILE_TYPE_FILTERS = [ALL, 'HWP', 'HWPX', 'PPTX', 'PDF', 'Google Docs', 'Google Sheets'];
const DELIVERY_FILTERS = [ALL, '다운로드', '사본 만들기', '링크 제공', '미리보기'];

const getValue = (row, names) => {
  const nameList = Array.isArray(names) ? names : [names];
  const matchedName = nameList.find((name) => Object.prototype.hasOwnProperty.call(row, name));
  return matchedName ? String(row[matchedName] || '').trim() : '';
};

const isTrueValue = (value) =>
  ['true', 'TRUE', 'Y', 'y', '1', '예', '사용', '표시'].includes(String(value || '').trim());

const parseCsv = (csvText) => {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentCell += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  const headers = (rows.shift() || []).map((header) => header.trim());
  return rows
    .filter((row) => row.some((cell) => String(cell || '').trim()))
    .map((row) =>
      headers.reduce((entry, header, index) => {
        entry[header] = String(row[index] || '').trim();
        return entry;
      }, {}),
    );
};

const normalizeResource = (row, index) => {
  const title = getValue(row, ['자료명', '제목']);
  const category = getValue(row, ['자료구분', '카테고리']);
  const workArea = getValue(row, ['관련업무분야', '업무분야']);
  const description = getValue(row, ['설명', '자료설명']);
  const tags = getValue(row, ['태그', 'tag']);
  const searchKeywords = getValue(row, ['검색키워드', '검색어']);
  const fileType = getValue(row, ['파일형태', '파일유형']);
  const deliveryType = getValue(row, ['제공방식', '제공형태']);
  const fileUrl = getValue(row, ['파일URL', '다운로드URL', '자료URL']);
  const previewUrl = getValue(row, ['미리보기URL', 'previewURL']);
  const status = getValue(row, ['상태']) || '공개';
  const priority = getValue(row, ['우선순위', '추천우선순위']);

  return {
    id: getValue(row, ['자료ID', '문서ID', 'ID']) || `${title}-${index}`,
    title,
    category,
    workArea,
    description,
    tags,
    searchKeywords,
    fileType,
    deliveryType,
    fileUrl,
    previewUrl,
    status,
    priority,
    searchableText: [title, description, category, workArea, tags, searchKeywords].join(' ').toLowerCase(),
    canShow:
      isTrueValue(getValue(row, ['사용여부'])) &&
      isTrueValue(getValue(row, ['사이트표시'])) &&
      getValue(row, ['공개구분']) === 'Lite 공개 가능',
  };
};

const getPrimaryAction = (resource) => {
  if (!resource.fileUrl) {
    return { label: '준비중', disabled: true, url: '' };
  }

  if (resource.deliveryType === '사본 만들기') {
    return { label: '사본 만들기', disabled: false, url: resource.fileUrl };
  }

  if (resource.deliveryType === '링크 제공') {
    return { label: '링크 열기', disabled: false, url: resource.fileUrl };
  }

  if (resource.deliveryType === '미리보기') {
    return { label: '미리보기', disabled: false, url: resource.fileUrl };
  }

  return { label: '다운로드', disabled: false, url: resource.fileUrl };
};

const getStatusBadgeLabel = (resource) => {
  if (!resource.fileUrl) {
    return '준비중';
  }

  return null;
};

function FilterButton({ active, children, onClick }) {
  return (
    <button className={active ? 'filter-chip active' : 'filter-chip'} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function ResourceCard({ resource }) {
  const action = getPrimaryAction(resource);
  const statusBadgeLabel = getStatusBadgeLabel(resource);
  const tags = resource.tags
    .split(/[,\s#]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);

  return (
    <article className="resource-card">
      <div className="resource-card-header">
        <div>
          <p className="resource-category">{resource.category || '자료'}</p>
          <h3>{resource.title}</h3>
        </div>
        {statusBadgeLabel && <span className="status-badge">{statusBadgeLabel}</span>}
      </div>

      <p className="resource-work-area">{resource.workArea || '보건실 업무'}</p>
      <p className="resource-description">{resource.description || '자료 설명을 준비 중입니다.'}</p>

      <div className="resource-meta">
        <span>{resource.fileType || '파일형태 미정'}</span>
        <span>{resource.deliveryType || '제공방식 미정'}</span>
      </div>

      {tags.length > 0 && (
        <div className="tag-row">
          {tags.map((tag) => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}

      <div className="resource-actions">
        {resource.previewUrl && (
          <a className="secondary-button resource-link" href={resource.previewUrl} target="_blank" rel="noreferrer">
            미리보기
          </a>
        )}
        {action.disabled ? (
          <button className="ghost-button resource-link" type="button" disabled>
            {action.label}
          </button>
        ) : (
          <a className="primary-button resource-link" href={action.url} target="_blank" rel="noreferrer">
            {action.label}
          </a>
        )}
      </div>

      <p className="resource-note">학교 상황에 맞게 수정 후 사용하세요.</p>
    </article>
  );
}

function ResourceSection({ title, description, resources }) {
  if (resources.length === 0) {
    return null;
  }

  return (
    <section className="resource-section">
      <div className="resource-section-heading">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="resource-card-grid compact">
        {resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </section>
  );
}

export default function PublicResourceLibrary() {
  const [resources, setResources] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [fileType, setFileType] = useState(ALL);
  const [deliveryType, setDeliveryType] = useState(ALL);
  const [loadState, setLoadState] = useState({ status: 'loading', message: '' });

  useEffect(() => {
    let cancelled = false;

    fetch(RESOURCE_CSV_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error('공개자료 CSV를 불러오지 못했습니다.');
        }
        return response.text();
      })
      .then((csvText) => {
        if (cancelled) return;
        const parsedResources = parseCsv(csvText)
          .map(normalizeResource)
          .filter((resource) => resource.canShow && resource.title);
        setResources(parsedResources);
        setLoadState({ status: 'ready', message: '' });
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadState({ status: 'error', message: error.message || '자료를 불러오는 중 오류가 발생했습니다.' });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedQuery = query.trim().toLowerCase();
  const hasActiveFilter = category !== ALL || fileType !== ALL || deliveryType !== ALL;
  const shouldShowResults = trimmedQuery.length > 0 || hasActiveFilter;

  const filteredResources = useMemo(
    () =>
      resources.filter((resource) => {
        const matchesQuery = !trimmedQuery || resource.searchableText.includes(trimmedQuery);
        const matchesCategory = category === ALL || resource.category === category;
        const matchesFileType = fileType === ALL || resource.fileType === fileType;
        const matchesDelivery = deliveryType === ALL || resource.deliveryType === deliveryType;
        return matchesQuery && matchesCategory && matchesFileType && matchesDelivery;
      }),
    [category, deliveryType, fileType, resources, trimmedQuery],
  );

  const recommendedResources = useMemo(
    () => resources.filter((resource) => resource.priority === '높음').slice(0, 4),
    [resources],
  );

  const handlePopularKeyword = (keyword) => {
    setQuery(keyword);
  };

  return (
    <section className="library-view" aria-labelledby="library-title">
      <div className="library-search-panel">
        <p className="eyebrow">검색형 공개자료실</p>
        <h2 id="library-title">필요한 보건실 자료를 검색해보세요.</h2>
        <p className="library-search-help">
          자료명을 모르더라도 건강검진, 결핵검진, 인수인계, 교직원 연수처럼 업무 키워드로 검색할 수 있어요.
        </p>
        <div className="search-box">
          <input
            aria-label="공개자료 검색"
            value={query}
            placeholder="자료명, 업무분야, 태그로 검색"
            type="search"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button className="ghost-button clear-search-button" type="button" onClick={() => setQuery('')}>
              지우기
            </button>
          )}
        </div>
        <div className="popular-keywords" aria-label="인기 검색어">
          {POPULAR_KEYWORDS.map((keyword) => (
            <button key={keyword} type="button" onClick={() => handlePopularKeyword(keyword)}>
              {keyword}
            </button>
          ))}
        </div>
      </div>

      <div className="library-filters" aria-label="자료 필터">
        <div>
          <span>카테고리</span>
          <div className="filter-row">
            {CATEGORY_FILTERS.map((filter) => (
              <FilterButton key={filter} active={category === filter} onClick={() => setCategory(filter)}>
                {filter}
              </FilterButton>
            ))}
          </div>
        </div>
        <div>
          <span>파일형태</span>
          <div className="filter-row">
            {FILE_TYPE_FILTERS.map((filter) => (
              <FilterButton key={filter} active={fileType === filter} onClick={() => setFileType(filter)}>
                {filter}
              </FilterButton>
            ))}
          </div>
        </div>
        <div>
          <span>제공방식</span>
          <div className="filter-row">
            {DELIVERY_FILTERS.map((filter) => (
              <FilterButton key={filter} active={deliveryType === filter} onClick={() => setDeliveryType(filter)}>
                {filter}
              </FilterButton>
            ))}
          </div>
        </div>
      </div>

      {loadState.status === 'loading' && <div className="library-message">공개자료를 불러오는 중입니다.</div>}
      {loadState.status === 'error' && <div className="library-message error">{loadState.message}</div>}

      {loadState.status === 'ready' && shouldShowResults && (
        <section className="resource-section">
          <div className="resource-section-heading inline">
            <div>
              <h2>검색 결과 {filteredResources.length}건</h2>
              <p>검색어와 필터 조건에 맞는 자료만 표시합니다.</p>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setQuery('');
                setCategory(ALL);
                setFileType(ALL);
                setDeliveryType(ALL);
              }}
            >
              검색 초기화
            </button>
          </div>

          {filteredResources.length > 0 ? (
            <div className="resource-card-grid">
              {filteredResources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <h3>검색 결과가 없습니다.</h3>
              <p>자료명보다 업무명이나 상황 중심으로 다시 검색해보세요.</p>
              <div className="popular-keywords">
                {POPULAR_KEYWORDS.slice(0, 6).map((keyword) => (
                  <button key={keyword} type="button" onClick={() => handlePopularKeyword(keyword)}>
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {loadState.status === 'ready' && !shouldShowResults && (
        <ResourceSection
          title="추천 자료"
          description="우선순위가 높은 자료만 먼저 보여드립니다. 더 많은 자료는 검색으로 찾아보세요."
          resources={recommendedResources}
        />
      )}
    </section>
  );
}
