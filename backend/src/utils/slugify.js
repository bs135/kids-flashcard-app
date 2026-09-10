/**
 * Hàm helper chuẩn hóa chuỗi thành slug URL an toàn
 * - Chuyển chữ thường
 * - Loại bỏ dấu tiếng Việt
 * - Thay thế khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang '-'
 * - Loại bỏ dấu gạch ngang thừa ở đầu/cuối
 * Ví dụ: "Sea Animals" -> "sea-animals", "Ice cream" -> "ice-cream"
 */
export function slugify(text) {
  if (!text) return 'general';
  
  return String(text)
    .normalize('NFD') // Tách dấu
    .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu thanh
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Thay thế ký tự không phải chữ số thành '-'
    .replace(/^-+|-+$/g, '') // Bỏ '-' ở đầu và cuối
    || 'general';
}
