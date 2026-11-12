# Linh và Bolt: Hành trình công nghiệp Đức

Website truyện tranh tương tác dạng sách lật, đã bổ sung thanh tiến độ, giao diện sáng/tối, chế độ toàn màn hình, hướng dẫn nhanh và điều khiển bằng bàn phím/cảm ứng.

## Chạy thử
Mở `index.html` bằng trình duyệt hoặc dùng Live Server trong VS Code.

## Cấu trúc
- `index.html`: nội dung từng trang truyện.
- `style.css`: giao diện, hiệu ứng chuyển trang và hoạt ảnh.
- `script.js`: điều khiển lật trang, phím tắt, vuốt, giao diện và toàn màn hình.
- `images/`: nơi đặt ảnh minh họa bổ sung.

## Điều khiển
- Nút **Trước/Tiếp** hoặc nhấp nửa trái/phải của quyển sách.
- Phím `←` / `→`, `PageUp` / `PageDown`, `Home` / `End`.
- Trên điện thoại: vuốt ngang để chuyển trang.
- Nút `◐`: đổi giao diện sáng/tối.
- Nút `⛶`: bật/tắt toàn màn hình.

## Đưa lên GitHub Pages
1. Tạo repository mới trên GitHub.
2. Tải toàn bộ file trong thư mục dự án lên repository (giữ nguyên cấu trúc).
3. Vào **Settings → Pages**.
4. Chọn **Deploy from a branch**, nhánh `main`, thư mục `/(root)`, rồi nhấn **Save**.
5. Chờ GitHub triển khai và mở đường dẫn Pages được cung cấp.

Không cần cài thư viện hay chạy máy chủ riêng. Google Fonts cần kết nối Internet; nếu mất mạng, trang vẫn chạy với font dự phòng.
