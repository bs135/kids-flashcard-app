import db, { initDatabase } from './schema.js';

initDatabase();

console.log('🧹 Scanning and cleaning duplicate flashcard entries...');

// Find and delete duplicate records (retaining the record with the highest ID)
const cleanupResult = db.prepare(`
  DELETE FROM flashcards 
  WHERE id NOT IN (
    SELECT MAX(id) 
    FROM flashcards 
    GROUP BY topic_id, LOWER(word)
  )
`).run();

console.log(`✅ Removed ${cleanupResult.changes} duplicate cards.`);

// Inspect remaining list
const remaining = db.prepare('SELECT id, topic_id, word FROM flashcards ORDER BY topic_id, id').all();
console.log('📋 Remaining flashcards after cleanup:', remaining);
