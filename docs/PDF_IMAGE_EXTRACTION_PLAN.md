# Kế hoạch chi tiết: Trích xuất hình ảnh từ PDF Flashcard (Phiên bản Cập nhật 2)

Dựa trên các thông tin và ràng buộc mới, quy trình sẽ được tinh chỉnh để chạy tự động bằng Python thông qua `uv`, tận dụng phương pháp trích xuất ảnh nhúng (Embedded Images) kết hợp xử lý hình ảnh và AI xóa nền.

## 1. Mục tiêu và Ràng buộc
- **Nguồn:** Các file PDF chứa thẻ flashcard (1 ảnh/trang, không bị chia tách, có text dạng raster dính vào ảnh, hình có nền trắng/bóng đổ nhẹ).
- **Yêu cầu đầu ra:** Hình vuông (max 500x500), định dạng WebP và PNG, nền trong suốt. Lấy được từ vựng (word) trên ảnh để đặt tên file.
- **Cấu trúc thư mục:**
  - Input: `.resources/input/`
  - Output trích xuất thô: `.resources/output/<tên_file_pdf>/extracted/<number_of_image>.png`
  - Output đã chuẩn hóa (có word, đã cắt bỏ chữ): `.resources/output/<tên_file_pdf>/standardize/<word>.[png|webp]`
  - Output tách nền (trong suốt, hình vuông, max 500x500): `.resources/output/<tên_file_pdf>/transparent/<word>.[png|webp]`
- **Công cụ:** Sử dụng Python Script chạy qua `uv` (uv run), đặt tại `scripts/extract_pdf_flashcards.py`. Tận dụng `rembg` để tách nền (tham khảo từ `scripts/process_seed_images.py`).

## 2. Các phương án kỹ thuật được sử dụng
- **Quản lý package:** Sử dụng `uv` để cài đặt và chạy các thư viện Python một cách nhanh chóng.
- **Trích xuất ảnh (Extraction):** Sử dụng `PyMuPDF` (thư viện `fitz`). Duyệt qua từng trang PDF, lấy ảnh nhúng và lọc bỏ những ảnh có kích thước <= 300x300 pixel (để bỏ qua logo, icon nhỏ).
- **Trích xuất từ vựng (OCR):** Do chữ dính vào hình, cần dùng AI/OCR. Dùng `Tesseract OCR` (via `pytesseract`) quét phần hình ảnh để lấy chữ (word). 
- **Xử lý ảnh - Làm sạch (Cleaning):** Dùng `Pillow (PIL)` hoặc `OpenCV`. Cắt (crop) loại bỏ vùng chứa chữ ra khỏi bức hình sau khi đã OCR thành công.
- **Xóa nền (Background Removal):** Dùng thư viện `rembg` (tương tự như script `process_seed_images.py` hiện có trong dự án) để tự động nhận diện vật thể chính, xóa bỏ phông trắng và bóng đổ, trả về nền trong suốt.
- **Xử lý ảnh - Chuẩn hóa (Square & Resize):** Thực hiện SAU KHI xóa nền. Thêm lề (padding) để ảnh thành hình vuông (1:1), nếu lớn hơn 500x500 thì resize về 500x500.

## 3. Kế hoạch / Các bước thực hiện

### Bước 1: Chuẩn bị môi trường
- Sử dụng `uv` để quản lý dependencies. Script sẽ tự động import qua uv hoặc có thể chạy lệnh:
  ```powershell
  uv pip install PyMuPDF pytesseract Pillow rembg
  ```
- Cài đặt Tesseract OCR Engine trên hệ điều hành (nếu chưa có).
- Khởi tạo thư mục input `.resources/input` và đặt các file PDF mẫu vào.

### Bước 2: Viết Python Script (`scripts/extract_pdf_flashcards.py`)
Script sẽ bao gồm các Pipeline sau:
1. **Pipeline 1: Quét và Trích xuất (Extract)**
   - Đọc từng file PDF trong `.resources/input`.
   - Lưu ảnh > 300x300 vào `.resources/output/<tên_file_pdf>/extracted/`.
2. **Pipeline 2: OCR và Làm sạch chữ (Standardize)**
   - Đọc ảnh từ thư mục `extracted/`.
   - Chạy `pytesseract` để lấy từ vựng (word). Làm sạch chuỗi kí tự.
   - Cắt (crop) loại bỏ vùng chứa chữ của hình (không làm vuông, không resize).
   - Lưu kết quả vào `.resources/output/<tên_file_pdf>/standardize/<word>.png` VÀ `.resources/output/<tên_file_pdf>/standardize/<word>.webp`.
3. **Pipeline 3: Xóa nền và Chuẩn hóa (Transparent)**
   - Khởi tạo session `rembg.new_session("u2net")`.
   - Chạy `rembg.remove(img)` đối với các ảnh PNG trong thư mục `standardize`.
   - Thêm padding để ảnh thành hình vuông trong suốt.
   - Kiểm tra kích thước, nếu > 500x500 thì resize về 500x500.
   - Lưu kết quả vào `.resources/output/<tên_file_pdf>/transparent/<word>.png` VÀ `.resources/output/<tên_file_pdf>/transparent/<word>.webp`.

### Bước 3: Chạy thử và Tinh chỉnh (Test & Refine)
- Chạy script thông qua `uv run scripts/extract_pdf_flashcards.py` với 1 file PDF mẫu.
- Kiểm tra các rủi ro:
  - Việc cắt bỏ phần chữ ở Pipeline 2 có vô tình cắt phạm vào vật thể không.
  - OCR nhận diện sai từ vựng.

### Bước 4: Chạy hàng loạt (Batch Execution)
- Khi chất lượng đã đảm bảo, chạy tự động cho tất cả các file PDF còn lại.
