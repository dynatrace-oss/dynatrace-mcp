import { App } from '@modelcontextprotocol/ext-apps';

const loadingEl = document.getElementById('loading')!;
const errorEl = document.getElementById('error')!;
const resultsEl = document.getElementById('results')!;
const metadataEl = document.getElementById('metadata')!;
const tableHeadEl = document.getElementById('table-head')!;
const tableBodyEl = document.getElementById('table-body')!;

const app = new App({ name: 'DQL Results Viewer', version: '1.0.0' });

app.connect();

/**
 * Parse the tool result text (structured as markdown from execute_dql) and extract
 * metadata lines + JSON records block.
 */
function parseToolResult(text: string): { metadataLines: string[]; records: Record<string, unknown>[] } {
  const metadataLines: string[] = [];
  let records: Record<string, unknown>[] = [];

  // Extract JSON block from the text
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      records = JSON.parse(jsonMatch[1]);
    } catch {
      // If JSON parse fails, records stays empty
    }
  }

  // Collect metadata lines (lines starting with - ** or containing emoji indicators)
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- **') || trimmed.startsWith('⚠️') || trimmed.startsWith('💡')) {
      metadataLines.push(trimmed);
    }
  }

  return { metadataLines, records };
}

/**
 * Format a cell value for display.
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '<span class="cell-null">null</span>';
  }
  if (typeof value === 'object') {
    return `<span class="cell-object" title="Click to expand">${escapeHtml(JSON.stringify(value))}</span>`;
  }
  return escapeHtml(String(value));
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Render the DQL results as an HTML table.
 */
function renderResults(text: string): void {
  const { metadataLines, records } = parseToolResult(text);

  if (!records || records.length === 0) {
    loadingEl.classList.add('hidden');
    errorEl.textContent = text || 'No records returned from DQL query.';
    errorEl.classList.remove('hidden');
    return;
  }

  // Render metadata
  if (metadataLines.length > 0) {
    metadataEl.innerHTML = metadataLines
      .map((line) => {
        const isWarning = line.includes('⚠️') || line.includes('Warning');
        const cssClass = isWarning ? 'metadata-item warning' : 'metadata-item';
        // Strip markdown bold markers
        const cleanLine = line.replace(/^-\s*/, '').replace(/\*\*/g, '');
        return `<div class="${cssClass}"><span class="value">${escapeHtml(cleanLine)}</span></div>`;
      })
      .join('');
  }

  // Get all unique column keys from records
  const columns = new Set<string>();
  for (const record of records) {
    if (record && typeof record === 'object') {
      for (const key of Object.keys(record)) {
        columns.add(key);
      }
    }
  }

  const columnList = Array.from(columns);

  // Render table header
  const headerRow = document.createElement('tr');
  for (const col of columnList) {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  }
  tableHeadEl.appendChild(headerRow);

  // Render table rows
  for (const record of records) {
    const tr = document.createElement('tr');
    for (const col of columnList) {
      const td = document.createElement('td');
      td.innerHTML = formatCellValue(record?.[col]);
      tr.appendChild(td);
    }
    tableBodyEl.appendChild(tr);
  }

  loadingEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
}

// Handle the initial tool result pushed by the host
app.ontoolresult = (result) => {
  const text = result.content?.find((c: { type: string }) => c.type === 'text')?.text;
  if (text) {
    renderResults(text);
  } else {
    loadingEl.classList.add('hidden');
    errorEl.textContent = 'No result data received.';
    errorEl.classList.remove('hidden');
  }
};
