export const parseCsv = (csvText) => {
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

export const getValue = (row, names) => {
  const nameList = Array.isArray(names) ? names : [names];
  const matchedName = nameList.find((name) => Object.prototype.hasOwnProperty.call(row, name));
  return matchedName ? String(row[matchedName] || '').trim() : '';
};

export const isTrueValue = (value) =>
  ['true', 'TRUE', 'Y', 'y', '1', '예', '사용', '표시'].includes(String(value || '').trim());
