import db, { initDatabase } from './schema.js';

initDatabase();

console.log('🧹 Đang quét và dọn dẹp các thẻ flashcard bị trùng lặp...');

// Tìm và xóa các bản ghi trùng lặp (giữ lại bản ghi có ID lớn nhất)
const cleanupResult = db.prepare(`
  DELETE FROM flashcards 
  WHERE id NOT IN (
    SELECT MAX(id) 
    FROM flashcards 
    GROUP BY topic_id, LOWER(word)
  )
`).run();

console.log(`✅ Đã xóa ${cleanupResult.changes} thẻ bị trùng lặp!`);

// Kiểm tra lại danh sách hiện tại
const remaining = db.prepare('SELECT id, topic_id, word FROM flashcards ORDER BY topic_id, id').all();
console.log('📋 Danh sách thẻ sau khi dọn dẹp:', remaining);
