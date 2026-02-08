You’ve got it — and yes, you can absolutely host a Next.js app on Vercel for free. Their Hobby tier is perfect for this kind of project: static pages, light serverless usage, and low traffic. It’s exactly what Vercel was built for.

Here’s a clean, polished **starter README** you can drop straight into your demo repo. It’s written to impress the couple *and* keep your future‑self organized as you scale this into a reusable wedding‑site template.

---

# **README.md**

# John & Crystal Wedding Demo  
A custom wedding‑site demo built for the first Sites by Mac client. This project showcases the core features offered to couples: a beautiful, mobile‑friendly wedding website with guest photo uploads, a digital guestbook, and an easy QR‑code workflow for reception use.

This demo will be presented during the initial consultation.

---

## 🌿 **Tech Stack**
- **Next.js** (static pages + API routes)  
- **TypeScript**  
- **TailwindCSS**  
- **Supabase** (photo storage, moderation workflow)  
- **Vercel** (hosting + deployment)

This stack is chosen for speed, reliability, and easy re‑theming for future clients.

---

## 💍 **Core Features**
### **1. Welcome Page**
- Hero image (stock placeholder)
- Couple names: *John & Crystal May‑Collins*
- Wedding date (placeholder)
- Short intro paragraph

### **2. Event Details**
- Ceremony & reception times  
- Venue info + embedded map  
- Parking / accessibility notes  

### **3. Guest Photo Uploads**
- Upload form with:
  - Real Name (optional)
  - “Family Name” / nickname (optional)
  - Caption
  - Photo file input  
- Input sanitization for safety  
- Uploads stored in Supabase `pending/` folder  

### **4. Digital Guestbook**
- Captions + names displayed with approved photos  
- Emojis supported  

### **5. Moderation Workflow**
- Supabase function sends email notifications for new uploads  
- Approve/Deny links trigger Next.js API routes  
- Approved photos move to `approved/` folder  
- Gallery updates automatically  

### **6. Gallery**
- Tiled grid layout  
- Lightbox view for full‑size images  
- Displays only approved photos  

### **7. QR Code Integration**
- QR code links directly to the upload page  
- Designed for:
  - Reception signage  
  - Guestbook table  
  - Printed materials  

---

## 🎨 **Color Story Options**
Three palettes prepared for the couple to choose from (cold‑spring Ohio friendly):

### **1. Dusty Blue + Slate + Cream**
- `#A8C1D1`, `#6C7A89`, `#F7F4ED`, `#2F3A45`

### **2. Mauve + Rosewood + Champagne**
- `#C9A9A6`, `#8B5E6A`, `#F7E7CE`, `#B8A39A`

### **3. Sage + Ivory + Gold**
- `#A3B18A`, `#6B705C`, `#F8F5F0`, `#D4AF37`

These will be used to theme the demo site and help the couple visualize their wedding aesthetic.

---

## 🌐 **Domain Strategy**
To keep costs predictable:

### **Year 1 (Wedding Year)**
- Couple receives a custom domain (e.g., `john-and-crystal.love`)  
- Cloudflare Email Routing handles:
  - `photos@domain`
  - `uploads@domain`

### **After Year 1**
Couple chooses:
1. **Renew the domain themselves**, or  
2. **Free archival hosting** at:  
   `sitesbymac.dev/weddings/johnandcrystal`

This keeps the site accessible without ongoing domain costs.

---

## 🚀 **Deployment**
This demo is deployed on **Vercel (Hobby tier)** — free, fast, and ideal for static wedding sites with light serverless usage.

---

## 📁 **Project Structure**
```
/app
  /gallery
  /upload
  /api
    approve.ts
    deny.ts
/components
/lib
/styles
/supabase
/public
```

---

## 📅 **Timeline**
- **Demo ready by:** Friday  
- **Consultation:** TBD  
- **Final delivery:** After design approval and content handoff  

---

## ✨ **Future Enhancements**
- Admin dashboard for moderation  
- Theme switcher for rapid re‑branding  
- Optional RSVP form  
- Optional registry integration  
- Optional photographer upload portal  
