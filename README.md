# 🎤 Party Karaoke (Dual-Phone / Multi-Device)

Usa ka modernong Karaoke web application nga gidisenyo para sa duha (o daghan pa) ka phone o device:
- **Phone 1 (Screen Mode):** Nagpatukar sa YouTube Karaoke video, lyrics, Up Next banner, ug nagpakita sa QR code.
- **Phone 2 (Remote Mode):** Pangita og kanta, i-reserba (queue), i-save sa Favorites, ug i-control ang player (Play, Pause, Skip, Restart).

---

## 🚀 Giunsa Pag-Start (Quick Start)

1. Siguroa nga naa ka sa folder:
   ```bash
   cd /Users/oninninoonin/Downloads/apps/karaoke2
   ```

2. Ipadagan ang server:
   ```bash
   npm start
   ```

3. Mogawas sa terminal ang links:
   - **Local Computer:** `http://localhost:3000`
   - **Phones on Same Wi-Fi:** `http://<IMONG-WIFI-IP>:3000` (pananglitan: `http://10.0.0.172:3000`)

---

## 📱 Giunsa Paggamit sa Duha ka Phone

### 1. Phone 1 (Screen / Lyrics Display)
1. I-connect ang Phone 1 sa imong Wi-Fi.
2. I-open ang browser (Safari o Chrome) ug adtoa ang URL (e.g. `http://10.0.0.172:3000`).
3. Pili-a ang **"Phone 1: Screen Mode"**.
4. Ibutang ang phone sa atubangan (o i-connect sa TV / Smart TV / Tablet).
5. Mogawas dayon ang **QR Code** ug Room Code (e.g. `SING`).

### 2. Phone 2 (Remote Controller)
1. Gamit ang Camera sa Phone 2, **i-scan lang ang QR Code** nga naa sa screen sa Phone 1.
2. Awtomatiko kini nga mo-open sa **Remote Mode** ug mo-connect dayon sa room!
3. Pwede ka mag-type bisan **1 ka pulong** (e.g. `"my way"`, `"queen"`, `"gitara"`, `"parokya"`).
4. Awtomatiko kining mo-filter og **Karaoke / Videoke / Minus One** versions.
5. I-tap ang **"Queue"** o **"Play Next"** aron mo-play o ma-add sa listahan.

---

## ✨ Mga Pangunang Features

- 🔍 **Automatic Videoke Filter:** Bisan 1 word ra imong i-type, awtomatiko kining dugangan og karaoke filter aron walay standard interviews o music videos nga mogawas.
- ⚡ **Real-time WebSockets (Socket.io):** Inig pindot nimo og Queue sa Phone 2, sulod sa split-second makita dayon sa Phone 1.
- ⏭️ **Auto-Play Next:** Inig human sa kanta sa Phone 1, awtomatikong mo-play dayon ang sunod nga kanta sa queue.
- ❤️ **Favorites Tab:** I-tap ang heart (❤️) sa kanta aron ma-save sa imong phone. Sunod nimong kanta, 1-tap nalang aron ma-queue.
- 🌟 **Songbook Tab:** Pre-curated list sa mga sikat nga OPM classics (Eraserheads, Aegis, Parokya, Ben&Ben) ug all-time videoke anthems (My Way, Total Eclipse, Queen).
- 👥 **Multi-Singer Support:** Bisan pila ka phone o higala pwede magdungan og scan sa QR code para mag-queue og kanta sa samang higayon!

