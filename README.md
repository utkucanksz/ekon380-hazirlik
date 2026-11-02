# EKON 380 Ders Hazırlık Modülü

Küresel Ekonomik ve Finansal Analiz dersi (Banu Erkök Yiğit) için altı sunumun özeti, açıklaması, vurgulanmış önemli noktaları ve 78 soruluk quiz bankası.

**Canlı site:** https://utkucanksz.github.io/ekon380-hazirlik/

## Dosyalar

- `index.html`: tüm sunumların içeriği (her sunum bir `<section>`)
- `assets/style.css`: görünüm
- `assets/app.js`: gezinme, vurgu ve tema tercihi, ilerleme, quiz motoru
- `assets/quiz-data.js`: soru bankası

## Düzenleme

- Vurgu: `<mark>` sarı (kavram), `<mark class="num">` yeşil (rakam, formül), `<mark class="trap">` pembe (karıştırılan ayrım).
- Yeni soru eklemek için `assets/quiz-data.js` içindeki `QUIZ` listesine `{ u, q, o, a, e }` nesnesi ekle (`a` doğru şıkkın sıra numarası, 0'dan başlar).
- Yeni sunum eklemek için `index.html`'e yeni bir `<section class="view" id="u7">`, sol menüye bağlantı ve `QUIZ_SETS` listesine bir satır ekle.
