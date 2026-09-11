const API_BASE = '/api/v1';

export async function fetchTopics() {
  const res = await fetch(`${API_BASE}/topics`);
  if (!res.ok) throw new Error('Không thể tải danh sách chủ đề');
  return res.json();
}

export async function fetchSystemConfig() {
  try {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error('Không thể tải cấu hình hệ thống');
    return res.json();
  } catch (err) {
    console.warn('Lỗi tải cấu hình, dùng mặc định:', err);
    return {
      imageAiEnabled: false,
      flashcardAiEnabled: true,
      rateLimit: 5,
      remainingQuota: 5,
      usedQuota: 0
    };
  }
}

export async function fetchTopicCards(topicId) {
  const res = await fetch(`${API_BASE}/topics/${topicId}/cards`);
  if (!res.ok) throw new Error(`Không thể tải thẻ của chủ đề ${topicId}`);
  return res.json();
}

export async function fetchUserProgress() {
  try {
    const res = await fetch(`${API_BASE}/progress`);
    if (!res.ok) throw new Error('Không thể tải tiến trình');
    return res.json();
  } catch (err) {
    console.warn('Lỗi lấy tiến trình, dùng dữ liệu offline local:', err);
    return {
      stars: parseInt(localStorage.getItem('kids_stars') || '0', 10),
      feed_count: 0,
      pet_type: 'dino',
      pet_level: 1
    };
  }
}

export async function createTopic(topicData) {
  const res = await fetch(`${API_BASE}/topics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(topicData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể tạo chủ đề mới');
  }
  return res.json();
}

export async function generateBatchCards(topicId, words, imageSource = 'ai_refined') {
  const res = await fetch(`${API_BASE}/admin/generate-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic_id: topicId,
      words: Array.isArray(words) ? words : words.split(/[,;\n]+/).map(w => w.trim()).filter(Boolean),
      image_source: imageSource
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể sinh thẻ bằng AI');
  }
  return res.json();
}

export async function regenerateCardImage(cardId, imageSource = 'ai_refined') {
  const res = await fetch(`${API_BASE}/admin/cards/${cardId}/regenerate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageSource })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể tạo lại ảnh');
  }
  return res.json();
}

export async function updateCard(cardId, cardData) {
  const res = await fetch(`${API_BASE}/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cardData)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể cập nhật thẻ');
  }
  return res.json();
}

export async function uploadCardImage(cardId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/cards/${cardId}/upload-image`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Không thể tải ảnh lên');
  }
  return res.json();
}
