import dotenv from 'dotenv';
dotenv.config();

/**
 * Service kết nối Gemini API để sinh thông tin Flashcards dành cho trẻ em:
 * Trả về: word, phonetic (IPA), meaning_vi (nghĩa đơn giản), example_en, example_vi
 */
export async function generateVocabularyData(words = []) {
  if (!Array.isArray(words) || words.length === 0) {
    return [];
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // Nếu có GEMINI_API_KEY, gọi Gemini API 2.0 / 1.5 Flash
  if (apiKey) {
    try {
      const prompt = `
Bạn là chuyên gia sư phạm tiếng Anh cho trẻ em mầm non và tiểu học.
Hãy phân tích danh sách các từ vựng tiếng Anh sau: ${JSON.stringify(words)}.

Trả về duy nhất một mảng JSON (không có markdown backticks, không kèm văn bản thừa) với cấu trúc từng phần tử:
[
  {
    "word": "từ vựng (viết hoa chữ cái đầu)",
    "phonetic": "phiên âm IPA chuẩn quốc tế (VD: /ˈel.ɪ.fənt/)",
    "meaning_vi": "nghĩa tiếng Việt ngắn gọn, dễ hiểu, thân thiện nhất cho trẻ em (VD: con voi, màu đỏ, quả chuối)",
    "example_en": "câu ví dụ tiếng Anh đơn giản, sinh động, dễ thương (tối đa 8 từ)",
    "example_vi": "dịch câu ví dụ sang tiếng Việt tự nhiên cho bé"
  }
]
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (response.ok) {
        const data = await response.json();
        const rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          const parsed = JSON.parse(rawJsonText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } else {
        console.warn(`[Gemini API] Request thất bại (HTTP ${response.status}), chuyển sang fallback engine.`);
      }
    } catch (apiError) {
      console.warn(`[Gemini API] Lỗi kết nối (${apiError.message}), chuyển sang fallback dictionary.`);
    }
  }

  // Fallback Engine thông minh (Dictionary + Smart Translation) khi chưa có API Key hoặc mạng lỗi
  return await fallbackVocabularyFetcher(words);
}

/**
 * Gemini Prompt Refiner: Tinh chỉnh mô tả bối cảnh tự nhiên, chi tiết và nghiêm ngặt
 * phục vụ cho việc sinh ảnh AI hoạt hình cho trẻ em qua Pollinations.ai.
 * Ví dụ: "Dolphin" -> "a friendly cartoon dolphin swimming happily in blue sparkling ocean water, full body, clean anatomy, smiling, simple white background, no human"
 */
export async function refineImagePromptWithGemini(word, category = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  const cleanWord = word.trim();

  if (apiKey) {
    try {
      const prompt = `
Bạn là chuyên gia thiết kế hình ảnh hoạt hình 3D Pixar/Disney dành riêng cho flashcard trẻ em.
Hãy tạo MỘT câu mô tả chi tiết bằng tiếng Anh (prompt) cho từ vựng: "${cleanWord}" (Chủ đề: "${category}").

Yêu cầu nghiêm ngặt:
1. Phong cách: cute vibrant 3D cartoon Pixar animation style for toddlers and kids.
2. Mô tả rõ hành động hoặc bối cảnh tự nhiên dễ thương (VD: "a friendly cartoon dolphin swimming gracefully in clear turquoise ocean water, full body, clean anatomy").
3. Thêm các từ khóa an toàn: "centered, full body, crisp details, simple clean white or soft pastel background, no human, no extra limbs, high quality".
4. Chỉ trả về duy nhất 1 câu prompt tiếng Anh, không thừa bất kỳ từ nào khác.
`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4
          }
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text && text.length > 10) {
          return text.replace(/["\n\r]/g, ' ');
        }
      }
    } catch (err) {
      console.warn(`[Gemini Prompt Refiner] Lỗi gọi Gemini: ${err.message}, dùng fallback template.`);
    }
  }

  // Fallback template khi không có API key
  return `a cute friendly cartoon ${cleanWord} in natural cheerful scene, 3d pixar style, colorful, full body, centered, simple clean background, no human, crisp details`;
}

/**
 * Fallback engine tự động tra IPA từ FreeDictionary và sinh câu tiếng Việt đơn giản
 */
async function fallbackVocabularyFetcher(words) {
  const results = [];

  for (const rawWord of words) {
    const wordClean = rawWord.trim();
    if (!wordClean) continue;

    let phonetic = `/${wordClean.toLowerCase()}/`;
    let meaningVi = wordClean;
    let exampleEn = `A cute ${wordClean.toLowerCase()} is here.`;
    let exampleVi = `Một bé ${wordClean} thật đáng yêu ở đây.`;

    try {
      const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(wordClean.toLowerCase())}`, {
        signal: AbortSignal.timeout(3000)
      });

      if (dictRes.ok) {
        const dictData = await dictRes.json();
        const entry = dictData[0];
        if (entry?.phonetic) {
          phonetic = entry.phonetic;
        } else if (entry?.phonetics?.length) {
          const p = entry.phonetics.find(item => item.text);
          if (p?.text) phonetic = p.text;
        }

        const definitionWithExample = entry?.meanings?.[0]?.definitions?.find(d => d.example);
        if (definitionWithExample?.example) {
          exampleEn = definitionWithExample.example;
          exampleVi = `Ví dụ với từ ${wordClean}.`;
        }
      }
    } catch (e) {
      // Bỏ qua lỗi timeout dictionary
    }

    results.push({
      word: wordClean.charAt(0).toUpperCase() + wordClean.slice(1).toLowerCase(),
      phonetic,
      meaning_vi: meaningVi,
      example_en: exampleEn,
      example_vi: exampleVi
    });
  }

  return results;
}
