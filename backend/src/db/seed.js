import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db, { initDatabase } from './schema.js';
import { downloadAndConvertKidImage } from '../services/imageService.js';
import { downloadWordAudio } from '../services/edgeTtsService.js';
import { slugify } from '../utils/slugify.js';

initDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUploadsDir = path.resolve(__dirname, '../../uploads');

console.log('🌱 Đang nạp dữ liệu và kiểm tra (Pre-generation / Cache check) media cho 8 chủ đề và 115 thẻ...');

// 1. Danh sách 8 chủ đề (Topics) chuẩn hóa theo slug
export const topics = [
  {
    id: 'colors',
    name_en: 'Colors',
    name_vi: 'Màu Sắc',
    icon: '🎨',
    color_theme: 'sky',
    display_order: 1
  },
  {
    id: 'wild-animals',
    name_en: 'Wild Animals',
    name_vi: 'Động Vật Hoang Dã',
    icon: '🦁',
    color_theme: 'amber',
    display_order: 2
  },
  {
    id: 'pets-farm-animals',
    name_en: 'Pets & Farm Animals',
    name_vi: 'Thú Cưng & Nông Trại',
    icon: '🐶',
    color_theme: 'emerald',
    display_order: 3
  },
  {
    id: 'marine-animals',
    name_en: 'Marine Animals',
    name_vi: 'Sinh Vật Biển',
    icon: '🐬',
    color_theme: 'sky',
    display_order: 4
  },
  {
    id: 'fruits',
    name_en: 'Fruits',
    name_vi: 'Trái Cây',
    icon: '🍎',
    color_theme: 'rose',
    display_order: 5
  },
  {
    id: 'vegetables',
    name_en: 'Vegetables',
    name_vi: 'Rau Củ',
    icon: '🥕',
    color_theme: 'emerald',
    display_order: 6
  },
  {
    id: 'shapes',
    name_en: 'Shapes',
    name_vi: 'Hình Dạng',
    icon: '⭐',
    color_theme: 'amber',
    display_order: 7
  },
  {
    id: 'food',
    name_en: 'Food',
    name_vi: 'Món Ăn',
    icon: '🍕',
    color_theme: 'rose',
    display_order: 8
  }
];

// 2. Danh sách 115 thẻ từ vựng thực tế với nghĩa tiếng Việt, phiên âm và ví dụ cho trẻ em
export const rawFlashcards = [
  // ==========================================
  // 1. Colors (Màu Sắc) - 10 từ
  // ==========================================
  {
    topic_id: 'colors',
    word: 'Red',
    phonetic: '/red/',
    meaning_vi: 'Màu đỏ',
    example_en: 'The sweet apple is bright red.',
    example_vi: 'Quả táo ngọt lành có màu đỏ tươi.',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Blue',
    phonetic: '/bluː/',
    meaning_vi: 'Màu xanh da trời',
    example_en: 'The clear sky is blue.',
    example_vi: 'Bầu trời trong xanh có màu xanh da trời.',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Yellow',
    phonetic: '/ˈjel.əʊ/',
    meaning_vi: 'Màu vàng',
    example_en: 'The warm sun is yellow.',
    example_vi: 'Mặt trời ấm áp có màu vàng tươi.',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Green',
    phonetic: '/ɡriːn/',
    meaning_vi: 'Màu xanh lá cây',
    example_en: 'Fresh tree leaves are green.',
    example_vi: 'Lá cây tươi có màu xanh lá cây.',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Orange',
    phonetic: '/ˈɒr.ɪndʒ/',
    meaning_vi: 'Màu cam',
    example_en: 'The juicy orange is bright orange.',
    example_vi: 'Quả cam mọng nước có màu cam sáng.',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Purple',
    phonetic: '/ˈpɜː.pəl/',
    meaning_vi: 'Màu tím',
    example_en: 'The sweet grapes are purple.',
    example_vi: 'Chùm nho ngọt có màu tím đẹp.',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Pink',
    phonetic: '/pɪŋk/',
    meaning_vi: 'Màu hồng',
    example_en: 'Cotton candy is pretty pink.',
    example_vi: 'Kẹo bông gòn có màu hồng thật xinh.',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Black',
    phonetic: '/blæk/',
    meaning_vi: 'Màu đen',
    example_en: 'The night sky is black.',
    example_vi: 'Bầu trời ban đêm có màu đen.',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'White',
    phonetic: '/waɪt/',
    meaning_vi: 'Màu trắng',
    example_en: 'The fluffy cloud is pure white.',
    example_vi: 'Đám mây bồng bềnh có màu trắng tinh.',
    difficulty: 1
  },
  {
    topic_id: 'colors',
    word: 'Brown',
    phonetic: '/braʊn/',
    meaning_vi: 'Màu nâu',
    example_en: 'The friendly teddy bear is brown.',
    example_vi: 'Chú gấu bông thân thiện có màu nâu.',
    difficulty: 1
  },

  // ==========================================
  // 2. Wild Animals (Động Vật Hoang Dã) - 25 từ
  // ==========================================
  {
    topic_id: 'wild-animals',
    word: 'Bear',
    phonetic: '/beər/',
    meaning_vi: 'Con gấu',
    example_en: 'The big bear loves sweet honey.',
    example_vi: 'Chú gấu to lớn rất thích mật ong ngọt.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Bird',
    phonetic: '/bɜːd/',
    meaning_vi: 'Con chim',
    example_en: 'The little bird sings happily in the tree.',
    example_vi: 'Chú chim nhỏ ca hát líu lo trên cây.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Camel',
    phonetic: '/ˈkæm.əl/',
    meaning_vi: 'Con lạc đà',
    example_en: 'The camel walks across the warm sand.',
    example_vi: 'Chú lạc đà bước đi trên bãi cát ấm.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Deer',
    phonetic: '/dɪər/',
    meaning_vi: 'Con nai',
    example_en: 'The gentle deer has pretty spots.',
    example_vi: 'Chú nai hiền lành có những đốm xinh xắn.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Elephant',
    phonetic: '/ˈel.ɪ.fənt/',
    meaning_vi: 'Con voi',
    example_en: 'The baby elephant has a long nose.',
    example_vi: 'Chú voi con có chiếc vòi thật dài.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Flamingo',
    phonetic: '/fləˈmɪŋ.ɡəʊ/',
    meaning_vi: 'Chim hồng hạc',
    example_en: 'The flamingo stands on one thin leg.',
    example_vi: 'Chim hồng hạc đứng bằng một chân nhỏ.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Fox',
    phonetic: '/fɒks/',
    meaning_vi: 'Con cáo',
    example_en: 'The clever orange fox has a bushy tail.',
    example_vi: 'Chú cáo lông cam thông minh có đuôi xù.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Frog',
    phonetic: '/frɒɡ/',
    meaning_vi: 'Con ếch',
    example_en: 'The little green frog jumps high.',
    example_vi: 'Chú ếch xanh nhảy thật cao.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Giraffe',
    phonetic: '/dʒɪˈrɑːf/',
    meaning_vi: 'Hươu cao cổ',
    example_en: 'The giraffe has a very long neck.',
    example_vi: 'Chú hươu cao cổ có chiếc cổ rất dài.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Gorilla',
    phonetic: '/ɡəˈrɪl.ə/',
    meaning_vi: 'Khỉ đột',
    example_en: 'The strong gorilla beats its chest.',
    example_vi: 'Chú khỉ đột khỏe mạnh vỗ vào ngực.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Hippo',
    phonetic: '/ˈhɪp.əʊ/',
    meaning_vi: 'Hà mã',
    example_en: 'The hippo opens its big mouth wide.',
    example_vi: 'Chú hà mã há to chiếc miệng lớn.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Kangaroo',
    phonetic: '/ˌkæŋ.ɡərˈuː/',
    meaning_vi: 'Chuột túi',
    example_en: 'The mother kangaroo carries her baby in a pouch.',
    example_vi: 'Kangaroo mẹ ôm con trong chiếc túi nhỏ.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Lion',
    phonetic: '/ˈlaɪ.ən/',
    meaning_vi: 'Sư tử',
    example_en: 'The brave lion is the king of beasts.',
    example_vi: 'Chú sư tử dũng mãnh là vua rừng xanh.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Monkey',
    phonetic: '/ˈmʌŋ.ki/',
    meaning_vi: 'Con khỉ',
    example_en: 'The funny monkey loves sweet bananas.',
    example_vi: 'Chú khỉ nghịch ngợm thích ăn chuối ngọt.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Mouse',
    phonetic: '/maʊs/',
    meaning_vi: 'Con chuột',
    example_en: 'The tiny mouse nibbles on yellow cheese.',
    example_vi: 'Chú chuột nhắt gặm miếng phô mai vàng.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Owl',
    phonetic: '/aʊl/',
    meaning_vi: 'Cú mèo',
    example_en: 'The wise owl has big round eyes.',
    example_vi: 'Cú mèo thông thái có đôi mắt to tròn.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Panda',
    phonetic: '/ˈpæn.də/',
    meaning_vi: 'Gấu trúc',
    example_en: 'The cute panda munches on green bamboo.',
    example_vi: 'Chú gấu trúc dễ thương gặm cành trúc xanh.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Parrot',
    phonetic: '/ˈpær.ət/',
    meaning_vi: 'Con vẹt',
    example_en: 'The colorful parrot can mimic words.',
    example_vi: 'Chú vẹt sặc sỡ có thể nói nhại lời người.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Penguin',
    phonetic: '/ˈpeŋ.ɡwɪn/',
    meaning_vi: 'Chim cánh cụt',
    example_en: 'The playful penguin waddles across the ice.',
    example_vi: 'Chú chim cánh cụt lạch bạch bước trên băng.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Polar Bear',
    phonetic: '/ˌpəʊ.lə ˈbeər/',
    meaning_vi: 'Gấu Bắc cực',
    example_en: 'The polar bear swims in cold water.',
    example_vi: 'Gấu Bắc cực bơi lội trong làn nước lạnh.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Rhino',
    phonetic: '/ˈraɪ.nəʊ/',
    meaning_vi: 'Tê giác',
    example_en: 'The strong rhino has a sturdy horn.',
    example_vi: 'Chú tê giác khỏe khoắn có chiếc sừng cứng cáp.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Snake',
    phonetic: '/sneɪk/',
    meaning_vi: 'Con rắn',
    example_en: 'The friendly snake glides gently through the grass.',
    example_vi: 'Bé rắn trườn nhẹ nhàng qua thảm cỏ.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Squirrel',
    phonetic: '/ˈskwɪr.əl/',
    meaning_vi: 'Con sóc',
    example_en: 'The quick squirrel collects crunchy nuts.',
    example_vi: 'Chú sóc nhanh nhẹn thu thập những quả hạt giòn.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Tiger',
    phonetic: '/ˈtaɪ.ɡər/',
    meaning_vi: 'Con hổ',
    example_en: 'The magnificent tiger has bright orange stripes.',
    example_vi: 'Chú hổ dũng mãnh có những vằn cam nổi bật.',
    difficulty: 1
  },
  {
    topic_id: 'wild-animals',
    word: 'Zebra',
    phonetic: '/ˈzeb.rə/',
    meaning_vi: 'Ngựa vằn',
    example_en: 'The zebra has black and white stripes.',
    example_vi: 'Chú ngựa vằn có những sọc đen trắng đều đặn.',
    difficulty: 1
  },

  // ==========================================
  // 3. Pets & Farm Animals (Thú Cưng & Nông Trại) - 11 từ
  // ==========================================
  {
    topic_id: 'pets-farm-animals',
    word: 'Cat',
    phonetic: '/kæt/',
    meaning_vi: 'Con mèo',
    example_en: 'The cute cat purrs happily.',
    example_vi: 'Chú mèo đáng yêu kêu meo meo vui vẻ.',
    difficulty: 1
  },
  {
    topic_id: 'pets-farm-animals',
    word: 'Chicken',
    phonetic: '/ˈtʃɪk.ɪn/',
    meaning_vi: 'Con gà',
    example_en: 'The chicken pecks on golden corn grains.',
    example_vi: 'Chú gà mổ những hạt ngô vàng.',
    difficulty: 1
  },
  {
    topic_id: 'pets-farm-animals',
    word: 'Cow',
    phonetic: '/kaʊ/',
    meaning_vi: 'Con bò',
    example_en: 'The gentle cow gives fresh sweet milk.',
    example_vi: 'Bác bò hiền lành cho sữa ngọt lành.',
    difficulty: 1
  },
  {
    topic_id: 'pets-farm-animals',
    word: 'Dog',
    phonetic: '/dɒɡ/',
    meaning_vi: 'Con chó',
    example_en: 'The friendly dog wags its fluffy tail.',
    example_vi: 'Chú cún thân thiện vẫy vẫy cái đuôi xinh.',
    difficulty: 1
  },
  {
    topic_id: 'pets-farm-animals',
    word: 'Donkey',
    phonetic: '/ˈdɒŋ.ki/',
    meaning_vi: 'Con lừa',
    example_en: 'The donkey carries apples with patience.',
    example_vi: 'Chú lừa kiên nhẫn chở những giỏ táo ngon.',
    difficulty: 1
  },
  {
    topic_id: 'pets-farm-animals',
    word: 'Duck',
    phonetic: '/dʌk/',
    meaning_vi: 'Con vịt',
    example_en: 'The little yellow duck swims in the pond.',
    example_vi: 'Chú vịt con màu vàng bơi lội dưới ao.',
    difficulty: 1
  },
  {
    topic_id: 'pets-farm-animals',
    word: 'Goat',
    phonetic: '/ɡəʊt/',
    meaning_vi: 'Con dê',
    example_en: 'The playful goat hops on green hills.',
    example_vi: 'Chú dê con nhảy nhót trên sườn đồi xanh.',
    difficulty: 1
  },
  {
    topic_id: 'pets-farm-animals',
    word: 'Horse',
    phonetic: '/hɔːs/',
    meaning_vi: 'Con ngựa',
    example_en: 'The noble horse gallops across the open field.',
    example_vi: 'Chú ngựa phi nhanh qua đồng cỏ bao la.',
    difficulty: 1
  },
  {
    topic_id: 'pets-farm-animals',
    word: 'Pig',
    phonetic: '/pɪɡ/',
    meaning_vi: 'Con heo',
    example_en: 'The round pink pig loves taking a bath.',
    example_vi: 'Chú heo hồng tròn xoe thích đùa nghịch.',
    difficulty: 1
  },
  {
    topic_id: 'pets-farm-animals',
    word: 'Rabbit',
    phonetic: '/ˈræb.ɪt/',
    meaning_vi: 'Con thỏ',
    example_en: 'The fluffy rabbit hops and eats carrots.',
    example_vi: 'Bé thỏ bông nhảy nhót và ăn củ cà rốt.',
    difficulty: 1
  },
  {
    topic_id: 'pets-farm-animals',
    word: 'Sheep',
    phonetic: '/ʃiːp/',
    meaning_vi: 'Con cừu',
    example_en: 'The gentle sheep has soft white wool.',
    example_vi: 'Chú cừu hiền lành có bộ lông trắng mịn.',
    difficulty: 1
  },

  // ==========================================
  // 4. Marine Animals (Sinh Vật Biển) - 11 từ
  // ==========================================
  {
    topic_id: 'marine-animals',
    word: 'Crab',
    phonetic: '/kræb/',
    meaning_vi: 'Con cua',
    example_en: 'The little crab walks sideways on sandy shores.',
    example_vi: 'Chú cua nhỏ đi ngang trên bờ cát.',
    difficulty: 1
  },
  {
    topic_id: 'marine-animals',
    word: 'Dolphin',
    phonetic: '/ˈdɒl.fɪn/',
    meaning_vi: 'Cá heo',
    example_en: 'The friendly dolphin leaps out of waves.',
    example_vi: 'Chú cá heo nhảy nhót trên ngọn sóng xanh.',
    difficulty: 1
  },
  {
    topic_id: 'marine-animals',
    word: 'Fish',
    phonetic: '/fɪʃ/',
    meaning_vi: 'Con cá',
    example_en: 'The golden fish swims gracefully in water.',
    example_vi: 'Bé cá vàng bơi lội nhẹ nhàng trong nước.',
    difficulty: 1
  },
  {
    topic_id: 'marine-animals',
    word: 'Jellyfish',
    phonetic: '/ˈdʒel.i.fɪʃ/',
    meaning_vi: 'Con sứa',
    example_en: 'The shiny jellyfish glows in deep blue water.',
    example_vi: 'Con sứa phát sáng lấp lánh dưới biển sâu.',
    difficulty: 1
  },
  {
    topic_id: 'marine-animals',
    word: 'Lobster',
    phonetic: '/ˈlɒb.stər/',
    meaning_vi: 'Tôm hùm',
    example_en: 'The big lobster has two strong claws.',
    example_vi: 'Chú tôm hùm có đôi càng rất khỏe mạnh.',
    difficulty: 1
  },
  {
    topic_id: 'marine-animals',
    word: 'Seahorse',
    phonetic: '/ˈsiː.hɔːs/',
    meaning_vi: 'Cá ngựa',
    example_en: 'The tiny seahorse holds on to seagrass.',
    example_vi: 'Chú cá ngựa bé xíu bám đuôi vào nhánh rong biển.',
    difficulty: 1
  },
  {
    topic_id: 'marine-animals',
    word: 'Seal',
    phonetic: '/siːl/',
    meaning_vi: 'Hải cẩu',
    example_en: 'The cute seal claps its flippers cheerfully.',
    example_vi: 'Bé hải cẩu vỗ vỗ vây chào thật vui tai.',
    difficulty: 1
  },
  {
    topic_id: 'marine-animals',
    word: 'Shark',
    phonetic: '/ʃɑːk/',
    meaning_vi: 'Cá mập',
    example_en: 'The fast shark swims quickly in the ocean.',
    example_vi: 'Chú cá mập bơi thoăn thoắt trong đại dương.',
    difficulty: 1
  },
  {
    topic_id: 'marine-animals',
    word: 'Shell',
    phonetic: '/ʃel/',
    meaning_vi: 'Vỏ sò',
    example_en: 'The pretty shell shines on the sunny beach.',
    example_vi: 'Chiếc vỏ sò xinh xắn sáng lấp lánh trên bãi biển.',
    difficulty: 1
  },
  {
    topic_id: 'marine-animals',
    word: 'Starfish',
    phonetic: '/ˈstɑː.fɪʃ/',
    meaning_vi: 'Sao biển',
    example_en: 'The orange starfish looks like a bright star.',
    example_vi: 'Sao biển màu cam trông như một ngôi sao rực rỡ.',
    difficulty: 1
  },
  {
    topic_id: 'marine-animals',
    word: 'Turtle',
    phonetic: '/ˈtɜː.təl/',
    meaning_vi: 'Con rùa',
    example_en: 'The sea turtle glides gently among corals.',
    example_vi: 'Chú rùa biển bơi thong thả quanh rạn san hô.',
    difficulty: 1
  },

  // ==========================================
  // 5. Fruits (Trái Cây) - 14 từ
  // ==========================================
  {
    topic_id: 'fruits',
    word: 'Apple',
    phonetic: '/ˈæp.əl/',
    meaning_vi: 'Quả táo',
    example_en: 'The crisp red apple is sweet and tasty.',
    example_vi: 'Quả táo đỏ giòn ngọt và thơm ngon.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Apricot',
    phonetic: '/ˈeɪ.prɪ.kɒt/',
    meaning_vi: 'Quả mơ',
    example_en: 'The ripe apricot is soft and orange.',
    example_vi: 'Quả mơ chín mềm mại có màu cam ngọt.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Banana',
    phonetic: '/bəˈnɑː.nə/',
    meaning_vi: 'Quả chuối',
    example_en: 'Monkeys love sweet yellow bananas.',
    example_vi: 'Những chú khỉ rất thích quả chuối vàng ngọt.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Blueberries',
    phonetic: '/ˈbluːˌbər.iz/',
    meaning_vi: 'Quả việt quất',
    example_en: 'Fresh blueberries are round and yummy.',
    example_vi: 'Những quả việt quất tươi tròn tròn ngon tuyệt.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Cherries',
    phonetic: '/ˈtʃer.iz/',
    meaning_vi: 'Quả anh đào',
    example_en: 'Sweet red cherries grow in pairs.',
    example_vi: 'Những cặp quả cherry đỏ mọng mọc đôi với nhau.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Grapes',
    phonetic: '/ɡreɪps/',
    meaning_vi: 'Quả nho',
    example_en: 'Juicy purple grapes hang in beautiful bunches.',
    example_vi: 'Những chùm nho tím mọng nước trĩu quả.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Kiwi',
    phonetic: '/ˈkiː.wiː/',
    meaning_vi: 'Quả kiwi',
    example_en: 'The fresh kiwi has bright green sweet fruit.',
    example_vi: 'Quả kiwi có ruột xanh tươi mát ngọt lịm.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Melon',
    phonetic: '/ˈmel.ən/',
    meaning_vi: 'Quả dưa',
    example_en: 'A slice of sweet melon cools down hot days.',
    example_vi: 'Miếng dưa ngọt mát giúp xua tan ngày nắng nóng.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Orange',
    phonetic: '/ˈɒr.ɪndʒ/',
    meaning_vi: 'Quả cam',
    example_en: 'Fresh orange juice gives lots of energy.',
    example_vi: 'Nước cam tươi đem lại nhiều năng lượng cho bé.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Peach',
    phonetic: '/piːtʃ/',
    meaning_vi: 'Quả đào',
    example_en: 'The soft pink peach smells so sweet.',
    example_vi: 'Quả đào hồng mềm mại tỏa hương thơm ngát.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Pear',
    phonetic: '/peər/',
    meaning_vi: 'Quả lê',
    example_en: 'The juicy green pear is sweet and crisp.',
    example_vi: 'Quả lê xanh mọng nước ngọt thanh và giòn rụm.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Pineapple',
    phonetic: '/ˈpaɪnˌæp.əl/',
    meaning_vi: 'Quả dứa',
    example_en: 'The golden pineapple wears a crown of green leaves.',
    example_vi: 'Quả dứa vàng ươm đội chiếc vương miện lá xanh.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Raspberries',
    phonetic: '/ˈrɑːz.bər.iz/',
    meaning_vi: 'Quả mâm xôi',
    example_en: 'Tiny raspberries are sweet and berry good.',
    example_vi: 'Những quả mâm xôi nhỏ xinh chua ngọt ngon tuyệt.',
    difficulty: 1
  },
  {
    topic_id: 'fruits',
    word: 'Strawberry',
    phonetic: '/ˈstrɔː.bər.i/',
    meaning_vi: 'Quả dâu tây',
    example_en: 'The heart-shaped strawberry is sweet and red.',
    example_vi: 'Quả dâu tây hình trái tim đỏ mọng ngọt ngào.',
    difficulty: 1
  },

  // ==========================================
  // 6. Vegetables (Rau Củ) - 14 từ
  // ==========================================
  {
    topic_id: 'vegetables',
    word: 'Beans',
    phonetic: '/biːnz/',
    meaning_vi: 'Đậu que',
    example_en: 'Green beans make children grow tall.',
    example_vi: 'Đậu que xanh giúp các bé mau lớn khôn.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Bell Pepper',
    phonetic: '/ˈbel ˌpep.ər/',
    meaning_vi: 'Ớt chuông',
    example_en: 'The sweet bell pepper is crisp and colorful.',
    example_vi: 'Quả ớt chuông ngọt giòn và nhiều sắc màu.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Broccoli',
    phonetic: '/ˈbrɒk.əl.i/',
    meaning_vi: 'Súp lơ xanh',
    example_en: 'Broccoli looks like miniature green trees.',
    example_vi: 'Súp lơ xanh trông như những chiếc cây nhỏ xíu.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Carrot',
    phonetic: '/ˈkær.ət/',
    meaning_vi: 'Cà rốt',
    example_en: 'Crunchy orange carrots are good for our eyes.',
    example_vi: 'Cà rốt cam giòn ngon rất tốt cho đôi mắt của bé.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Celery',
    phonetic: '/ˈsel.ər.i/',
    meaning_vi: 'Cần tây',
    example_en: 'Fresh celery stalks are nice and crunchy.',
    example_vi: 'Cần tây tươi ngon và giòn tan khi ăn.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Corn',
    phonetic: '/kɔːn/',
    meaning_vi: 'Bắp ngô',
    example_en: 'Sweet yellow corn has golden kernels.',
    example_vi: 'Bắp ngô vàng óng ả có từng hạt ngọt thơm.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Cucumber',
    phonetic: '/ˈkjuː.kʌm.bər/',
    meaning_vi: 'Dưa leo',
    example_en: 'Cool cucumber slices taste fresh.',
    example_vi: 'Những lát dưa leo tươi mát ăn giòn ngon.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Lettuce',
    phonetic: '/ˈlet.ɪs/',
    meaning_vi: 'Rau xà lách',
    example_en: 'Crisp green lettuce makes fresh salad.',
    example_vi: 'Rau xà lách giòn ngon làm món trộn tươi mát.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Mushroom',
    phonetic: '/ˈmʌʃ.ruːm/',
    meaning_vi: 'Cây nấm',
    example_en: 'The little mushroom looks like a small umbrella.',
    example_vi: 'Cây nấm nhỏ xíu trông như chiếc ô xinh.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Onion',
    phonetic: '/ˈʌn.jən/',
    meaning_vi: 'Hành tây',
    example_en: 'Round onions add nice flavor to warm soup.',
    example_vi: 'Củ hành tây tròn làm bát súp thêm đậm đà thơm ngon.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Peas',
    phonetic: '/piːz/',
    meaning_vi: 'Đậu Hà Lan',
    example_en: 'Little green peas pop out of the pod.',
    example_vi: 'Những hạt đậu Hà Lan nhỏ xinh bật ra khỏi vỏ.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Potato',
    phonetic: '/pəˈteɪ.təʊ/',
    meaning_vi: 'Khoai tây',
    example_en: 'Baked potatoes are warm and soft inside.',
    example_vi: 'Khoai tây nướng vừa ấm áp vừa thơm mềm.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Pumpkin',
    phonetic: '/ˈpʌmp.kɪn/',
    meaning_vi: 'Bí ngô',
    example_en: 'The big orange pumpkin is smiling happily.',
    example_vi: 'Quả bí ngô to màu cam nở nụ cười tươi.',
    difficulty: 1
  },
  {
    topic_id: 'vegetables',
    word: 'Tomato',
    phonetic: '/təˈmɑː.təʊ/',
    meaning_vi: 'Cà chua',
    example_en: 'The bright red tomato is full of vitamins.',
    example_vi: 'Quả cà chua đỏ mọng chứa nhiều vitamin bổ ích.',
    difficulty: 1
  },

  // ==========================================
  // 7. Shapes (Hình Dạng) - 10 từ
  // ==========================================
  {
    topic_id: 'shapes',
    word: 'Circle',
    phonetic: '/ˈsɜː.kəl/',
    meaning_vi: 'Hình tròn',
    example_en: 'The yellow ball is a smooth round circle.',
    example_vi: 'Quả bóng vàng là một hình tròn trịa êm ái.',
    difficulty: 1
  },
  {
    topic_id: 'shapes',
    word: 'Diamond',
    phonetic: '/ˈdaɪə.mənd/',
    meaning_vi: 'Hình thoi',
    example_en: 'The colorful flying kite is diamond shaped.',
    example_vi: 'Chiếc diều bay sắc màu có hình quả trám xinh.',
    difficulty: 1
  },
  {
    topic_id: 'shapes',
    word: 'Heart',
    phonetic: '/hɑːt/',
    meaning_vi: 'Hình trái tim',
    example_en: 'A warm pink heart shows gentle love.',
    example_vi: 'Hình trái tim hồng ấm áp trao gửi yêu thương.',
    difficulty: 1
  },
  {
    topic_id: 'shapes',
    word: 'Hexagon',
    phonetic: '/ˈhek.sə.ɡən/',
    meaning_vi: 'Hình lục giác',
    example_en: 'A busy beehive cell has six sides.',
    example_vi: 'Tổ ong chăm chỉ có những ô sáu cạnh lục giác.',
    difficulty: 1
  },
  {
    topic_id: 'shapes',
    word: 'Oval',
    phonetic: '/ˈəʊ.vəl/',
    meaning_vi: 'Hình bầu dục',
    example_en: 'The sweet Easter egg has an oval shape.',
    example_vi: 'Quả trứng phục sinh có hình bầu dục xinh xắn.',
    difficulty: 1
  },
  {
    topic_id: 'shapes',
    word: 'Pentagon',
    phonetic: '/ˈpen.tə.ɡən/',
    meaning_vi: 'Hình ngũ giác',
    example_en: 'A pentagon shape has five straight sides.',
    example_vi: 'Hình ngũ giác có năm cạnh thẳng đều nhau.',
    difficulty: 1
  },
  {
    topic_id: 'shapes',
    word: 'Rectangle',
    phonetic: '/ˈrekˌtæŋ.ɡəl/',
    meaning_vi: 'Hình chữ nhật',
    example_en: 'A storybook has a neat rectangle shape.',
    example_vi: 'Quyển truyện cổ tích có hình chữ nhật ngay ngắn.',
    difficulty: 1
  },
  {
    topic_id: 'shapes',
    word: 'Square',
    phonetic: '/skweər/',
    meaning_vi: 'Hình vuông',
    example_en: 'The puzzle box has four equal square sides.',
    example_vi: 'Hộp đồ chơi ghép hình có các cạnh vuông vức.',
    difficulty: 1
  },
  {
    topic_id: 'shapes',
    word: 'Star',
    phonetic: '/stɑːr/',
    meaning_vi: 'Hình ngôi sao',
    example_en: 'The shiny yellow star twinkles at night.',
    example_vi: 'Ngôi sao vàng sáng lấp lánh trên bầu trời đêm.',
    difficulty: 1
  },
  {
    topic_id: 'shapes',
    word: 'Triangle',
    phonetic: '/ˈtraɪ.æŋ.ɡəl/',
    meaning_vi: 'Hình tam giác',
    example_en: 'A slice of cheesy pizza looks like a triangle.',
    example_vi: 'Miếng bánh pizza ngập phô mai có hình tam giác.',
    difficulty: 1
  },

  // ==========================================
  // 8. Food (Món Ăn) - 20 từ
  // ==========================================
  {
    topic_id: 'food',
    word: 'Beans',
    phonetic: '/biːnz/',
    meaning_vi: 'Hạt đậu',
    example_en: 'Warm baked beans are cozy and healthy.',
    example_vi: 'Món đậu nướng ấm áp vừa ngon vừa lành mạnh.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Bread',
    phonetic: '/bred/',
    meaning_vi: 'Bánh mì',
    example_en: 'Fresh baked bread smells so warm and cozy.',
    example_vi: 'Bánh mì mới nướng tỏa mùi thơm nức mũi.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Cake',
    phonetic: '/keɪk/',
    meaning_vi: 'Bánh kem',
    example_en: 'A birthday cake with sweet cream is delightful.',
    example_vi: 'Bánh sinh nhật kem ngọt ngào đem lại bao niềm vui.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Cereal',
    phonetic: '/ˈsɪə.ri.əl/',
    meaning_vi: 'Ngũ cốc',
    example_en: 'Crunchy cereal with milk is a great breakfast.',
    example_vi: 'Ngũ cốc giòn cùng sữa là bữa sáng tuyệt vời cho bé.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Cheese',
    phonetic: '/tʃiːz/',
    meaning_vi: 'Phô mai',
    example_en: 'Yellow cheese melts smoothly on bread.',
    example_vi: 'Miếng phô mai vàng béo ngậy tan chảy trên bánh.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Chicken',
    phonetic: '/ˈtʃɪk.ɪn/',
    meaning_vi: 'Thịt gà',
    example_en: 'Roasted chicken is savory and tasty.',
    example_vi: 'Món gà nướng vàng rụm và thơm phức.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Chocolate',
    phonetic: '/ˈtʃɒk.lət/',
    meaning_vi: 'Sô-cô-la',
    example_en: 'A small piece of sweet chocolate melts in mouth.',
    example_vi: 'Một viên sô-cô-la ngọt ngào tan đều trong miệng.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Egg',
    phonetic: '/eɡ/',
    meaning_vi: 'Quả trứng',
    example_en: 'A sunny fried egg gives morning smiles.',
    example_vi: 'Quả trứng ốp la tròn xoe chào đón buổi sáng.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Honey',
    phonetic: '/ˈhʌn.i/',
    meaning_vi: 'Mật ong',
    example_en: 'Golden sweet honey comes from busy honeybees.',
    example_vi: 'Mật ong vàng ngọt sánh từ những chú ong chăm chỉ.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Ice Cream',
    phonetic: '/ˌaɪs ˈkriːm/',
    meaning_vi: 'Kem',
    example_en: 'A cool strawberry ice cream cone brings joy.',
    example_vi: 'Cây kem dâu mát lạnh mang lại nụ cười rạng rỡ.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Lollipop',
    phonetic: '/ˈlɒl.i.pɒp/',
    meaning_vi: 'Kẹo mút',
    example_en: 'The swirly colorful lollipop is sweet.',
    example_vi: 'Cây kẹo mút xoắn ốc nhiều màu ngọt lịm.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Nuts',
    phonetic: '/nʌts/',
    meaning_vi: 'Các loại hạt',
    example_en: 'Crunchy nuts are a healthy snack.',
    example_vi: 'Những hạt ngũ cốc giòn rụm là món ăn nhẹ bổ dưỡng.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Pasta',
    phonetic: '/ˈpæs.tə/',
    meaning_vi: 'Mì ống',
    example_en: 'Warm pasta with cheese is fun to eat.',
    example_vi: 'Món mì ống sốt phô mai thơm ngon bé thích mê.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Pie',
    phonetic: '/paɪ/',
    meaning_vi: 'Bánh nướng',
    example_en: 'Apple pie with cinnamon is warm and delicious.',
    example_vi: 'Chiếc bánh táo nướng ấm áp và thơm phức vị quế.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Pizza',
    phonetic: '/ˈpiːt.sə/',
    meaning_vi: 'Bánh pizza',
    example_en: 'Cheesy pizza with tomato sauce is a favorite treat.',
    example_vi: 'Chiếc pizza phô mai sốt cà chua là món khoái khẩu.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Raisins',
    phonetic: '/ˈreɪ.zɪnz/',
    meaning_vi: 'Nho khô',
    example_en: 'Sweet little raisins make oatmeal yummy.',
    example_vi: 'Những hạt nho khô ngọt ngọt làm món cháo yến mạch thêm ngon.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Rice',
    phonetic: '/raɪs/',
    meaning_vi: 'Cơm / Gạo',
    example_en: 'Fluffy warm white rice is served in a bowl.',
    example_vi: 'Bát cơm trắng ấm dẻo thơm ngon trong bữa ăn.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Sausage',
    phonetic: '/ˈsɒs.ɪdʒ/',
    meaning_vi: 'Xúc xích',
    example_en: 'Tasty sausage sizzles gently on the pan.',
    example_vi: 'Cây xúc xích thơm lừng xèo xèo trên chảo ấm.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Spaghetti',
    phonetic: '/spəˈɡet.i/',
    meaning_vi: 'Mì Ý',
    example_en: 'Twirling long spaghetti noodles is fun.',
    example_vi: 'Cuộn từng sợi mì Ý sốt cà chua thật vui thích.',
    difficulty: 1
  },
  {
    topic_id: 'food',
    word: 'Sushi',
    phonetic: '/ˈsuː.ʃi/',
    meaning_vi: 'Món sushi',
    example_en: 'Colorful cute sushi rolls look like little art.',
    example_vi: 'Những cuộn sushi xinh xắn như tác phẩm nghệ thuật nhỏ.',
    difficulty: 1
  }
];

/**
 * Kiểm tra xem tệp media (ảnh webp / audio mp3) đã có trên đĩa cứng chưa
 */
function checkLocalMediaFile(type, topicSlug, wordSlug) {
  const ext = type === 'image' ? 'webp' : 'mp3';
  const subFolder = type === 'image' ? 'images' : 'audio';
  const filePath = path.join(baseUploadsDir, subFolder, topicSlug, `${wordSlug}.${ext}`);
  const minSize = type === 'image' ? 1024 : 500;

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.size > minSize) {
      return `/uploads/${subFolder}/${topicSlug}/${wordSlug}.${ext}`;
    }
  }
  return null;
}

export async function seedData() {
  console.log(`\n📌 1. Nạp và đồng bộ ${topics.length} Chủ Đề (Topics) vào CSDL SQLite...`);

  // 1. Chèn danh mục chủ đề
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

  for (const topic of topics) {
    insertTopic.run(topic);
    insertTopicProgress.run(topic.id);
  }
  console.log(`✅ Đã đồng bộ ${topics.length} chủ đề thành công.`);

  // 2. Chuẩn bị câu lệnh UPSERT Flashcard để nạp chính xác, tránh trùng lặp
  const upsertCard = db.prepare(`
    INSERT INTO flashcards (topic_id, word, phonetic, meaning_vi, example_en, example_vi, image_url, audio_url, difficulty)
    VALUES (@topic_id, @word, @phonetic, @meaning_vi, @example_en, @example_vi, @image_url, @audio_url, @difficulty)
    ON CONFLICT(topic_id, word COLLATE NOCASE) DO UPDATE SET
      phonetic = excluded.phonetic,
      meaning_vi = excluded.meaning_vi,
      example_en = excluded.example_en,
      example_vi = excluded.example_vi,
      image_url = excluded.image_url,
      audio_url = excluded.audio_url,
      difficulty = excluded.difficulty
  `);

  console.log(`\n📦 2. Kiểm tra tài nguyên & Nạp ${rawFlashcards.length} thẻ từ vựng vào CSDL...`);

  let reusedImageCount = 0;
  let downloadedImageCount = 0;
  let reusedAudioCount = 0;
  let downloadedAudioCount = 0;

  for (let i = 0; i < rawFlashcards.length; i++) {
    const card = rawFlashcards[i];
    const topicSlug = slugify(card.topic_id);
    const wordSlug = slugify(card.word);

    // A. Kiểm tra và tối ưu tải File Hình ảnh (.webp)
    let imageUrl = checkLocalMediaFile('image', topicSlug, wordSlug);
    if (imageUrl) {
      reusedImageCount++;
    } else {
      console.log(`[${i + 1}/${rawFlashcards.length}] 🖼️ Tải mới ảnh cho: "${card.word}" (${topicSlug})...`);
      imageUrl = await downloadAndConvertKidImage(card.word, topicSlug);
      downloadedImageCount++;
    }

    // B. Kiểm tra và tối ưu tải File Âm thanh (.mp3)
    let audioUrl = checkLocalMediaFile('audio', topicSlug, wordSlug);
    if (audioUrl) {
      reusedAudioCount++;
    } else {
      console.log(`[${i + 1}/${rawFlashcards.length}] 🔊 Sinh âm thanh TTS mới cho: "${card.word}" (${topicSlug})...`);
      audioUrl = await downloadWordAudio(card.word, topicSlug);
      downloadedAudioCount++;
    }

    // C. Lưu/Cập nhật vào SQLite
    upsertCard.run({
      ...card,
      image_url: imageUrl,
      audio_url: audioUrl
    });

    if ((i + 1) % 15 === 0 || i + 1 === rawFlashcards.length) {
      console.log(`   ⏳ Tiến độ: [${i + 1}/${rawFlashcards.length}] từ đã xử lý.`);
    }
  }

  // Dọn dẹp các bản ghi cũ không còn nằm trong danh sách chuẩn (nếu có topic lạ)
  const validTopicIds = topics.map(t => `'${t.id}'`).join(',');
  db.prepare(`DELETE FROM flashcards WHERE topic_id NOT IN (${validTopicIds})`).run();
  db.prepare(`DELETE FROM topics WHERE id NOT IN (${validTopicIds})`).run();
  db.prepare(`DELETE FROM topic_progress WHERE topic_id NOT IN (${validTopicIds})`).run();

  // 3. Báo cáo thống kê
  const totalTopicsInDb = db.prepare('SELECT count(*) as count FROM topics').get().count;
  const totalCardsInDb = db.prepare('SELECT count(*) as count FROM flashcards').get().count;
  const cardsGrouped = db.prepare('SELECT topic_id, count(*) as count FROM flashcards GROUP BY topic_id ORDER BY count DESC').all();

  console.log('\n================================================================');
  console.log('🎉 BÁO CÁO KẾT QUẢ NẠP DỮ LIỆU SEED VÀO SQLITE DATABASE');
  console.log('================================================================');
  console.log(`- Tổng số Chủ đề (Topics) trong DB:   ${totalTopicsInDb}`);
  console.log(`- Tổng số Thẻ từ vựng (Cards) trong DB: ${totalCardsInDb}`);
  console.log(`- Hình ảnh: Đã tái sử dụng ${reusedImageCount} file, Sinh mới ${downloadedImageCount} file.`);
  console.log(`- Âm thanh: Đã tái sử dụng ${reusedAudioCount} file, Sinh mới ${downloadedAudioCount} file.`);
  console.log('\nChi tiết số lượng thẻ theo từng chủ đề:');
  cardsGrouped.forEach(g => {
    console.log(`  + ${g.topic_id.padEnd(20)}: ${g.count} thẻ`);
  });
  console.log('================================================================\n');
}

seedData().catch(err => {
  console.error('❌ Lỗi khi nạp dữ liệu:', err);
  process.exit(1);
});

