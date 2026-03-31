/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { Printer, Info, GraduationCap, Award, Download, Loader2, Eye } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function App() {
  // State
  const [field, setField] = useState<number>(1);
  const [spec, setSpec] = useState<string>("spec1");
  const [grade, setGrade] = useState<number>(1);
  const [degreeDate, setDegreeDate] = useState<string>("");
  const [competitionDate, setCompetitionDate] = useState<string>("");
  const [seniorityResult, setSeniorityResult] = useState({ years: 0, months: 0 });
  const [articleCategory, setArticleCategory] = useState<number>(1.5);
  const [articleRank, setArticleRank] = useState<number>(1);
  const [hasSecondArticle, setHasSecondArticle] = useState<boolean>(false);
  const [secondArticleCategory, setSecondArticleCategory] = useState<number>(1.5);
  const [secondArticleRank, setSecondArticleRank] = useState<number>(1);
  const [bonusBook, setBonusBook] = useState<boolean>(false);
  const [bonusMode, setBonusMode] = useState<"internal" | "external">("internal");
  const [intlComm, setIntlComm] = useState<number>(0);
  const [natComm, setNatComm] = useState<number>(0);
  const [expLessons, setExpLessons] = useState<number>(0);
  const [expTD, setExpTD] = useState<number>(0);
  const [expTP, setExpTP] = useState<number>(0);
  const [expAdmin, setExpAdmin] = useState<number>(0);
  const [expTeachingOutside, setExpTeachingOutside] = useState<number>(0);
  const [interviewPoints, setInterviewPoints] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Totals
  const [totals, setTotals] = useState({
    section1: 0,
    grade: 1,
    seniority: 0,
    publications: 0,
    communications: 0,
    experience: 0,
    interview: 0,
    bonus: 0,
    file: 0,
    final: 0,
  });

  useEffect(() => {
    // 1. ملاءمة الشعبة والتخصص
    let specPt = 0;
    if (field === 1) {
      if (spec === "spec1") specPt = 1;
      else if (spec === "spec2") specPt = 0.75;
      else if (spec === "spec3") specPt = 0.5;
      else specPt = 0.25;
    } else {
      if (spec === "spec1") specPt = 0.75;
      else if (spec === "spec2") specPt = 0.5;
      else if (spec === "spec3") specPt = 0;
      else specPt = 0.25;
    }
    const section1Total = Math.min(2, field + specPt);

    // 2. تقدير الشهادة
    const gradePt = grade;

    // 3. أقدمية الشهادة (حساب بالسنوات والأشهر)
    let seniorityPt = 0;
    let calcYears = 0;
    let calcMonths = 0;

    if (degreeDate && competitionDate) {
      const start = new Date(degreeDate);
      const end = new Date(competitionDate);

      if (end > start) {
        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();

        if (days < 0) {
          months--;
        }
        if (months < 0) {
          years--;
          months += 12;
        }

        calcYears = years;
        calcMonths = months;
        
        // الحساب: 0.25 لكل سنة (أي 0.25/12 لكل شهر)
        const totalMonths = (years * 12) + months;
        seniorityPt = Math.min(2, (totalMonths / 12) * 0.25);
      }
    }
    setSeniorityResult({ years: calcYears, months: calcMonths });

    // 4. الأعمال العلمية
    let bestArticlePoints = articleCategory * articleRank;
    let internalArticleBonus = 0;
    let externalArticleBonus = 0;
    
    if (hasSecondArticle) {
      if (secondArticleCategory > articleCategory) {
        // المقال الثاني أعلى تصنيفاً
        bestArticlePoints = secondArticleCategory * secondArticleRank;
      } else if (secondArticleCategory === articleCategory) {
        // نفس التصنيف، نأخذ الأعلى نقاطاً (الترتيب الأفضل)
        bestArticlePoints = Math.max(bestArticlePoints, secondArticleCategory * secondArticleRank);
        
        // قواعد الصنف المتماثل
        if (articleCategory === 5) { // أ+
          externalArticleBonus = 1;
        } else if (articleCategory === 4 || articleCategory === 3) { // أ أو ب
          internalArticleBonus = 1;
        } else if (articleCategory === 1.5) { // ج
          internalArticleBonus = 1.5;
        }
      }
    }

    let bonusValue = (bonusBook ? 1.5 : 0);
    
    let finalPubsPt = 0;
    let externalBonus = 0;

    if (bonusMode === "internal") {
      finalPubsPt = Math.min(5, bestArticlePoints + internalArticleBonus + externalArticleBonus + bonusValue);
      externalBonus = 0;
    } else {
      finalPubsPt = Math.min(5, bestArticlePoints + internalArticleBonus);
      externalBonus = bonusValue + externalArticleBonus;
    }

    const intlPt = Math.min(2, intlComm * 0.5);
    const natPt = Math.min(1, natComm * 0.25);
    const commTotal = Math.min(3, intlPt + natPt);

    // 5. الخبرة المهنية
    const lessonsPt = Math.min(3, expLessons * 0.5);
    const tdPt = Math.min(1.5, expTD * 0.25);
    const tpPt = Math.min(1.5, expTP * 0.25);
    const adminPt = Math.min(1.5, expAdmin * 0.25);
    const teachingOutsidePt = Math.min(1.5, expTeachingOutside * 0.5);
    const expTotal = Math.min(3, lessonsPt + tdPt + tpPt + adminPt + teachingOutsidePt);

    // Final
    const fileTotal = section1Total + gradePt + seniorityPt + finalPubsPt + commTotal + expTotal;
    const finalTotal = fileTotal + interviewPoints + externalBonus;

    setTotals({
      section1: section1Total,
      grade: gradePt,
      seniority: seniorityPt,
      publications: finalPubsPt,
      communications: commTotal,
      experience: expTotal,
      interview: interviewPoints,
      bonus: externalBonus,
      file: fileTotal,
      final: finalTotal,
    });
  }, [
    field,
    spec,
    grade,
    degreeDate,
    competitionDate,
    articleCategory,
    articleRank,
    hasSecondArticle,
    secondArticleCategory,
    secondArticleRank,
    bonusBook,
    bonusMode,
    intlComm,
    natComm,
    expLessons,
    expTD,
    expTP,
    expAdmin,
    expTeachingOutside,
    interviewPoints,
  ]);

  const handleDownloadPDF = async () => {
    if (tableRef.current === null) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(tableRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('جدول_نقاط_المترشح.pdf');
    } catch (err) {
      console.error('Download failed:', err);
      alert('عذراً، حدث خطأ أثناء محاولة تحميل الملف. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-72 font-['Cairo'] rtl overflow-x-hidden" dir="rtl">
      <header className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white py-8 px-4 text-center mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-10 -left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-400 rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-4 md:gap-8">
            <GraduationCap size={32} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
            <h1 className="text-xl md:text-3xl font-extrabold tracking-tight drop-shadow-lg">حاسبة نقاط التوظيف لأستاذ مساعد</h1>
            <Award size={32} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
          </div>
          <p className="text-blue-100 text-sm md:text-lg font-medium opacity-90 max-w-2xl mx-auto">
            حسب معايير المنشور الوزاري - أكتوبر 2024
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        {/* 1. ملاءمة الشعبة والتخصص */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-slate-100">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 w-8 h-8 flex items-center justify-center rounded-lg text-sm">01</span>
            ملاءمة الشعبة والتخصص
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">الشعبة المطلوبة:</label>
              <select
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                value={field}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setField(val);
                  // Reset specialization if it's not valid for the new field
                  if (val === 0.75 && spec === "spec3") {
                    setSpec("spec1");
                  }
                }}
              >
                <option value={1}>الشعبة الأولى المطلوبة (1 ن)</option>
                <option value={0.75}>الشعبة الثانية المطلوبة (0.75 ن)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">التخصص:</label>
              <select
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
              >
                {field === 1 ? (
                  <>
                    <option value="spec1">التخصص الأول (1 ن)</option>
                    <option value="spec2">التخصص الثاني (0.75 ن)</option>
                    <option value="spec3">التخصص الثالث (0.5 ن)</option>
                  </>
                ) : (
                  <>
                    <option value="spec1">التخصص الأول (0.75 ن)</option>
                    <option value="spec2">التخصص الثاني (0.5 ن)</option>
                  </>
                )}
                <option value="other">تخصصات أخرى (0.25 ن)</option>
              </select>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400 italic flex items-center gap-1">
            <Info size={12} /> الحد الأقصى لهذا القسم: 2 نقطة.
          </p>
        </section>

        {/* 2. تقدير الشهادة */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-slate-100">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 w-8 h-8 flex items-center justify-center rounded-lg text-sm">02</span>
            تقدير الشهادة
          </h2>
          
          <div className="flex flex-col md:flex-row gap-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="grade"
                value={1}
                checked={grade === 1}
                onChange={() => setGrade(1)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="group-hover:text-blue-600 transition-colors">مشرف جداً (1 ن)</span>
            </label>
            
            <label className="flex flex-col gap-1 cursor-pointer group">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name="grade"
                  value={0.5}
                  checked={grade === 0.5}
                  onChange={() => setGrade(0.5)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="group-hover:text-blue-600 transition-colors">مشرف / شهادة معادلة (0.5 ن)</span>
              </div>
              <span className="text-[10px] text-slate-400 mr-6">
                في حال اختيارها (مشرف / شهادة معادلة)
              </span>
            </label>
          </div>
        </section>

        {/* 3. أقدمية الشهادة */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-slate-100">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 w-8 h-8 flex items-center justify-center rounded-lg text-sm">03</span>
            أقدمية الشهادة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-1">تاريخ الحصول على الشهادة (المداولات):</label>
              <input
                type="date"
                value={degreeDate}
                onChange={(e) => setDegreeDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">تاريخ فتح المسابقة:</label>
              <input
                type="date"
                value={competitionDate}
                onChange={(e) => setCompetitionDate(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between bg-blue-50 p-4 rounded-xl border border-blue-100">
            <div className="text-sm font-bold text-blue-800">
              الأقدمية: {seniorityResult.years} سنة و {seniorityResult.months} شهر
            </div>
            <div className="text-center min-w-[80px]">
              <span className="block text-[10px] text-blue-500 font-bold uppercase">النقاط</span>
              <span className="font-bold text-blue-700 text-lg">{totals.seniority.toFixed(2)}</span>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-slate-400 italic">0.25 نقطة عن كل سنة (بحد أقصى 2 نقطة).</p>
        </section>

        {/* 4. الأعمال العلمية */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-slate-100">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 w-8 h-8 flex items-center justify-center rounded-lg text-sm">04</span>
            الأعمال العلمية المنجزة (8 نقاط)
          </h2>

          <div className="mb-8">
            <h3 className="font-bold text-slate-700 mb-4 border-r-4 border-blue-500 pr-2">أولاً: المنشورات العلمية (الحد الأقصى 5 ن)</h3>
            <p className="text-[10px] text-blue-600 mb-4 bg-blue-50 p-2 rounded-lg border border-blue-100">
              <Info size={12} className="inline ml-1" /> في حال وجود عدة مقالات، يتم احتساب المقال الأعلى تصنيفاً فقط.
            </p>
            
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">تصنيف المجلة:</label>
                  <select
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500"
                    value={articleCategory}
                    onChange={(e) => setArticleCategory(parseFloat(e.target.value))}
                  >
                    <option value={5}>أ+ (5 ن)</option>
                    <option value={4}>أ (4 ن)</option>
                    <option value={3}>ب (3 ن)</option>
                    <option value={1.5}>ج (1.5 ن)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">ترتيب المترشح:</label>
                  <select
                    className="w-full p-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-500"
                    value={articleRank}
                    onChange={(e) => setArticleRank(parseFloat(e.target.value))}
                  >
                    <option value={1}>مؤلف أول (100%)</option>
                    <option value={0.75}>مؤلف ثاني (75%)</option>
                    <option value={0.5}>مؤلف ثالث (50%)</option>
                    <option value={0.25}>مؤلف رابع (25%)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-5 rounded-2xl mb-8 border border-blue-100">
            <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
              إنجازات إضافية
            </h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={hasSecondArticle}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setHasSecondArticle(checked);
                      if (checked) {
                        setSecondArticleCategory(articleCategory);
                      }
                    }}
                    className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-bold group-hover:text-blue-700 transition-colors">هل يوجد مقال ثانٍ؟</span>
                </label>
                
                {hasSecondArticle && (
                  <div className="bg-white/60 border border-blue-200 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-blue-500 mb-1">تصنيف المجلة (مقال 2):</label>
                        <select
                          className="w-full p-2 text-sm border border-blue-100 rounded-lg bg-white outline-none focus:border-blue-500"
                          value={secondArticleCategory}
                          onChange={(e) => setSecondArticleCategory(parseFloat(e.target.value))}
                        >
                          <option value={5}>أ+ (5 ن)</option>
                          <option value={4}>أ (4 ن)</option>
                          <option value={3}>ب (3 ن)</option>
                          <option value={1.5}>ج (1.5 ن)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-blue-500 mb-1">ترتيب المترشح (مقال 2):</label>
                        <select
                          className="w-full p-2 text-sm border border-blue-100 rounded-lg bg-white outline-none focus:border-blue-500"
                          value={secondArticleRank}
                          onChange={(e) => setSecondArticleRank(parseFloat(e.target.value))}
                        >
                          <option value={1}>مؤلف أول (100%)</option>
                          <option value={0.75}>مؤلف ثاني (75%)</option>
                          <option value={0.5}>مؤلف ثالث (50%)</option>
                          <option value={0.25}>مؤلف رابع (25%)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={bonusBook}
                  onChange={(e) => setBonusBook(e.target.checked)}
                  className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm group-hover:text-blue-700 transition-colors">كتاب علمي برقم دولي (ردمك) - 1.5 ن</span>
              </label>
            </div>

            <div className="mt-6 pt-6 border-t border-blue-200/50">
              <label className="block text-xs font-bold text-blue-800 mb-3 uppercase tracking-wider">طريقة احتساب النقاط الإضافية:</label>
              <div className="flex bg-white/50 p-1 rounded-xl border border-blue-200 w-fit">
                <button
                  onClick={() => setBonusMode("internal")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    bonusMode === "internal" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-white/80"
                  }`}
                >
                  ضمن المنشورات
                </button>
                <button
                  onClick={() => setBonusMode("external")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    bonusMode === "external" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-white/80"
                  }`}
                >
                  نقاط إضافية حرة
                </button>
              </div>
              <p className="text-[10px] mt-2 text-blue-600/70 italic">
                {bonusMode === "internal" 
                  ? "تُجمع مع المقالات بسقف 5 نقاط (ملاحظة: علاوة أ+ تظل دائماً خارج السقف)." 
                  : "تضاف مباشرة كعلاوة للمجموع النهائي (خارج سقف الـ 5 نقاط)."}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-slate-700 mb-4 border-r-4 border-blue-500 pr-2">ثانياً: المداخلات العلمية (الحد الأقصى 3 ن)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">عدد المداخلات الدولية:</label>
                <input
                  type="number"
                  min="0"
                  value={intlComm}
                  onChange={(e) => setIntlComm(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">0.5 ن للمداخلة (الحد الأقصى 2 ن)</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">عدد المداخلات الوطنية:</label>
                <input
                  type="number"
                  min="0"
                  value={natComm}
                  onChange={(e) => setNatComm(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">0.25 ن للمداخلة (الحد الأقصى 1 ن)</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. الخبرة المهنية */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-6 border border-slate-100">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 w-8 h-8 flex items-center justify-center rounded-lg text-sm">05</span>
            الخبرة المهنية المكتسبة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-1">عدد سداسيات الدروس:</label>
              <input
                type="number"
                min="0"
                value={expLessons}
                onChange={(e) => setExpLessons(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">0.5 ن للسداسي (الحد الأقصى 3 ن)</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">عدد سداسيات الأعمال الموجهة (TD):</label>
              <input
                type="number"
                min="0"
                value={expTD}
                onChange={(e) => setExpTD(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">0.25 ن للسداسي (الحد الأقصى 1.5 ن)</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">عدد سنوات الأعمال التطبيقية (TP):</label>
              <input
                type="number"
                min="0"
                value={expTP}
                onChange={(e) => setExpTP(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">0.25 ن للسنة (الحد الأقصى 1.5 ن)</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">عدد سنوات التأطير / الإدارة بعد الحصول على الشهادة:</label>
              <input
                type="number"
                min="0"
                value={expAdmin}
                onChange={(e) => setExpAdmin(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">0.25 ن للسنة (الحد الأقصى 1.5 ن)</p>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">عدد سنوات التدريس خارج التعليم العالي بعد الحصول على الشهادة:</label>
              <input
                type="number"
                min="0"
                value={expTeachingOutside}
                onChange={(e) => setExpTeachingOutside(parseFloat(e.target.value) || 0)}
                className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">0.5 ن للسنة (الحد الأقصى 1.5 ن)</p>
            </div>
          </div>
          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <span className="text-sm font-bold text-slate-600">مجموع قسم الخبرة: </span>
            <span className="font-bold text-blue-700 text-xl mx-2">{totals.experience.toFixed(2)}</span>
            <span className="text-xs text-slate-400"> / 3</span>
          </div>
        </section>

        {/* 6. المقابلة الشفوية */}
        <section className="bg-white rounded-2xl p-6 shadow-sm mb-8 border border-slate-100">
          <h2 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 w-8 h-8 flex items-center justify-center rounded-lg text-sm">06</span>
            المقابلة الشفوية
          </h2>
          <div>
            <label className="block text-sm font-semibold mb-1">نقطة المقابلة (من 0 إلى 4):</label>
            <input
              type="number"
              min="0"
              max="4"
              step="0.25"
              value={interviewPoints}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setInterviewPoints(val > 4 ? 4 : val);
              }}
              className="w-full p-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
        </section>

        {/* Live Result Preview Section */}
        <section className="bg-white rounded-3xl shadow-2xl mb-16 border-2 border-blue-600 overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="bg-blue-700 text-white py-5 px-8 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Award size={28} className="text-yellow-400" />
              <h2 className="text-xl md:text-2xl font-black">معاينة الملف</h2>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
              <Eye size={18} className="text-white" />
            </div>
          </div>
          
          <div className="p-6 md:p-10 bg-slate-50/30">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
              <div className="p-4 bg-slate-50 border-b border-slate-200 text-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">تفاصيل النقاط المحتسبة</span>
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { label: "01. ملاءمة الشعبة والتخصص", value: totals.section1 },
                  { label: "02. تقدير الشهادة", value: totals.grade },
                  { label: "03. أقدمية الشهادة", value: totals.seniority },
                  { label: "04. المنشورات العلمية", value: totals.publications + totals.bonus },
                  { label: "05. المداخلات العلمية", value: totals.communications },
                  { label: "06. الخبرة المهنية", value: totals.experience },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 hover:bg-blue-50/30 transition-colors">
                    <span className="text-slate-600 font-medium">{item.label}</span>
                    <span className="font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg">{item.value.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-5 bg-blue-600 text-white">
                  <span className="font-bold">مجموع نقاط الملف بدون المقابلة</span>
                  <span className="text-xl font-black">{(totals.file + totals.bonus).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl border-2 border-blue-100 shadow-inner">
              <div className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-2">النتيجة النهائية</div>
              <div className="relative mb-8">
                <div className="text-7xl md:text-8xl font-black text-blue-800 drop-shadow-md">
                  {totals.final.toFixed(2)}
                </div>
                <div className="absolute -bottom-4 -right-8 bg-yellow-400 text-blue-900 px-3 py-1 rounded-lg font-black text-sm rotate-12 shadow-lg">
                  من 20
                </div>
              </div>
              
              <div className="w-full md:w-auto bg-blue-700 text-white px-12 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-4 shadow-xl">
                <GraduationCap size={32} className="text-yellow-400 animate-bounce" />
                <span>بالتوفيق دكتور</span>
              </div>
              <p className="mt-6 text-sm text-slate-400 font-bold flex items-center gap-2">
                <Info size={14} />
                تنبيه: يرجى التأكد من إدخال جميع المعلومات بدقة لضمان صحة النتيجة
              </p>
            </div>
          </div>
        </section>

        <div className="text-center mb-12 -mt-8">
          <div className="text-sm md:text-base text-slate-400 font-bold">
            جميع الحقوق محفوظة ©
            <br />
            الشيخ العلامة سيدي كريم البودالي
          </div>
          <div className="text-xs text-slate-300 mt-1">
            {new Date().toLocaleDateString('ar-DZ', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Hidden Table for Image Generation - Off-screen without causing horizontal overflow */}
        <div style={{ 
          position: 'absolute', 
          top: '-9999px', 
          right: '0',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1
        }}>
          <div ref={tableRef} className="p-10 w-[800px] font-['Cairo'] rtl" dir="rtl" style={{ backgroundColor: '#ffffff' }}>
            <div className="text-center mb-8 pb-4" style={{ borderBottom: '2px solid #1d4ed8' }}>
              <h1 className="text-3xl font-bold mb-2" style={{ color: '#1e40af' }}>جدول نقاط المترشح</h1>
              <p style={{ color: '#64748b' }}>حسب معايير المنشور الوزاري - أكتوبر 2024</p>
            </div>
            
            <table className="w-full border-collapse" style={{ border: '1px solid #cbd5e1' }}>
              <thead>
                <tr style={{ backgroundColor: '#1d4ed8', color: '#ffffff' }}>
                  <th className="p-3 text-right" style={{ border: '1px solid #cbd5e1' }}>المعيار</th>
                  <th className="p-3 text-center w-32" style={{ border: '1px solid #cbd5e1' }}>النقاط</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 font-semibold" style={{ border: '1px solid #cbd5e1' }}>01. ملاءمة الشعبة والتخصص</td>
                  <td className="p-3 text-center font-bold" style={{ border: '1px solid #cbd5e1' }}>{totals.section1.toFixed(2)}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td className="p-3 font-semibold" style={{ border: '1px solid #cbd5e1' }}>02. تقدير الشهادة</td>
                  <td className="p-3 text-center font-bold" style={{ border: '1px solid #cbd5e1' }}>{totals.grade.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold" style={{ border: '1px solid #cbd5e1' }}>03. أقدمية الشهادة</td>
                  <td className="p-3 text-center font-bold" style={{ border: '1px solid #cbd5e1' }}>{totals.seniority.toFixed(2)}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td className="p-3 font-semibold" style={{ border: '1px solid #cbd5e1' }}>04. المنشورات العلمية</td>
                  <td className="p-3 text-center font-bold" style={{ border: '1px solid #cbd5e1' }}>{(totals.publications + totals.bonus).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold" style={{ border: '1px solid #cbd5e1' }}>05. المداخلات العلمية</td>
                  <td className="p-3 text-center font-bold" style={{ border: '1px solid #cbd5e1' }}>{totals.communications.toFixed(2)}</td>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <td className="p-3 font-semibold" style={{ border: '1px solid #cbd5e1' }}>06. الخبرة المهنية</td>
                  <td className="p-3 text-center font-bold" style={{ border: '1px solid #cbd5e1' }}>{totals.experience.toFixed(2)}</td>
                </tr>
                <tr style={{ backgroundColor: '#eff6ff' }}>
                  <td className="p-3 font-bold" style={{ border: '1px solid #cbd5e1', color: '#1e40af' }}>مجموع نقاط الملف بدون المقابلة</td>
                  <td className="p-3 text-center font-bold" style={{ border: '1px solid #cbd5e1', color: '#1e40af' }}>{(totals.file + totals.bonus).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold" style={{ border: '1px solid #cbd5e1' }}>07. المقابلة الشفوية</td>
                  <td className="p-3 text-center font-bold" style={{ border: '1px solid #cbd5e1' }}>{totals.interview.toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#1e40af', color: '#ffffff' }}>
                  <td className="p-4 text-xl font-bold" style={{ border: '1px solid #cbd5e1' }}>المجموع الكلي النهائي</td>
                  <td className="p-4 text-center text-2xl font-bold" style={{ border: '1px solid #cbd5e1' }}>{totals.final.toFixed(2)} / 20</td>
                </tr>
              </tfoot>
            </table>
            
            <div className="mt-8 text-center text-[12px]" style={{ color: '#94a3b8' }}>
              جميع الحقوق محفوظة ©
              <br />
              الشيخ العلامة سيدي كريم البودالي
              <br />
              {new Date().toLocaleDateString('ar-DZ', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-4xl mx-auto flex justify-center items-center">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-black text-blue-700">
              المجموع الحالي: <span className="text-3xl">{totals.final.toFixed(2)}</span> / 20
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
