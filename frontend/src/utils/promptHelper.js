export function generateQuestionPrompt(card, topicId = '') {
  if (!card || !card.word) return 'Find it!';

  const word = card.word.trim();
  const lowerWord = word.toLowerCase();
  const isColorTopic = topicId === 'colors' || card.topic_id === 'colors';

  // 1. Nhóm màu sắc
  if (isColorTopic) {
    const colorTemplates = [
      `Find ${lowerWord}!`,
      `Which one is ${lowerWord}?`,
      `Show me the color ${lowerWord}!`,
      `Can you spot ${lowerWord}?`,
      `Tap on ${lowerWord}!`
    ];
    return pickRandom(colorTemplates);
  }

  // 2. Nhóm danh từ số nhiều (kết thúc bằng s/es ngoại trừ từ đặc biệt)
  const isPlural = lowerWord.endsWith('s') && !['bus', 'glass'].includes(lowerWord);
  if (isPlural) {
    const pluralTemplates = [
      `Where are the ${lowerWord}?`,
      `Can you find the ${lowerWord}?`,
      `Look for the ${lowerWord}!`,
      `Show me the ${lowerWord}!`,
      `Point to the ${lowerWord}!`
    ];
    return pickRandom(pluralTemplates);
  }

  // 3. Danh từ số ít thông dụng
  const singularTemplates = [
    `Where is the ${lowerWord}?`,
    `Can you find the ${lowerWord}?`,
    `Look for the ${lowerWord}!`,
    `Show me the ${lowerWord}!`,
    `Tap on the ${lowerWord}?`,
    `Can you spot the ${lowerWord}?`
  ];
  return pickRandom(singularTemplates);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
