import dotenv from 'dotenv';
dotenv.config();

/**
 * Service connecting to Gemini API to generate kid-tailored flashcard metadata:
 * Returns: word, phonetic (IPA), meaning_vi (simple definition), example_en, example_vi
 */
export async function generateVocabularyData(words = []) {
  if (!Array.isArray(words) || words.length === 0) {
    return [];
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // If GEMINI_API_KEY is present, query Gemini API
  if (apiKey) {
    try {
      const prompt = `
You are an expert pedagogical English instructor for preschool and elementary school children.
Analyze the following English vocabulary word list: ${JSON.stringify(words)}.

Return strictly a JSON array (without markdown backticks or redundant commentary) following this structure:
[
  {
    "word": "Vocabulary word (Capitalized first letter)",
    "phonetic": "Standard international IPA phonetics (e.g., /ˈel.ɪ.fənt/)",
    "meaning_vi": "Concise, simple, kid-friendly Vietnamese definition (e.g., con voi, màu đỏ, quả chuối)",
    "example_en": "Simple, charming, vivid English example sentence (max 8 words)",
    "example_vi": "Natural Vietnamese translation of the example sentence for children"
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
        console.warn(`[Gemini API] Request failed (HTTP ${response.status}), falling back to offline dictionary engine.`);
      }
    } catch (apiError) {
      console.warn(`[Gemini API] Connection error (${apiError.message}), falling back to dictionary engine.`);
    }
  }

  // Fallback Engine (FreeDictionary + Smart Translation) when API key is missing or offline
  return await fallbackVocabularyFetcher(words);
}

/**
 * Gemini Prompt Refiner: Refines natural, detailed, and strict context descriptions
 * for child cartoon AI image generation via Pollinations.ai.
 * Example: "Dolphin" -> "a friendly cartoon dolphin swimming happily in blue sparkling ocean water, full body, clean anatomy, smiling, simple white background, no human"
 */
export async function refineImagePromptWithGemini(word, category = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  const cleanWord = word.trim();

  if (apiKey) {
    try {
      const prompt = `
You are a 3D Pixar/Disney style cartoon graphic designer specializing in educational flashcards for children.
Create ONE detailed English prompt for vocabulary word: "${cleanWord}" (Topic: "${category}").

Strict requirements:
1. Style: cute vibrant 3D cartoon Pixar animation style for toddlers and kids.
2. Clearly depict natural action or charming context (e.g. "a friendly cartoon dolphin swimming gracefully in clear turquoise ocean water, full body, clean anatomy").
3. Safety keywords: "centered, full body, crisp details, simple clean white or soft pastel background, no human, no extra limbs, high quality".
4. Output strictly one single English prompt sentence without extra words.
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
      console.warn(`[Gemini Prompt Refiner] Gemini call failed: ${err.message}, using fallback template.`);
    }
  }

  // Fallback template when API key is absent
  return `a cute friendly cartoon ${cleanWord} in natural cheerful scene, 3d pixar style, colorful, full body, centered, simple clean background, no human, crisp details`;
}

/**
 * Fallback engine querying IPA from FreeDictionary and generating simple Vietnamese sentences
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
      // Silently skip dictionary timeout errors
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
