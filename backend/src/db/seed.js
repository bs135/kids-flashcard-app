import db, { initDatabase } from './schema.js';

initDatabase();

console.log('🌱 Đang nạp dữ liệu mẫu ban đầu (Seeding database)...');

// 1. Dữ liệu các chủ đề mẫu (Topics)
const topics = [
  {
    id: 'animals',
    name_en: 'Animals',
    name_vi: 'Động vật',
    icon: '🦁',
    color_theme: 'amber',
    display_order: 1
  },
  {
    id: 'colors',
    name_en: 'Colors',
    name_vi: 'Màu sắc',
    icon: '🎨',
    color_theme: 'sky',
    display_order: 2
  }
];

// 2. Dữ liệu thẻ mẫu (Flashcards) - 5 thẻ cho Animals, 5 thẻ cho Colors
const flashcards = [
  // Chủ đề: Animals
  {
    topic_id: 'animals',
    word: 'Cat',
    phonetic: '/kæt/',
    meaning_vi: 'Con mèo',
    example_en: 'The cat is sleeping on the mat.',
    example_vi: 'Con mèo đang ngủ trên tấm thảm.',
    image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80',
    audio_url: 'https://api.dictionaryapi.dev/media/pronunciations/en/cat-us.mp3',
    difficulty: 1
  },
  {
    topic_id: 'animals',
    word: 'Dog',
    phonetic: '/dɒɡ/',
    meaning_vi: 'Con chó',
    example_en: 'The happy dog wags its tail.',
    example_vi: 'Chú chó vui vẻ vẫy đuôi.',
    image_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=600&q=80',
    audio_url: 'https://api.dictionaryapi.dev/media/pronunciations/en/dog-us.mp3',
    difficulty: 1
  },
  {
    topic_id: 'animals',
    word: 'Elephant',
    phonetic: '/ˈel.ɪ.fənt/',
    meaning_vi: 'Con voi',
    example_en: 'The elephant has a very long nose.',
    example_vi: 'Con voi có một cái vòi rất dài.',
    image_url: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=600&q=80',
    audio_url: 'https://api.dictionaryapi.dev/media/pronunciations/en/elephant-us.mp3',
    difficulty: 1
  },
  {
    topic_id: 'animals',
    word: 'Lion',
    phonetic: '/ˈlaɪ.ən/',
    meaning_vi: 'Sư tử',
    example_en: 'The lion is the king of the jungle.',
    example_vi: 'Sư tử là chúa tể rừng xanh.',
    image_url: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?auto=format&fit=crop&w=600&q=80',
    audio_url: 'https://api.dictionaryapi.dev/media/pronunciations/en/lion-us.mp3',
    difficulty: 1
  },
  {
    topic_id: 'animals',
    word: 'Monkey',
    phonetic: '/ˈmʌŋ.ki/',
    meaning_vi: 'Con khỉ',
    example_en: 'The monkey loves eating bananas.',
    example_vi: 'Chú khỉ rất thích ăn chuối.',
    image_url: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?auto=format&fit=crop&w=600&q=80',
    audio_url: 'https://api.dictionaryapi.dev/media/pronunciations/en/monkey-us.mp3',
    difficulty: 1
  },

  // Chủ đề: Colors
  {
    topic_id: 'colors',
    word: 'Red',
    phonetic: '/red/',
    meaning_vi: 'Màu đỏ',
    example_en: 'The apple is bright red.',
    example_vi: 'Quả táo có màu đỏ tươi.',
    image_url: 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=600&q=80',
    audio_url: 'https://api.dictionaryapi.dev/media/pronunciations/en/red-us.mp3',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Blue',
    phonetic: '/bluː/',
    meaning_vi: 'Màu xanh da trời',
    example_en: 'The sky is clear and blue today.',
    example_vi: 'Hôm nay bầu trời thật trong và xanh.',
    image_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
    audio_url: 'https://api.dictionaryapi.dev/media/pronunciations/en/blue-us.mp3',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Yellow',
    phonetic: '/ˈjel.əʊ/',
    meaning_vi: 'Màu vàng',
    example_en: 'The sun shines with bright yellow light.',
    example_vi: 'Mặt trời chiếu ánh sáng vàng rực rỡ.',
    image_url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    audio_url: 'https://api.dictionaryapi.dev/media/pronunciations/en/yellow-us.mp3',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Green',
    phonetic: '/ɡriːn/',
    meaning_vi: 'Màu xanh lá cây',
    example_en: 'Frogs and fresh leaves are green.',
    example_vi: 'Những chú ếch và lá cây tươi có màu xanh lá.',
    image_url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80',
    audio_url: 'https://api.dictionaryapi.dev/media/pronunciations/en/green-us.mp3',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Pink',
    phonetic: '/pɪŋk/',
    meaning_vi: 'Màu hồng',
    example_en: 'Sweet cotton candy is pretty in pink.',
    example_vi: 'Kẹo bông ngọt ngào có màu hồng thật xinh.',
    image_url: 'https://images.unsplash.com/photo-1520052205864-92d242b3a76b?auto=format&fit=crop&w=600&q=80',
    audio_url: 'https://api.dictionaryapi.dev/media/pronunciations/en/pink-us.mp3',
    difficulty: 1
  }
];

// Transaction chèn dữ liệu
const insertTopic = db.prepare(`
  INSERT INTO topics (id, name_en, name_vi, icon, color_theme, display_order)
  VALUES (@id, @name_en, @name_vi, @icon, @color_theme, @display_order)
  ON CONFLICT(id) DO UPDATE SET
    name_en = excluded.name_en,
    name_vi = excluded.name_vi,
    icon = excluded.icon,
    color_theme = excluded.color_theme,
    display_order = excluded.display_order
`);

const insertTopicProgress = db.prepare(`
  INSERT OR IGNORE INTO topic_progress (topic_id, is_unlocked, cards_learned, quiz_high_score)
  VALUES (?, 1, 0, 0)
`);

const insertCard = db.prepare(`
  INSERT INTO flashcards (topic_id, word, phonetic, meaning_vi, example_en, example_vi, image_url, audio_url, difficulty)
  VALUES (@topic_id, @word, @phonetic, @meaning_vi, @example_en, @example_vi, @image_url, @audio_url, @difficulty)
`);

const seedTransaction = db.transaction(() => {
  // Xóa thẻ cũ trước khi nạp lại
  db.prepare('DELETE FROM flashcards').run();

  for (const topic of topics) {
    insertTopic.run(topic);
    insertTopicProgress.run(topic.id);
  }

  for (const card of flashcards) {
    insertCard.run(card);
  }
});

seedTransaction();

console.log('✅ Đã nạp thành công:');
console.log(` - ${topics.length} chủ đề: ${topics.map(t => t.name_en).join(', ')}`);
console.log(` - ${flashcards.length} thẻ từ vựng với đầy đủ phiên âm, nghĩa tiếng Việt, câu ví dụ, ảnh và audio!`);
