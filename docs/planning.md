# John & Crystal Wedding Site — Planning Document  
**Project Type:** Client‑facing demo for Sites by Mac  
**Tech Stack:** Next.js (static), TypeScript, TailwindCSS, Supabase (storage + functions)  
**Domain Strategy:** 1‑year custom domain → archival under `sitesbymac.dev/weddings/...`  

---

## **1. Project Goals**
- Build a polished, reusable wedding‑site template for Client #1 (John & Crystal May‑Collins).  
- Showcase the core differentiator: **guest photo uploads + digital guestbook**, accessible via QR code.  
- Create a workflow that can be reused for future clients with minimal changes (copy, colors, domain).  
- Keep costs predictable by offering **1 year of custom domain**, then migrating to a subpath under `sitesbymac.dev`.  

---

## **2. Core Features**
### **2.1 Public Pages**
- **Home / Welcome**
  - Hero image (stock placeholder)
  - Couple names: *John & Crystal May‑Collins*
  - Wedding date (placeholder)
  - Short intro paragraph

- **Event Details**
  - Ceremony + reception times
  - Venue info + embedded map
  - Parking / accessibility notes

- **Photo Upload + Digital Guestbook**
  - Upload form:
    - Real Name (optional)
    - "Family Name" / nickname (optional)
    - Caption
    - Photo file input
  - Input sanitization:
    - Block `<` and `>`
    - Escape output (`&`, `"`, `'`)
    - Max length limits
  - Emojis allowed
  - Upload → Supabase `pending/` folder

- **Gallery**
  - Grid layout (Tailwind)
  - Lightbox view for full‑size images
  - Displays only approved photos from Supabase `approved/` folder

- **Registry / Gifts**
  - Placeholder links

- **Contact / RSVP**
  - Simple form or placeholder

---

## **3. QR Code Integration**
- Generate QR code linking to `/upload` page.
- Include QR code on:
  - Demo site
  - "Under construction" page
  - Printable signage for guestbook table
- Print version can stylize domain with CamelCase (e.g., **JohnAndCrystal.love**) even though DNS is lowercase.

---

## **4. Moderation Workflow**
### **4.1 Upload Flow**
1. Guest uploads photo + names + caption  
2. File stored in Supabase bucket:  
   - `weddings/john-crystal/pending/`  
3. Supabase function sends moderation email:
   - Thumbnail
   - Metadata
   - Approve link → `/api/approve?id=...`
   - Deny link → `/api/deny?id=...`

### **4.2 Approve/Deny API Routes**
- **`/api/approve`**
  - Moves file from `pending/` → `approved/`
  - Updates DB row (if used)
  - Returns simple "Approved" page

- **`/api/deny`**
  - Deletes or archives file
  - Returns "Denied" page

### **4.3 Admin Dashboard (optional future enhancement)**
- Login‑protected page listing pending uploads
- Approve/deny buttons
- Metadata view

---

## **5. Domain Strategy**
### **5.1 Year 1 (Wedding Year)**
- Register a custom domain (likely `.love` or `.wedding` since they're cheapest on Cloudflare).
- Set up Cloudflare Email Routing:
  - `photos@domain`
  - `uploads@domain`
  - `hello@domain`
- Point DNS to Vercel.

### **5.2 After Year 1**
Offer two paths:

**A. Couple renews domain themselves**  
- Transfer domain to them  
- They pay registrar directly  

**B. Free archival hosting**  
- Migrate site to:  
  `sitesbymac.dev/weddings/johnandcrystal`  
- Gallery + guestbook remain accessible  
- No ongoing domain cost for you  

---

## **6. Domain Options (Available to Check on Cloudflare)**
These are unique enough to be almost certainly available:

### **.love (cheapest today)**
- `john-and-crystal.love`
- `johnandcrystal.love`
- `maycollins.love`

### **.wedding**
- `john-and-crystal.wedding`
- `johnandcrystal.wedding`
- `may-collins.wedding`

### **.family** (currently ~$30/yr)
- `may-collins.family`
- `john-and-crystal.family`

### **.forever** (exists but expensive)
- `johnandcrystal.forever`

---

## **7. Tech Stack Notes**
### **7.1 Next.js + Tailwind**
- Static export for all public pages
- Reusable components for:
  - Hero section
  - Gallery
  - Upload form
  - QR code block
- Theme tokens for quick recoloring per client

### **7.2 Supabase**
- Storage buckets:
  - `pending/`
  - `approved/`
- Functions:
  - `sendModerationEmail`
  - `approvePhoto`
  - `denyPhoto`
- RLS optional for future multi‑client scaling

---

## **8. Reusability for Future Clients**
- Swap:
  - Names
  - Colors
  - Photos
  - Copy
  - Domain
- Reuse:
  - Upload flow
  - Moderation system
  - Gallery
  - QR code generator
  - Page structure

This becomes the foundation for a scalable wedding‑site offering.

---

## **9. Next Steps**
- [ ] Create new Next.js project  
- [ ] Set up Tailwind  
- [ ] Build page skeletons  
- [ ] Integrate Supabase client  
- [ ] Create storage buckets  
- [ ] Implement upload form  
- [ ] Implement moderation email function  
- [ ] Build approve/deny API routes  
- [ ] Build gallery view  
- [ ] Generate QR code  
- [ ] Register domain (1‑year plan)  
- [ ] Prepare demo for consultation  
