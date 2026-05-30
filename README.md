# Music Project

[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-black?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?logo=socket.io&logoColor=white)](https://socket.io/)

Music Project là một ứng dụng nghe nhạc full-stack, kết hợp giữa trải nghiệm phát nhạc cá nhân và phòng nghe nhạc realtime theo nhóm.

Hệ thống được xây dựng với React ở frontend và Node.js, Express, MongoDB, Socket.io ở backend. Ứng dụng hỗ trợ đăng nhập, quản lý bài hát, playlist, yêu thích, upload media, thông báo, trang admin, và đồng bộ phát nhạc trong phòng chat realtime.

## Tổng Quan

Ứng dụng này được tách thành 2 phần:

- `music-player` - frontend React
- `music-server` - backend Express + MongoDB

Frontend chịu trách nhiệm hiển thị giao diện, điều hướng, phát nhạc và tương tác người dùng. Backend cung cấp API, xử lý xác thực, quản lý dữ liệu, lưu trữ media và đồng bộ realtime qua Socket.io.

## Tính Năng Nổi Bật

- Đăng ký, đăng nhập và quản lý phiên người dùng
- Xem trang chủ, tìm kiếm bài hát và xem chi tiết bài hát
- Thích / bỏ thích bài hát
- Tạo, cập nhật và quản lý playlist cá nhân
- Upload bài hát với audio, ảnh bìa và video tùy chọn
- Quản lý hồ sơ cá nhân và avatar
- Trang admin để duyệt bài upload, quản lý người dùng và thống kê
- Phòng nghe nhạc realtime
- Hiển thị lyric và video trong phòng nghe nhạc

## Công Nghệ Sử Dụng

### Frontend

- React 19
- React Router
- Axios
- Socket.io Client
- Recharts
- React Icons

### Backend

- Node.js
- Express 5
- MongoDB
- Mongoose
- Socket.io
- JWT
- bcryptjs
- Multer
- Cloudinary

## Cấu Trúc Dự Án

```text
Music-Project/
  music-player/
  music-server/
```


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

Tạo file `music-server/.env` với nội dung mẫu:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRE=30d
CLIENT_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
GOOGLE_CLIENT_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

Khi táº¡o OAuth Client trÃªn Google Cloud, thÃªm `Authorized redirect URI`:

- `http://localhost:5000/api/auth/google/callback`

## Chạy Ứng Dụng

Chạy backend trước:

```bash
cd music-server
npm run dev
```

Mở terminal khác và chạy frontend:

```bash
cd music-player
npm start
```


## Các Khu Vực Chính Trong Ứng Dụng

- Trang chủ
![Home Preview](./music-player/review/home.jpg)
- Chi tiết bài hát
![SongDetail Preview](./music-player/review/SongDetail.jpg)
- Kết quả tìm kiếm
![Search Preview](./music-player/review/Search.jpg)
- Favorites
![Favorite Preview](./music-player/review/Favorite.jpg)
- Playlist
![Playlist Preview](./music-player/review/PlayList.jpg)
- History
![History Preview](./music-player/review/History.jpg)
- Upload
![Upload Preview](./music-player/review/Upload1.jpg)
![Upload Preview](./music-player/review/Upload2.jpg)
![Upload Preview](./music-player/review/Upload3.jpg)
- Profile
![Profile Preview](./music-player/review/Prrofile.jpg)
- Notifications
![Noti Preview](./music-player/review/Notifications.jpg)
- Admin dashboard
![Admin Preview](./music-player/review/Admin.jpg)
- Rooms lobby
![room Preview](./music-player/review/RoomLobby.jpg)
- Room detail
![Room Preview](./music-player/review/RoomDetail.jpg)
## Tổng Quan API

Backend cung cấp các nhóm API chính sau:

- `GET /` - thông tin trạng thái server
- `/api/auth` - đăng ký, đăng nhập, lấy thông tin tài khoản, đổi mật khẩu
- `/api/songs` - xem, upload, cập nhật, thích bài hát và duyệt bài cho admin
- `/api/playlists` - CRUD playlist và quản lý bài hát trong playlist
- `/api/users` - hồ sơ cá nhân, favorites và công cụ admin cho user
- `/api/notifications` - danh sách thông báo và thao tác đánh dấu đã đọc
- `/api/trash` - khôi phục và xóa vĩnh viễn
- `/api/rooms` - danh sách phòng, tạo phòng, xác thực mật khẩu và tải tin nhắn

## Realtime Với Socket.io

Phần phòng nghe nhạc dùng Socket.io để đồng bộ trạng thái giữa các thành viên trong phòng.

### Event client gửi lên server

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

### Event server broadcast

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

## Lưu Ý Khi Triển Khai

- Backend cần MongoDB và Cloudinary hoạt động trước khi khởi động.
- Frontend dùng `proxy` tới `http://localhost:5000` trong môi trường phát triển.
- Media upload được lưu qua Cloudinary.
