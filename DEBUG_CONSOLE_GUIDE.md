# 🔍 Debug Console Guide - Gurbani Projector

## Console Logging Ab Active Hai!

Maine detailed logging add kar di hai. Ab aap browser console mein **exactly** dekh sakte ho ki kya ho raha hai.

---

## 📋 Console Kaise Kholein?

### Chrome/Edge:
1. Browser mein `F12` press karein
2. Ya **Right Click → Inspect → Console** tab

### Console Clear Karein:
- Type karein: `clear()` aur Enter
- Ya click karein: 🚫 icon (top-left of console)

---

## 🎯 Kya Kya Dikhega Console Mein?

### 1. Jab Aap Bolte Ho:
```
🎤 [TRANSCRIPT] Raw from browser: tu mera rakha
📝 [NEW SPEECH] Extracted chunk: tu mera rakha
```
**Matlab:** Browser ne aapki awaaz suni!

### 2. Agar Text Bahut Chhota Hai:
```
🚫 [TOO SHORT] Ignoring: a
```
**Matlab:** Text bahut chhota tha, ignore kar diya

### 3. Agar Noise Detect Hua:
```
🚫 [NOISE] Filtered as noise: sss
```
**Matlab:** System ne noise samjha aur filter kar diya

### 4. Local Match (Agar Shabad Already Load Hai):
```
🎯 [LOCAL CHECK] Attempting instant local match
✅ [LOCAL INSTANT] Found: tu mera pita tuhai mera mata
```
**Matlab:** Next line current Shabad mein mil gayi!

### 5. Global Search (Naya Shabad):
```
⏳ [WAITING] Starting 2s silence timer for global search
⏰ [TIMEOUT] Silence detected, triggering global search
🔍 [SEARCH] Starting search for: japji sahib
🧹 [CLEAN] After cleaning: japji sahib
🌐 [GLOBAL] Searching API - Query: japji sahib | Acronym: js
📡 [API] Response status: 200
📦 [API] Response data: {match: {...}, shabad: {...}}
✅ [SUCCESS] Match found: ikOankaar sat naam karataa purakh
```
**Matlab:** API se naya Shabad load ho raha hai!

### 6. Agar Match Nahi Mila:
```
❌ [NO MATCH] No match for: xyz abc
```
**Matlab:** Koi Shabad nahi mila is query ke liye

### 7. Agar API Error Aaya:
```
❌ [API ERROR] Status: 500
```
**Matlab:** Server mein problem hai

---

## 🐛 Common Problems Aur Solutions

### Problem 1: Console Mein Kuch Bhi Nahi Dikh Raha
**Check:**
- Kya "START SYSTEM" button click kiya?
- Kya microphone permission diya?
- Console tab sahi khula hai?

**Solution:**
```javascript
// Console mein type karein:
console.log("Test");
// Agar yeh dikha to console working hai
```

### Problem 2: Transcript Aa Raha Hai Par Search Nahi Ho Raha
**Console Mein Dekhein:**
```
🎤 [TRANSCRIPT] Raw from browser: ...
🚫 [TOO SHORT] Ignoring: ...
```
**Matlab:** Text bahut chhota hai. Pura sentence bolein!

### Problem 3: Search Ho Raha Hai Par Match Nahi Mil Raha
**Console Mein Dekhein:**
```
🔍 [SEARCH] Starting search for: xyz
🧹 [CLEAN] After cleaning: xyz
🌐 [GLOBAL] Searching API...
❌ [NO MATCH] No match for: xyz
```
**Solution:** 
- Sahi pronunciation use karein
- Pura line bolein, sirf ek-do word nahi

### Problem 4: API Call Fail Ho Rahi Hai
**Console Mein Dekhein:**
```
❌ [SEARCH FAILED] TypeError: Failed to fetch
```
**Solution:**
- Internet connection check karein
- Server running hai? (`npm start` check karein)

---

## 🎬 Testing Steps

### Step 1: Basic Test
1. Browser console open karein (`F12`)
2. "START SYSTEM" click karein
3. Console mein dekhein:
   ```
   System should show microphone permission request
   ```

### Step 2: Voice Test
1. Kuch bolein (jaise "test")
2. Console mein dekhna chahiye:
   ```
   🎤 [TRANSCRIPT] Raw from browser: test
   ```
3. Agar nahi dikha = Microphone problem hai

### Step 3: Search Test
1. Pura line bolein: "thir ghar baiso"
2. Console mein dekhna chahiye:
   ```
   🎤 [TRANSCRIPT] Raw from browser: thir ghar baiso
   📝 [NEW SPEECH] Extracted chunk: thir ghar baiso
   ⏳ [WAITING] Starting 2s silence timer...
   ⏰ [TIMEOUT] Silence detected...
   🔍 [SEARCH] Starting search for: thir ghar baiso
   🌐 [GLOBAL] Searching API...
   📡 [API] Response status: 200
   ✅ [SUCCESS] Match found: ...
   ```

### Step 4: Display Test
1. Agar match mila to screen par Shabad dikhna chahiye
2. Agar nahi dikha to console mein error dekhein

---

## 📊 Log Symbols Guide

| Symbol | Meaning | Status |
|--------|---------|--------|
| 🎤 | Transcript received | Info |
| 📝 | Speech extracted | Info |
| 🚫 | Filtered/Ignored | Warning |
| 🎯 | Local match attempt | Info |
| ✅ | Success | Good |
| ❌ | Failed/Error | Bad |
| ⏳ | Waiting | Info |
| ⏰ | Timeout triggered | Info |
| 🔍 | Search started | Info |
| 🧹 | Text cleaned | Info |
| 🌐 | API call | Info |
| 📡 | API response | Info |
| 📦 | Data received | Good |

---

## 🆘 Mujhe Console Logs Bhejein

Agar problem solve nahi ho rahi, to:

1. Console open karein (`F12`)
2. Problem reproduce karein (line bolein)
3. Console mein **Right Click → Save As** karein
4. Ya screenshot lein
5. Mujhe bhejein!

---

## 🎯 Quick Diagnostic Commands

Console mein type karke test karein:

### Check if API is working:
```javascript
fetch('/api/search', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({query: 'japji', acronym: 'j'})
}).then(r => r.json()).then(console.log)
```

### Check microphone permission:
```javascript
navigator.mediaDevices.getUserMedia({audio: true})
  .then(() => console.log('✅ Mic working'))
  .catch(e => console.log('❌ Mic error:', e))
```

---

**Ab console logs se aapko exactly pata chalega ki problem kahan hai!** 🔍
