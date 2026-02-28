# Lottery Management System

A modern, feature-rich lottery management system built with Express.js, MDUI v1, and Bootstrap 5.

[中文文档](README_CN.md)

## Features

### Admin Panel
- 🎯 **Lottery Management**: Create and manage multiple lottery campaigns
- 🎁 **Prize Configuration**: 
  - Set individual prize probabilities
  - Support for range-based prizes (e.g., 10-100GB storage)
  - Inventory management with stock limits
  - Redemption codes/card keys for prizes
- 🎭 **Blacklist System**: Set fixed prizes for specific lottery codes
- 🎫 **Code Management**: Generate and manage lottery codes (UUID format)
- 📊 **Results & Analytics**: View lottery results and export to CSV
- 🔒 **Security Features**:
  - JWT authentication with 24-hour token expiry
  - Browser fingerprint tracking (FingerprintJS)
  - IP address tracking and limiting
  - Email collection option
- 🎨 **Modern UI**: 
  - MDUI v1 + Bootstrap 5 design
  - Dark/Light theme toggle
  - Responsive sidebar navigation
  - Mobile-friendly interface

### User Interface
- 🎰 **Interactive Wheel**: Smooth spinning animation using Winwheel.js
- 🏆 **Live Updates**: Real-time marquee showing recent winners
- 📱 **Mobile Optimized**: Fully responsive design with touch support
- 🎁 **Coward Option**: Guaranteed prize option for risk-averse users
- 🔐 **Anti-Fraud**: 
  - One draw per code
  - Optional fingerprint/IP restrictions
  - Email verification support

## Tech Stack

- **Backend**: Node.js + Express.js
- **Frontend**: HTML5 + JavaScript (Vanilla)
- **UI Framework**: MDUI v1 + Bootstrap 5
- **Wheel Library**: Winwheel.js
- **Authentication**: JWT (jsonwebtoken)
- **Fingerprinting**: FingerprintJS v3
- **Data Storage**: JSON files
- **Package Manager**: pnpm

## Installation

### Prerequisites
- Node.js (v14 or higher)
- pnpm (recommended) or npm

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd lottery-system
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Start the server:
```bash
pnpm start
# or
npm start
```

4. Access the application:
- User Interface: `http://localhost:3000`
- Admin Login: `http://localhost:3000/login.html`
- Admin Panel: `http://localhost:3000/admin.html`

### Default Credentials
- Username: `admin`
- Password: `admin123`

**⚠️ Important**: Change the default credentials immediately after first login!

## Project Structure

```
lottery-system/
├── data/                    # JSON data storage
│   ├── admin.json          # Admin credentials
│   ├── lotteries.json      # Lottery campaigns
│   ├── codes.json          # Lottery codes
│   └── results.json        # Draw results
├── public/                  # Frontend files
│   ├── css/
│   │   └── style.css       # Custom styles
│   ├── js/
│   │   ├── admin.js        # Admin panel logic
│   │   ├── lottery.js      # User interface logic
│   │   └── login.js        # Login page logic
│   ├── admin.html          # Admin panel
│   ├── login.html          # Login page
│   └── lottery.html        # User lottery page
├── routes/                  # API routes
│   ├── admin.js            # Admin API endpoints
│   └── lottery.js          # Lottery API endpoints
├── server.js               # Express server
├── package.json            # Dependencies
└── README.md               # Documentation
```

## API Endpoints

### Admin APIs (Requires Authentication)

#### Authentication
- `POST /api/admin/login` - Admin login
- `GET /api/admin/verify-token` - Verify JWT token

#### Lottery Management
- `GET /api/admin/lotteries` - Get all lotteries
- `POST /api/admin/lotteries` - Create lottery
- `PUT /api/admin/lotteries/:id` - Update lottery
- `DELETE /api/admin/lotteries/:id` - Delete lottery

#### Code Management
- `GET /api/admin/codes/:lotteryId` - Get lottery codes
- `POST /api/admin/codes` - Generate codes
- `DELETE /api/admin/codes/:id` - Delete code
- `POST /api/admin/codes/fixed-prize` - Set fixed prize (blacklist)

#### Results & Export
- `GET /api/admin/results/:lotteryId` - Get results
- `GET /api/admin/export/:lotteryId` - Export results CSV
- `GET /api/admin/export-codes/:lotteryId` - Export codes CSV

#### Inventory & Settings
- `GET /api/admin/inventory/:lotteryId` - Get inventory status
- `GET /api/admin/account` - Get admin account info
- `PUT /api/admin/account` - Update admin credentials

### Public APIs

- `POST /api/lottery/verify` - Verify lottery code
- `POST /api/lottery/draw` - Execute lottery draw
- `POST /api/lottery/coward` - Get coward option prize
- `GET /api/lottery/info/:lotteryId` - Get lottery info
- `GET /api/lottery/recent-results/:lotteryId` - Get recent winners

## Features in Detail

### Lottery Configuration

When creating a lottery, you can configure:

1. **Basic Info**:
   - Name and description
   - Coward option (guaranteed prize)

2. **Prize Options**:
   - Prize name
   - Winning probability (%)
   - Stock quantity (0 = unlimited)
   - Range prizes (min-max values with units)
   - Redemption codes/card keys

3. **Security Settings**:
   - Limit by browser fingerprint
   - Limit by IP address
   - Require email collection

### Blacklist (Fixed Prize) System

Admins can set fixed prizes for specific lottery codes:
- Single or batch code selection
- Choose specific prize
- For range prizes:
  - Random within original range
  - Specific value
  - Custom range

### Inventory Management

Track prize inventory in real-time:
- Total stock vs. used stock
- Remaining quantity
- Redemption code availability
- Per-lottery breakdown

### Data Export

Export lottery data to CSV:
- **Results Export**: Code, prize, timestamp, type, fingerprint, IP, email
- **Codes Export**: Code, status, creation time

## Security Features

1. **JWT Authentication**: 24-hour token expiry with automatic refresh
2. **Browser Fingerprinting**: Unique device identification using FingerprintJS
3. **IP Tracking**: request-ip middleware for accurate IP detection
4. **Rate Limiting**: One draw per code, optional fingerprint/IP restrictions
5. **Session Management**: Automatic logout on token expiration

## Customization

### Changing JWT Secret

Edit `server.js`:
```javascript
app.set('jwtSecret', 'your-secret-key-here');
```

### Modifying Theme Colors

Edit `public/admin.html` and `public/lottery.html`:
```html
<body class="mdui-theme-primary-indigo mdui-theme-accent-pink">
```

Available themes: indigo, blue, red, pink, purple, etc.

### Adjusting Wheel Size

Edit `public/js/lottery.js` in the `initWheel()` function:
```javascript
let canvasSize, outerRadius, fontSize;
if (isSmallMobile) {
  canvasSize = 280;
  outerRadius = 130;
  fontSize = 12;
}
```

## Development

### Running in Development Mode

```bash
pnpm run dev
# or
npm run dev
```

This uses nodemon for auto-restart on file changes.

### Data Storage

All data is stored in JSON files in the `data/` directory:
- Simple and portable
- No database setup required
- Easy to backup and migrate

**Note**: For production use with high traffic, consider migrating to a proper database (MongoDB, PostgreSQL, etc.)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License - feel free to use for personal or commercial projects.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on GitHub.

## Changelog

### Version 1.0.0
- Initial release
- Complete lottery management system
- Admin panel with authentication
- User lottery interface with spinning wheel
- Browser fingerprint and IP tracking
- Inventory management
- CSV export functionality
- Dark/Light theme support
- Mobile responsive design
