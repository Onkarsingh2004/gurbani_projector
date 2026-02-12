## ✅ Shabad Display Fixed!

### Kya Problem Thi?
Aapko **poori Shabad** nahi dikh rahi thi kyunki:
- Active line: **Golden, badi** (clearly visible)
- Baaki lines: **White, bahut chhoti, 30% faded** (almost invisible)

### Kya Fix Kiya?
Ab **saari lines clearly** dikhti hain:

**Pehle:**
- Non-active lines: `opacity-30` (bahut faded)
- Non-active lines: `text-4xl` (chhoti)

**Ab:**
- Non-active lines: `opacity-70` (clearly visible)
- Non-active lines: `text-5xl` (badi)

### Display Ab Kaisa Hai?
```
ੴ ਸਤਿਗੁਰ ਪ੍ਰਸਾਦਿ ॥        ← White, 70% visible, text-5xl
ਆਸਾ ਮਹਲਾ ੫ ॥              ← White, 70% visible, text-5xl
ਤੂੰ ਮੇਰਾ ਰਾਖਾ ਸਭਨੀ ਥਾਈ   ← GOLDEN, 100% visible, text-8xl (ACTIVE)
ਤਾ ਭਉ ਕੇਹਾ ਕਾੜਾ ਜੀਉ ॥    ← White, 70% visible, text-5xl
```

### Test Kaise Karein?
1. Browser refresh karein (`Ctrl+R`)
2. "START SYSTEM" click karein
3. Koi bhi line bolein (jaise "thir ghar baiso")
4. **Poori Shabad** screen par clearly dikhni chahiye!

### Features:
✅ Poori Shabad visible
✅ Current line highlighted (golden)
✅ Baaki lines bhi clearly readable
✅ Smooth scrolling jab line change ho
