import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, ArrowLeft, Volume2, CheckCircle2, AlertCircle, Loader2, RefreshCw, Image as ImageIcon, Wand2 } from 'lucide-react';
import { createTopic, generateBatchCards, regenerateCardImage } from '../services/api';
import { speakWord } from '../services/speech';
import { soundEffects } from '../services/soundEffects';

export default function AdminPanel({ topics = [], onBack, onTopicUpdated }) {
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '');
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false);

  // Form tạo Topic mới
  const [newTopicNameEn, setNewTopicNameEn] = useState('');
  const [newTopicNameVi, setNewTopicNameVi] = useState('');
  const [newTopicIcon, setNewTopicIcon] = useState('🍎');
  const [newTopicColor, setNewTopicColor] = useState('amber');

  // Input từ vựng và tùy chọn nguồn ảnh
  const [wordInput, setWordInput] = useState('');
  const [imageSource, setImageSource] = useState('ai_refined'); // 'ai_refined' | 'unsplash'
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const [generatedCards, setGeneratedCards] = useState([]);

  // Loading state cho việc regenerate từng thẻ cụ thể: { [cardId]: boolean }
  const [regeneratingCardIds, setRegeneratingCardIds] = useState({});

  // Xử lý tạo chủ đề mới
  const handleCreateTopic = async (e) => {
    e.preventDefault();
    if (!newTopicNameEn.trim() || !newTopicNameVi.trim()) {
      setError('Vui lòng nhập đầy đủ tên tiếng Anh và tiếng Việt cho chủ đề');
      return;
    }

    try {
      setError('');
      const created = await createTopic({
        name_en: newTopicNameEn.trim(),
        name_vi: newTopicNameVi.trim(),
        icon: newTopicIcon.trim() || '📚',
        color_theme: newTopicColor
      });
      soundEffects.playStar();
      setIsCreatingNewTopic(false);
      setSelectedTopicId(created.id);
      if (onTopicUpdated) onTopicUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  // Xử lý sinh thẻ hàng loạt bằng AI với nguồn ảnh lựa chọn
  const handleGenerate = async () => {
    if (!selectedTopicId) {
      setError('Vui lòng chọn một chủ đề');
      return;
    }

    const wordsList = wordInput
      .split(/[,;\n]+/)
      .map(w => w.trim())
      .filter(Boolean);

    if (wordsList.length === 0) {
      setError('Vui lòng nhập ít nhất một từ vựng (ví dụ: giraffe, watermelon)');
      return;
    }

    try {
      setError('');
      setIsGenerating(true);
      const sourceName = imageSource === 'unsplash' ? 'Vector / Thật (Unsplash)' : 'AI Tinh Chỉnh (Gemini + Pollinations)';
      setProgressMsg(`Đang phân tích và tạo media cho ${wordsList.length} từ [Nguồn: ${sourceName}]...`);
      soundEffects.playPop();

      const result = await generateBatchCards(selectedTopicId, wordsList, imageSource);
      soundEffects.playWin();
      setGeneratedCards(result.cards || []);
      setWordInput('');
      setProgressMsg(`Thành công! Đã tạo và lưu ${result.cards?.length || 0} thẻ vào bộ nhớ.`);
      if (onTopicUpdated) onTopicUpdated();
    } catch (err) {
      setError(err.message || 'Lỗi khi sinh thẻ');
      soundEffects.playPop();
    } finally {
      setIsGenerating(false);
    }
  };

  // Xử lý tạo lại ảnh cho một thẻ đơn lẻ
  const handleRegenerateImage = async (card) => {
    if (!card?.id) return;
    const cardId = card.id;

    try {
      soundEffects.playPop();
      setRegeneratingCardIds(prev => ({ ...prev, [cardId]: true }));

      const res = await regenerateCardImage(cardId, imageSource);
      soundEffects.playStar();

      // Cập nhật URL ảnh mới (kèm timestamp để tránh cache trình duyệt hiển thị ảnh cũ)
      const freshUrl = `${res.card.image_url}?t=${Date.now()}`;

      setGeneratedCards(prevCards =>
        prevCards.map(c => (c.id === cardId ? { ...c, image_url: freshUrl } : c))
      );

      if (onTopicUpdated) onTopicUpdated();
    } catch (err) {
      alert(`Không thể tạo lại ảnh: ${err.message}`);
    } finally {
      setRegeneratingCardIds(prev => ({ ...prev, [cardId]: false }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header Admin */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-slate-200">
        <button
          onClick={() => {
            soundEffects.playPop();
            onBack();
          }}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-amber-400 px-4 py-2 rounded-2xl font-bold text-slate-700 shadow-sm transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-amber-500" />
          <span>Về Ứng Dụng</span>
        </button>

        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-800 font-kids flex items-center gap-2 justify-end">
            <span>⚙️ Quản Trị Flashcards</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Đa nguồn hình ảnh & Tự động tạo thẻ bằng AI
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: CHỌN / TẠO CHỦ ĐỀ */}
        <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm h-fit space-y-4">
          <h3 className="text-lg font-bold text-slate-800 font-kids flex items-center justify-between">
            <span>1. Chọn Chủ Đề</span>
            <button
              onClick={() => setIsCreatingNewTopic(!isCreatingNewTopic)}
              className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreatingNewTopic ? 'Chọn có sẵn' : 'Tạo mới'}</span>
            </button>
          </h3>

          {isCreatingNewTopic ? (
            <form onSubmit={handleCreateTopic} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên Tiếng Anh</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Fruits, Vehicles"
                  value={newTopicNameEn}
                  onChange={(e) => setNewTopicNameEn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên Tiếng Việt</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Trái cây, Phương tiện"
                  value={newTopicNameVi}
                  onChange={(e) => setNewTopicNameVi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Icon Emoji</label>
                  <input
                    type="text"
                    placeholder="🍎, 🚗, 🏡"
                    value={newTopicIcon}
                    onChange={(e) => setNewTopicIcon(e.target.value)}
                    className="w-full px-3 py-2 text-center rounded-xl border border-slate-300 text-base"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tông màu</label>
                  <select
                    value={newTopicColor}
                    onChange={(e) => setNewTopicColor(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  >
                    <option value="amber">Hổ phách (Amber)</option>
                    <option value="sky">Xanh trời (Sky)</option>
                    <option value="emerald">Xanh lá (Emerald)</option>
                    <option value="rose">Hồng đào (Rose)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-md transition-transform active:scale-95"
              >
                Lưu Chủ Đề
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              {topics.map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    soundEffects.playPop();
                    setSelectedTopicId(t.id);
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border-2 transition-all ${
                    selectedTopicId === t.id
                      ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold shadow-sm'
                      : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <div className="text-sm font-bold">{t.name_en}</div>
                      <div className="text-xs text-slate-500 font-medium">{t.name_vi}</div>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-white rounded-full border border-slate-200 font-bold">
                    {t.total_cards || 0} thẻ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: NHẬP DANH SÁCH TỪ VÀ SINH TỰ ĐỘNG */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm space-y-5">
            {/* TIÊU ĐỀ & CHỌN NGUỒN ẢNH */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-800 font-kids flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>2. Nhập Danh Sách Từ & Chọn Nguồn Ảnh</span>
              </h3>

              {/* BỘ CHỌN NGUỒN ẢNH (Image Source Selector) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div
                  onClick={() => {
                    soundEffects.playPop();
                    setImageSource('ai_refined');
                  }}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    imageSource === 'ai_refined'
                      ? 'border-purple-400 bg-purple-50 text-purple-900 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Wand2 className={`w-5 h-5 mt-0.5 ${imageSource === 'ai_refined' ? 'text-purple-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-sm font-bold">Ảnh AI Hoạt Hình Tinh Chỉnh</div>
                    <div className="text-xs text-slate-500">Gemini Prompt Refiner + Pollinations 3D Pixar cute</div>
                  </div>
                </div>

                <div
                  onClick={() => {
                    soundEffects.playPop();
                    setImageSource('unsplash');
                  }}
                  className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                    imageSource === 'unsplash'
                      ? 'border-sky-400 bg-sky-50 text-sky-900 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <ImageIcon className={`w-5 h-5 mt-0.5 ${imageSource === 'unsplash' ? 'text-sky-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-sm font-bold">Ảnh Vector / Đồ Họa Thực</div>
                    <div className="text-xs text-slate-500">Unsplash & Pexels thư viện vector chuẩn xác 100%</div>
                  </div>
                </div>
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="Ví dụ: dolphin, kangaroo, crocodile, zebra, penguin"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              disabled={isGenerating}
              className="w-full p-4 rounded-2xl border-2 border-slate-300 focus:border-amber-400 focus:outline-none text-base font-semibold text-slate-800 placeholder-slate-400 resize-none"
            />

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {progressMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{progressMsg}</span>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-4 rounded-2xl font-black text-base shadow-bouncy flex items-center justify-center gap-2 transition-all ${
                isGenerating
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 hover:from-amber-500 hover:to-pink-600 text-white active:scale-98'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang Xử Lý & Tải Media Cục Bộ...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Tự Động Sinh Flashcards Bằng AI</span>
                </>
              )}
            </button>
          </div>

          {/* BẢNG XEM TRƯỚC (PREVIEW) CÁC THẺ VỪA SINH */}
          {generatedCards.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border-2 border-emerald-300 shadow-sm space-y-4">
              <h4 className="text-base font-bold text-emerald-800 font-kids flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Các thẻ vừa sinh ({generatedCards.length} thẻ) - Bấm 🔄 để đổi ảnh:</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {generatedCards.map((card, idx) => {
                  const isRegenerating = regeneratingCardIds[card.id];

                  return (
                    <div
                      key={card.id || idx}
                      className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 relative group"
                    >
                      {/* Vùng ảnh và nút tạo lại ảnh (Kèm Cache-busting) */}
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-emerald-300 bg-white flex-shrink-0">
                        <img
                          src={card.image_url?.includes('?') ? card.image_url : `${card.image_url}?t=${Date.now()}`}
                          alt={card.word}
                          className="w-full h-full object-cover"
                        />
                        {isRegenerating && (
                          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-base truncate">{card.word}</span>
                          <div className="flex items-center gap-1">
                            {/* Nút Tạo lại ảnh (Regenerate Image) */}
                            <button
                              onClick={() => handleRegenerateImage(card)}
                              disabled={isRegenerating}
                              className="p-1.5 rounded-full hover:bg-emerald-200 text-emerald-700 transition-transform active:scale-90 disabled:opacity-50"
                              title="Tạo lại ảnh mới"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                            </button>

                            {/* Nút Nghe thử */}
                            <button
                              onClick={() => speakWord(card.word, card.audio_url)}
                              className="p-1.5 rounded-full hover:bg-emerald-200 text-emerald-700 transition-transform active:scale-90"
                              title="Nghe phát âm"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-purple-600 font-semibold">{card.phonetic}</div>
                        <div className="text-xs font-bold text-slate-600 truncate">{card.meaning_vi}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
