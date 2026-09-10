const API_BASE = '/api/v1';

export async function fetchTopics() {
  const res = await fetch(`${API_BASE}/topics`);
  if (!res.ok) throw new Error('Không thể tải danh sách chủ đề');
  return res.json();
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
