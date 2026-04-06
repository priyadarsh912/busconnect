# 🚌 BusConnect — Smart Urban Transit & Real-Time Tracking

**BusConnect** is a high-performance, production-ready web application for urban transit management, featuring real-time bus tracking, smart seat booking, and high-accuracy geo-querying.

Built with **React (Vite)**, **Firebase (Firestore)**, and **Leaflet Maps**, it empowers users to find and track nearby buses with sub-second precision.

---

## 🌟 Key Features

- **📍 Real-Time Bus Tracking**: Continuous live synchronization with driver GPS locations stored in Firestore.
- **🛰️ Smart Geo-Querying**: Efficiently finds buses within 3–15 km using geohash-based spatial queries for minimal database overhead.
- **🛣️ Interactive Highway Radar**: A premium visualization of both simulated and live buses, overlaid with distance and speed telemetry.
- **🎫 Seamless Ticket Booking**: End-to-end booking flow including route selection, seat picking, and simulated payment.
- **📱 Responsive UI/UX**: Designed for mobile-first experience with smooth micro-animations and a sleek dark-themed analytics dashboard.

---

## 🛠️ Technology Stack

- **Frontend**: [React 18](https://reactjs.org/), [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/), [Framer Motion](https://www.framer.com/motion/)
- **Backend / DB**: [Firebase Firestore](https://firebase.google.com/products/firestore), [Firebase Auth](https://firebase.google.com/products/auth)
- **Maps**: [Leaflet](https://leafletjs.com/), [React Leaflet](https://react-leaflet.js.org/)
- **Geo-Querying**: [geofire-common](https://www.npmjs.com/package/geofire-common)

---

## 🚀 Getting Started

### 📋 Prerequisites

- [Node.js](https://nodejs.org/) (v16.0 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A [Firebase Project](https://console.firebase.google.com/)

### 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/priyadarsh912/busconnect.git
   cd busconnect
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Rename `.env.example` to `.env` and populate it with your Firebase configuration.
   ```bash
   cp .env.example .env
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

---

## 🏗️ Architecture Design

- **NearbyBusService**: A custom geo-query engine that fans out bounded Firestore queries to find buses in the vicinity without scanning the entire database.
- **LiveRadarWrapper**: A non-intrusive HOC (Higher Order Component) that injects real-time Firestore markers onto existing Leaflet map instances through cross-component instance tracking.

---

## 📄 License

This project is curated for the **BusConnect** transit system. All rights reserved.

---

> [!TIP]
> This repository is pre-configured for **production build and deployment**. Run `npm run build` to generate the high-performance bundle in the `dist` directory.
