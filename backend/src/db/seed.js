import db, { initDatabase } from './schema.js';
import { generateKidImageUrl } from '../services/imageService.js';

initDatabase();

console.log('🌱 Đang nạp dữ liệu mẫu ban đầu chuẩn hóa hình ảnh (Seeding database)...');

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

// 2. Dữ liệu thẻ mẫu (Flashcards) chuẩn hình ảnh hoạt hình cute cho trẻ em
const flashcards = [
  // Chủ đề: Animals
  {
    topic_id: 'animals',
    word: 'Cat',
    phonetic: '/kæt/',
    meaning_vi: 'Con mèo',
    example_en: 'The cute cat is sleeping on the mat.',
    example_vi: 'Chú mèo con đáng yêu đang ngủ trên thảm.',
    image_url: generateKidImageUrl('cat', 'animals'),
    audio_url: null,
    difficulty: 1
  },
  {
    topic_id: 'animals',
    word: 'Dog',
    phonetic: '/dɒɡ/',
    meaning_vi: 'Con chó',
    example_en: 'The happy dog wags its fluffy tail.',
    example_vi: 'Chú cún vui vẻ vẫy cái đuôi xù.',
    image_url: generateKidImageUrl('dog', 'animals'),
    audio_url: null,
    difficulty: 1
  },
  {
    topic_id: 'animals',
    word: 'Elephant',
    phonetic: '/ˈel.ɪ.fənt/',
    meaning_vi: 'Con voi',
    example_en: 'The baby elephant has big round ears.',
    example_vi: 'Chú voi con có đôi tai to tròn.',
    image_url: generateKidImageUrl('baby elephant', 'animals'),
    audio_url: null,
    difficulty: 1
  },
  {
    topic_id: 'animals',
    word: 'Lion',
    phonetic: '/ˈlaɪ.ən/',
    meaning_vi: 'Sư tử',
    example_en: 'The brave lion is the king of animals.',
    example_vi: 'Sư tử dũng mãnh là vua của muôn loài.',
    image_url: generateKidImageUrl('cute baby lion', 'animals'),
    audio_url: null,
    difficulty: 1
  },
  {
    topic_id: 'animals',
    word: 'Monkey',
    phonetic: '/ˈmʌŋ.ki/',
    meaning_vi: 'Con khỉ',
    example_en: 'The funny monkey loves eating sweet bananas.',
    example_vi: 'Chú khỉ vui nhộn rất thích ăn chuối ngọt.',
    image_url: generateKidImageUrl('cute monkey holding banana', 'animals'),
    audio_url: null,
    difficulty: 1
  },

  // Chủ đề: Colors - Dùng hình ảnh màu sắc kèm vật phẩm minh họa sinh động
  {
    topic_id: 'colors',
    word: 'Red',
    phonetic: '/red/',
    meaning_vi: 'Màu đỏ',
    example_en: 'The sweet apple is bright red.',
    example_vi: 'Quả táo ngọt lành có màu đỏ tươi.',
    image_url: generateKidImageUrl('red', 'colors'),
    audio_url: null,
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Blue',
    phonetic: '/bluː/',
    meaning_vi: 'Màu xanh da trời',
    example_en: 'The clear sky and ocean are blue.',
    example_vi: 'Bầu trời trong xanh và đại dương có màu xanh lam.',
    image_url: generateKidImageUrl('blue', 'colors'),
    audio_url: null,
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Yellow',
    phonetic: '/ˈjel.əʊ/',
    meaning_vi: 'Màu vàng',
    example_en: 'The warm sun shines with bright yellow light.',
    example_vi: 'Mặt trời ấm áp chiếu ánh sáng vàng rực rỡ.',
    image_url: generateKidImageUrl('yellow', 'colors'),
    audio_url: null,
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Green',
    phonetic: '/ɡriːn/',
    meaning_vi: 'Màu xanh lá cây',
    example_en: 'Tiny frogs and fresh tree leaves are green.',
    example_vi: 'Những chú ếch nhỏ và lá cây tươi có màu xanh lá.',
    image_url: generateKidImageUrl('green', 'colors'),
    audio_url: null,
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Pink',
    phonetic: '/pɪŋk/',
    meaning_vi: 'Màu hồng',
    example_en: 'Sweet cotton candy and flowers are pretty in pink.',
    example_vi: 'Kẹo bông ngọt ngào và những bông hoa có màu hồng thật xinh.',
    image_url: generateKidImageUrl('pink', 'colors'),
    audio_url: null,
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
  // Xóa toàn bộ thẻ cũ trước khi nạp lại
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

console.log('✅ Đã nạp lại thành công dữ liệu với hình ảnh hoạt hình AI Pollinations chuẩn xác:');
console.log(` - ${topics.length} chủ đề: ${topics.map(t => t.name_en).join(', ')}`);
console.log(` - ${flashcards.length} thẻ từ vựng với hình ảnh cartoon chuẩn, không có người!`);
