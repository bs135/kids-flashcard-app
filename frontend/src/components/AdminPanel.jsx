import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, ArrowLeft, Volume2, CheckCircle2, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { createTopic, generateBatchCards } from '../services/api';
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

  // Input từ vựng
  const [wordInput, setWordInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');
  const [generatedCards, setGeneratedCards] = useState([]);

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

  // Xử lý sinh thẻ hàng loạt bằng AI
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
      setProgressMsg(`Đang gọi AI phân tích nghĩa, phiên âm và tải media cho ${wordsList.length} từ...`);
      soundEffects.playPop();

      const result = await generateBatchCards(selectedTopicId, wordsList);
      soundEffects.playWin();
      setGeneratedCards(result.cards || []);
      setWordInput('');
      setProgressMsg(`Thành công! Đã tạo và lưu ${result.cards?.length || 0} thẻ vào máy.`);
      if (onTopicUpdated) onTopicUpdated();
    } catch (err) {
      setError(err.message || 'Lỗi khi sinh thẻ');
      soundEffects.playPop();
    } finally {
      setIsGenerating(false);
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
            Thêm từ vựng tự động với Gemini AI & Edge-TTS
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
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800 font-kids flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>2. Nhập Danh Sách Từ Vựng Cần Sinh</span>
            </h3>

            <p className="text-xs text-slate-500">
              Nhập hoặc dán các từ tiếng Anh (ngăn cách bằng dấu phẩy hoặc xuống dòng). Hệ thống sẽ tự động tạo nghĩa tiếng Việt cho trẻ em, phiên âm chuẩn IPA, tải ảnh hoạt hình cute và giọng đọc AI bản xứ.
            </p>

            <textarea
              rows={4}
              placeholder="Ví dụ: giraffe, kangaroo, crocodile, dolphin, zebra"
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
                <span>Các thẻ vừa được sinh thành công ({generatedCards.length} thẻ):</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {generatedCards.map((card, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200"
                  >
                    <img
                      src={card.image_url}
                      alt={card.word}
                      className="w-16 h-16 rounded-xl object-cover border border-emerald-300 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-base">{card.word}</span>
                        <button
                          onClick={() => speakWord(card.word, card.audio_url)}
                          className="p-1 rounded-full hover:bg-emerald-200 text-emerald-700"
                          title="Nghe thử"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-purple-600 font-semibold">{card.phonetic}</div>
                      <div className="text-xs font-bold text-slate-600 truncate">{card.meaning_vi}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
