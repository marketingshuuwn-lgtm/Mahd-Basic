import * as XLSX from 'xlsx';

function tasksToRows(tasks) {
  return tasks.map((t) => ({
    Title: t.title,
    Quadrant: t.quadrant,
    Completed: t.completed,
    Notes: t.notes || '',
    DueDate: t.dueDate || '',
    Duration: t.duration || 1,
  }));
}

export function exportTasksAsCsv(tasks) {
  const rows = tasksToRows(tasks);
  const header = ['Title', 'Quadrant', 'Completed', 'Notes', 'DueDate', 'Duration'];
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [header.join(',')].concat(
    rows.map((r) => header.map((h) => escape(r[h])).join(','))
  );
  const csv = '\uFEFF' + lines.join('\n');
  downloadBlob(csv, 'text/csv;charset=utf-8;', 'مهام-مهد.csv');
}

export function exportTasksAsXlsx(tasks) {
  const rows = tasksToRows(tasks);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المهام');
  XLSX.writeFile(wb, 'مهام-مهد.xlsx');
}

function downloadBlob(content, mime, filename) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line) {
  const result = [];
  let insideQuote = false;
  let currentVal = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuote && line[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      result.push(currentVal);
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal);
  return result;
}

// يقرأ ملف مستورد (csv أو xlsx) ويرجّع Promise بمصفوفة مهام موحّدة الشكل
export function readImportFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'));
    reader.onload = (e) => {
      try {
        let importedData = [];
        if (ext === 'csv') {
          const text = e.target.result.replace(/^\uFEFF/, '');
          const lines = text.split('\n').filter((l) => l.trim() !== '');
          for (let i = 1; i < lines.length; i++) {
            const parts = parseCsvLine(lines[i]);
            if (parts.length >= 5) {
              importedData.push({
                title: parts[0] || 'مهمة',
                quadrant: parts[1] || 'important-urgent',
                completed: parts[2] === 'true',
                notes: parts[3] || '',
                dueDate: parts[4] || '',
                duration: parseInt(parts[5]) || 1,
              });
            }
          }
        } else if (ext === 'xlsx') {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws);
          json.forEach((row) => {
            importedData.push({
              title: row.Title || row.title || 'مهمة',
              quadrant: row.Quadrant || row.quadrant || 'important-urgent',
              completed: String(row.Completed ?? row.completed).toLowerCase() === 'true',
              notes: row.Notes || row.notes || '',
              dueDate: row.DueDate || row.dueDate || '',
              duration: parseInt(row.Duration || row.duration) || 1,
            });
          });
        } else {
          reject(new Error('صيغة الملف غير مدعومة (csv أو xlsx فقط)'));
          return;
        }
        resolve(importedData);
      } catch (err) {
        reject(err);
      }
    };
    if (ext === 'xlsx') reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  });
}
