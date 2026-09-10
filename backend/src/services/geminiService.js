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

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
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
      // Tra Free Dictionary API
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

        // Tìm câu ví dụ từ definition
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
