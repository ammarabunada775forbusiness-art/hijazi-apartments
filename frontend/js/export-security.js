/* تحييد الصيغ عند تصدير بيانات غير موثوقة إلى Excel أو برنامج جداول آخر. */
(function (root) {
    function csvCell(value) {
        let text = String(value ?? "");
        if (/^[\s\uFEFF]*[=+\-@＝＋－＠]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    }
    if (typeof module === "object" && module.exports) module.exports = { csvCell };
    else root.HijaziExportSecurity = { csvCell };
})(typeof window !== "undefined" ? window : globalThis);
