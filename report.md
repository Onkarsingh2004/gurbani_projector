# 📋 Gurbani Projector Quality Assurance Report
**Timestamp:** 11/2/2026, 3:57:36 pm

## Test Summary
| Test Case | Logic Path | Query Sent | Match Found | Status |
|---|---|---|---|---|
| **Acronym Handling (Sentence)** | Hybrid: Full Text -> Acronym Fallback | `Aavo Daya` | NULL... | ❌ FAIL |
| **Bani Command: Anand Sahib** | Map Title -> Full Search | `anand bhaya meri maaye` | ana(n)dh bhiaa meree maae sati... | ⚠️ CHECK |
| **Full Line Detect** | Full Text Priority | `thir ghar baiso` | NULL... | ❌ FAIL |
| **Short Acronym (Explicit)** | Acronym Priority (Short) | `w w w` | ikOankaar vaahiguroo jee kee f... | ⚠️ CHECK |
| **Dasam Granth: Ek Siv Bhe** | Full Text Priority (Dasam Granth) | `ek siv bhe ek ge ek fer bhe ramachndhr kirasan ke avataar bhee anek hai` | ek siv bhe ek ge ek fer bhe ra... | ✅ PASS |
| **Dasam Granth: Pahil Avataaraa** | Full Text Priority | `je je bhe pahil avataaraa` | je je bhe pahil avataaraa ||... | ✅ PASS |
| **User Request: Sakhi Saheli** | Acronym vs Full Text Hybrid | `sakhi saheli gao manglo` | NULL... | ❌ FAIL |