# Music Project

Music Project là một ứng dụng nghe nhạc full-stack được xây dựng với React, Node.js, Express, MongoDB và Socket.io.

Ứng dụng hỗ trợ phát nhạc, upload bài hát, quản lý playlist, yêu thích bài hát, thông báo, duyệt nội dung cho admin, và phòng nghe nhạc realtime với đồng bộ phát nhạc cùng chat.

## Tính Năng

- Đăng ký, đăng nhập, xem và cập nhật hồ sơ cá nhân
- Đổi mật khẩu
- Xem danh sách bài hát, tìm kiếm và xem chi tiết bài hát
- Thích / bỏ thích bài hát
- Tạo và quản lý playlist cá nhân
- Upload bài hát với file audio, ảnh bìa và video tùy chọn
- Xem thông báo người dùng
- Trang admin để duyệt bài upload và quản lý người dùng
- Phòng nghe nhạc realtime với chat, hàng chờ, quyền host và đồng bộ player
- Hiển thị lyric và video trong phòng nghe nhạc

## Công Nghệ Sử Dụng

- Frontend: React 19, React Router, Axios, Socket.io Client, Recharts
- Backend: Node.js, Express 5, MongoDB, Mongoose, Socket.io
- Xác thực: JWT, bcryptjs
- Upload: Multer, Cloudinary

## Cấu Trúc Dự Án

```text
Music-Project/
  music-player/   # Frontend React
  music-server/   # Backend Express + MongoDB
```

### Thư Mục Frontend

- `src/pages` - các trang chính
- `src/components` - component tái sử dụng
- `src/context` - state cho auth, music, notification
- `src/api` - các lớp gọi API
- `src/hooks` - custom hooks
- `src/styles` - style cho trang và component

### Thư Mục Backend

- `controllers` - xử lý request
- `routes` - định nghĩa API routes
- `models` - mô hình MongoDB
- `middleware` - middleware xác thực và upload
- `socket` - logic Socket.io cho room
- `config` - cấu hình database và Cloudinary
- `jobs` - tác vụ chạy nền

## Cài Đặt

### 1. Clone repository

```bash
git clone <your-repo-url>
cd Music-Project
```

### 2. Cài dependencies

Frontend:

```bash
cd music-player
npm install
```

Backend:

```bash
cd ../music-server
npm install
```

## Biến Môi Trường

### Backend

Tạo file `music-server/.env` với nội dung:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend

Frontend có thể chạy với giá trị mặc định trong code, nhưng bạn có thể override bằng:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Chạy Dự Án

Khởi động backend trước:

```bash
cd music-server
npm run dev
```

Mở một terminal khác và chạy frontend:

```bash
cd music-player
npm start
```

Mặc định frontend chạy tại `http://localhost:3000` và backend chạy tại `http://localhost:5000`.

## Các Trang Chính

- Home
- Chi tiết bài hát
- Kết quả tìm kiếm
- Favorites
- Playlist
- My playlists
- Upload
- Profile
- Notifications
- Admin dashboard
- Rooms lobby và room detail

## Tổng Quan API

Backend cung cấp các nhóm route chính:

- `GET /` - endpoint kiểm tra trạng thái / thông tin server
- `/api/auth` - đăng ký, đăng nhập, lấy thông tin user, đổi mật khẩu
- `/api/songs` - xem bài hát, upload, cập nhật, thích bài, duyệt bài cho admin
- `/api/playlists` - CRUD playlist và quản lý bài hát trong playlist
- `/api/users` - hồ sơ cá nhân, favorites, công cụ admin cho user
- `/api/notifications` - danh sách thông báo và đánh dấu đã đọc
- `/api/trash` - khôi phục và xóa vĩnh viễn
- `/api/rooms` - danh sách phòng, tạo phòng, xác thực mật khẩu, tin nhắn

## Tính Năng Realtime

Socket.io được dùng cho phòng nghe nhạc và đồng bộ trạng thái phát nhạc.

Các event phổ biến:

- `room:join`
- `room:leave`
- `room:play-pause`
- `room:seek`
- `room:volume-change`
- `room:change-song`
- `room:next-song`
- `room:prev-song`
- `room:add-queue`
- `room:remove-queue`
- `room:send-message`
- `room:kick-user`
- `room:transfer-host`
- `room:close`
- `room:request-sync`

Các event server broadcast:

- `room:init`
- `room:user-joined`
- `room:user-left`
- `room:song-changed`
- `room:player-sync`
- `room:queue-updated`
- `room:new-message`
- `room:host-changed`
- `room:kicked`
- `room:closed`
- `room:error`

## Lưu Ý

- Frontend dùng proxy tới `http://localhost:5000` trong môi trường phát triển.
- Media upload được lưu qua Cloudinary và được backend phục vụ khi cần.
- Không commit secret thật trong file `.env`.
- Backend cần MongoDB và Cloudinary hoạt động trước khi chạy.

## Scripts Có Sẵn

### Frontend

```bash
npm start
npm run build
npm test
```

### Backend

```bash
npm run dev
npm start
```

## License

Dự án hiện chưa khai báo license.
