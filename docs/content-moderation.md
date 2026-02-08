Here’s a clean, repo‑ready **`content-moderation.md`** that captures everything we’ve mapped out — the pipeline, the buckets, the couple‑review workflow, and your “live support” plan. It’s written to be clear, professional, and portfolio‑friendly, without getting bogged down in implementation details.

---

# **content-moderation.md**

# Content Moderation System  
This document outlines the moderation workflow for guest‑uploaded photos on the wedding site. The goal is to keep the gallery safe, respectful, and drama‑free while preserving the couple’s control over their own memories. The system combines automated triage, human review, and optional couple‑approval for borderline cases.

---

## **1. Moderation Goals**
- Protect the couple and their families from inappropriate or disruptive uploads.  
- Avoid over‑censoring or making assumptions about family dynamics.  
- Provide a fast workflow for “live support” on the night of the wedding.  
- Demonstrate a real, production‑minded moderation pipeline for portfolio purposes.  

---

## **2. Upload Flow Overview**
1. Guest uploads a photo via the `/upload` page.  
2. The file is stored in Supabase under `pending/`.  
3. An automated moderation check assigns a **risk score**.  
4. The upload is placed into one of three review buckets:  
   - **Probably Good**  
   - **Questionable**  
   - **Likely Bad**  
5. The admin dashboard displays these buckets for manual review.  
6. Admin can approve, reject, or escalate to the couple for a judgment call.  
7. Approved photos move to `approved/` and appear in the public gallery.  

---

## **3. Automated Triage (AI‑Assisted)**
A lightweight vision model evaluates each upload and returns a safety score. This is used only for **sorting**, not for final decisions.

### **Risk Buckets**
- **0–20% risk → Probably Good**  
  - Typical wedding photos  
  - Safe to batch‑approve  
- **20–60% risk → Questionable**  
  - Silly poses  
  - Ambiguous content  
  - Photos that might be fine but need a human glance  
- **60%+ risk → Likely Bad**  
  - Explicit content  
  - Inappropriate behavior  
  - Anything that could cause family conflict  

No photo is ever auto‑published.  
No photo is ever auto‑deleted without human review.

---

## **4. Admin Dashboard**
The dashboard is the central moderation tool. It displays three columns:

```
---------------------------------------------------------------
|   Likely Bad   |   Questionable   |   Probably Good         |
---------------------------------------------------------------
| [thumb] [thumb] [thumb] [thumb] [thumb] [thumb] [thumb] ... |
---------------------------------------------------------------
```

### **Available Actions**
- Select individual photos via checkboxes  
- Batch‑approve selected  
- Batch‑reject selected  
- Approve all in a column  
- Reject all in a column  
- **Send to Couple for Review** (for borderline cases)  
- Click thumbnail → full preview  

This setup allows rapid triage during the reception and cleanup afterward.

---

## **5. Couple Review Workflow**
Some photos require context only the couple has. For these cases, the admin can escalate the upload.

### **“Send to Couple for Review”**
Triggers an email to the newlyweds containing:
- Thumbnail  
- Caption  
- Uploader name (if provided)  
- Optional admin note  
- Two buttons: **Approve** / **Reject**

### **Couple Decision**
- Clicking **Approve** moves the photo to `approved/`.  
- Clicking **Reject** moves it to `rejected/`.  

This ensures:
- The couple stays in control  
- No assumptions are made about family humor or boundaries  
- The admin avoids being the “fun police”  

---

## **6. Live Support Mode (Day‑Of Workflow)**
If the admin is available during or after the reception, the workflow is optimized for speed:

1. Approve all **Probably Good** photos.  
2. Skim **Questionable** photos and approve/reject quickly.  
3. Escalate 1–3 borderline cases to the couple.  
4. Leave **Likely Bad** for later review.  

This allows the gallery to be **90% complete before the next morning**, which is a major delight moment for the couple.

---

## **7. Storage Structure**
Supabase buckets are organized by wedding slug:

```
/weddings/{slug}/pending/
/weddings/{slug}/approved/
/weddings/{slug}/rejected/
/weddings/{slug}/flagged/ (optional)
```

Metadata is stored in a table for:
- risk score  
- bucket  
- caption  
- uploader name  
- timestamps  
- couple decision (if applicable)  

---

## **8. Safety Principles**
- AI is used only for sorting, never for final decisions.  
- No explicit content is ever shown to the couple without their consent.  
- The admin acts as a buffer to protect the couple from unwanted surprises.  
- The couple has final say on borderline content.  
- Nothing is auto‑published.  

---

## **9. Portfolio Value**
This moderation system demonstrates:
- real‑world UGC handling  
- AI‑assisted triage  
- human‑in‑the‑loop design  
- batch operations  
- admin tooling  
- safe content workflows  
- thoughtful UX for sensitive contexts  
