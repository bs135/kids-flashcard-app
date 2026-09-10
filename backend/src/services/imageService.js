/**
 * Service chuẩn hóa URL và prompt sinh ảnh hoạt hình cho trẻ em
 * Sử dụng Pollinations.ai (miễn phí, không cần API key, chất lượng cao)
 */

export function generateKidImageUrl(word, category = '') {
  // Chuẩn hóa prompt: tập trung vào đúng đồ vật/con vật, phong cách hoạt hình cute cho trẻ em, loại bỏ người
  let promptText = '';

  const lowerWord = word.trim().toLowerCase();

  if (category === 'colors' || ['red', 'blue', 'yellow', 'green', 'pink', 'orange', 'purple', 'brown', 'black', 'white'].includes(lowerWord)) {
    // Với màu sắc: vẽ vệt màu/màu sơn hoạt hình kèm một vật thể biểu trưng quen thuộc với trẻ
    const colorItems = {
      red: 'red apple and red paint splash',
      blue: 'blue ocean water drop and blue sky cloud',
      yellow: 'bright yellow smiling sun and yellow banana',
      green: 'green leaf and cute green frog',
      pink: 'sweet pink candy and pink flower',
      orange: 'juicy orange fruit and orange juice',
      purple: 'purple grapes cluster',
      brown: 'brown cute teddy bear',
      black: 'cute black hat',
      white: 'fluffy white cloud'
    };
    const item = colorItems[lowerWord] || `${lowerWord} color paint splash`;
    promptText = `simple ${item}, vibrant ${lowerWord} color, cute cartoon illustration for kids, clear object, simple white background, no human`;
  } else {
    // Với các từ vựng thông thường (động vật, đồ vật, hoa quả)
    promptText = `cute cartoon ${lowerWord} illustration for kids, 3d pixar style, colorful, clear single object, centered, simple white background, no human, high quality`;
  }

  const encodedPrompt = encodeURIComponent(promptText);
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=400&height=400&nologo=true&seed=42`;
}
