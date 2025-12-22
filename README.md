# Pastoria - Web3 Marketplace 🎨

A decentralized marketplace for artisans and collectors, featuring a premium visual experience and dedicated vendor/client dashboards.

![Platform Preview](https://via.placeholder.com/800x400?text=Pastoria+Web3)

## 🏗️ Architecture

- **Smart Contracts**: Solidity (Order Management, Vendor Applications, Role Based Access).
- **Frontend**: React (Vite), TailwindCSS, Ethers.js.
- **Backend**: Node.js (Express), MongoDB (for metadata caching/storage).

## 🚀 Prerequisites

1.  **Node.js**: v18+ installed.
2.  **Ganache**: For running a local blockchain (`127.0.0.1:7545`).
3.  **MetaMask**: Browser extension configured for the local network.
4.  **MongoDB**: A running MongoDB instance (or Atlas URI).

---

## 🛠️ Installation & Setup

### 1. Smart Contracts
Start your local blockchain first.
```bash
# Install dependencies
cd smart-contracts
npm install

# Compile contracts
truffle compile

# Deploy to Ganache
# Ensure Ganache is running on port 7545
truffle migrate --reset
```
*Note: After migration, copy the contract artifacts (JSON) to `frontend/src/contracts/` if not automatically done.*

### 2. Backend API
The backend handles image uploads and metadata JSON generation.
```bash
cd backend
npm install

# Create a .env file if needed, or check db.js for connection string
# Default port: 4000
npm run dev
```

### 3. Frontend Application
```bash
cd frontend
npm install

# Start the development server
# Default port: 5173
npm run dev
```

---

## 📖 Usage Guide

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 🎭 Roles
The platform separates users into three distinct roles:

1.  **Client (Collector)**
    - Can browse the public gallery.
    - Can purchase artworks using ETH.
    - Has a dedicated **"Mes Acquisitions"** page to track orders (`/acquisitions`).
    - *To join*: Connect wallet -> Click "Enregistrement Client".

2.  **Vendor (Artisan)**
    - Must apply and be approved by an Admin.
    - Has access to **"Mon Atelier"** (`/vendor`):
        - **Atelier**: Create products, view stats.
        - **Mes Œuvres**: Manage collection visibility.
        - **Commandes**: Validate and ship orders.
    - *To join*: Connect wallet -> Click "Devenir Vendeur" -> Stake ETH -> Wait for Admin approval.

3.  **Admin**
    - Access to **Console Admin** (`/admin`).
    - Approves/Rejects vendor applications.
    - Manages user roles.

---

## 🧪 Testing

1.  **Deploy Contracts**: Run `truffle migrate`.
2.  **Start Backend**: `npm run dev` in `/backend`.
3.  **Start Frontend**: `npm run dev` in `/frontend`.
4.  **Connect MetaMask**: Import a Ganache private key to MetaMask.
5.  **Flow**:
    - **Account 1 (Admin)**: Grant yourself Admin role via deployment script or checking the first account.
    - **Account 2 (Vendor)**: Apply -> (Switch to Admin) Approve -> (Switch to Vendor) Create Product.
    - **Account 3 (Client)**: Register -> Buy Product -> (Switch to Vendor) Validate & Ship -> (Switch to Client) View in "Mes Acquisitions".

## 📄 License
MIT
