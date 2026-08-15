import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const readAt = process.argv[4] || new Date().toISOString();

if (!inputPath || !outputPath) {
  throw new Error('Usage: node generateTrelloReadSnapshot.js <input.json> <output.js> [readAt]');
}

const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const tasks = (source.lists || []).flatMap((list) =>
  (list.cards || []).map((card) => ({
    id: card.id,
    title: card.name || 'بطاقة Trello',
    dueDate: card.due?.date || null,
    completed: Boolean(card.closed || card.complete),
    externalSource: 'trello',
    externalUrl: card.url || card.shortUrl || null,
    externalMeta: {
      labels: (card.labels || []).map((label) => label.name).filter(Boolean),
      listName: list.name || 'قائمة غير مسماة',
      memberIds: (card.members || []).map((member) => member.id || member.fullName || member.username).filter(Boolean),
    },
  }))
);

const snapshot = {
  board: source.board || { id: null, name: 'Board Trello' },
  readAt,
  taskCount: tasks.length,
  tasks,
};

const code = `// Generated from an explicit read-only Trello Board snapshot. Do not edit manually.\nexport const trelloReadSnapshot = ${JSON.stringify(snapshot, null, 2)};\n\nexport default trelloReadSnapshot;\n`;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, code, 'utf8');
console.log(JSON.stringify({ outputPath, taskCount: tasks.length, readAt }, null, 2));
