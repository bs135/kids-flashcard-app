import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Plus, 
  ArrowLeft, 
  Volume2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Image as ImageIcon, 
  Wand2, 
  Edit3, 
  Upload, 
  X, 
  Save, 
  Layers
} from 'lucide-react';
import { createTopic, generateBatchCards, regenerateCardImage, fetchTopicCards, updateCard, uploadCardImage } from '../services/api';
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

  // Danh sách thẻ hiện tại của chủ đề đã chọn
  const [topicCards, setTopicCards] = useState([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  // Loading state cho việc regenerate từng thẻ cụ thể: { [cardId]: boolean }
  const [regeneratingCardIds, setRegeneratingCardIds] = useState({});

  // State Modal chỉnh sửa thẻ thủ công
  const [editingCard, setEditingCard] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editPhonetic, setEditPhonetic] = useState('');
  const [editMeaningVi, setEditMeaningVi] = useState('');
  const [editExampleEn, setEditExampleEn] = useState('');
  const [editExampleVi, setEditExampleVi] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState('');

  // Upload ảnh thủ công
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const fileInputRef = useRef(null);

  // Tải danh sách thẻ khi chọn chủ đề
  const loadCardsForSelectedTopic = async (topicId) => {
    if (!topicId) return;
    try {
      setIsLoadingCards(true);
      const res = await fetchTopicCards(topicId);
      setTopicCards(res.cards || []);
    } catch (e) {
      console.error('Lỗi tải thẻ cho chủ đề:', e);
    } finally {
      setIsLoadingCards(false);
    }
  };

  useEffect(() => {
    if (selectedTopicId) {
      loadCardsForSelectedTopic(selectedTopicId);
    }
  }, [selectedTopicId]);

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
      setWordInput('');
      setProgressMsg(`Thành công! Đã tạo và lưu ${result.cards?.length || 0} thẻ vào bộ nhớ.`);
      await loadCardsForSelectedTopic(selectedTopicId);
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

      const baseCleanUrl = res.card.image_url.split('?')[0];
      const freshUrl = `${baseCleanUrl}?t=${Date.now()}`;

      setTopicCards(prevCards =>
        prevCards.map(c => (c.id === cardId ? { ...c, image_url: freshUrl } : c))
      );

      if (onTopicUpdated) onTopicUpdated();
    } catch (err) {
      alert(`Không thể tạo lại ảnh: ${err.message}`);
    } finally {
      setRegeneratingCardIds(prev => ({ ...prev, [cardId]: false }));
    }
  };

  // Mở Modal chỉnh sửa thẻ
  const handleOpenEditModal = (card) => {
    soundEffects.playPop();
    setEditingCard(card);
    setEditWord(card.word || '');
    setEditPhonetic(card.phonetic || '');
    setEditMeaningVi(card.meaning_vi || '');
    setEditExampleEn(card.example_en || '');
    setEditExampleVi(card.example_vi || '');
    setEditImageUrl(card.image_url || '');
    setPreviewImageSrc('');
    setEditModalError('');
  };

  // Đóng Modal chỉnh sửa
  const handleCloseEditModal = () => {
    setEditingCard(null);
    setPreviewImageSrc('');
    setEditModalError('');
  };

  // Lưu thông tin chỉnh sửa thẻ
  const handleSaveCardEdit = async (e) => {
    e.preventDefault();
    if (!editingCard?.id) return;

    if (!editWord.trim() || !editMeaningVi.trim()) {
      setEditModalError('Từ vựng tiếng Anh và nghĩa tiếng Việt không được để trống');
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditModalError('');

      const res = await updateCard(editingCard.id, {
        word: editWord.trim(),
        phonetic: editPhonetic.trim(),
        meaning_vi: editMeaningVi.trim(),
        example_en: editExampleEn.trim(),
        example_vi: editExampleVi.trim(),
        image_url: editImageUrl.trim()
      });

      soundEffects.playStar();

      // Cập nhật state topicCards cục bộ
      setTopicCards(prev =>
        prev.map(c => (c.id === editingCard.id ? { ...c, ...res.card } : c))
      );

      handleCloseEditModal();
      if (onTopicUpdated) onTopicUpdated();
    } catch (err) {
      setEditModalError(err.message || 'Lỗi khi lưu thẻ');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Upload ảnh thủ công từ máy tính
  const handleManualImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingCard?.id) return;

    // Kiểm tra định dạng
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setEditModalError('Vui lòng chọn file ảnh đúng định dạng PNG, JPG, JPEG hoặc WEBP');
      return;
    }

    // Hiển thị preview ngay lập tức
    const objectUrl = URL.createObjectURL(file);
    setPreviewImageSrc(objectUrl);

    try {
      setIsUploadingImage(true);
      setEditModalError('');
      soundEffects.playPop();

      const res = await uploadCardImage(editingCard.id, file);
      soundEffects.playStar();

      // Cập nhật URL ảnh mới
      setEditImageUrl(res.image_url);
      setTopicCards(prev =>
        prev.map(c => (c.id === editingCard.id ? { ...c, image_url: res.image_url } : c))
      );

      if (onTopicUpdated) onTopicUpdated();
    } catch (err) {
      setEditModalError(err.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header Admin */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-slate-200">
        <button
          onClick={() => {
            soundEffects.playPop();
            onBack();
          }}
          className="flex items-center gap-2 bg-white border-2 border-slate-200 hover:border-amber-400 px-4 py-2 rounded-2xl font-bold text-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 text-amber-500" />
          <span>Về Ứng Dụng</span>
        </button>

        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-800 font-kids flex items-center gap-2 justify-end">
            <span>⚙️ Quản Trị Flashcards</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Tự động sinh AI & Tải ảnh / Chỉnh sửa thẻ thủ công
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
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
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
                  <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                    <span className="text-2xl shrink-0">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{t.name_en}</div>
                      <div className="text-xs text-slate-500 font-medium truncate">{t.name_vi}</div>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs px-2.5 py-1 bg-white rounded-full border border-slate-200 font-bold shadow-sm">
                    {t.total_cards || 0} thẻ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: TẠO THẺ & QUẢN LÝ DANH SÁCH THẺ CỦA CHỦ ĐỀ */}
        <div className="lg:col-span-2 space-y-6">
          {/* KHỐI 1: NHẬP TỪ & SINH AI */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm space-y-5">
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-800 font-kids flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>2. Tự Động Sinh Thẻ Mới Bằng AI</span>
              </h3>

              {/* BỘ CHỌN NGUỒN ẢNH */}
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
              rows={3}
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
              className={`w-full py-3.5 rounded-2xl font-black text-base shadow-bouncy flex items-center justify-center gap-2 transition-all ${
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

          {/* KHỐI 2: DANH SÁCH THẺ CỦA CHỦ ĐỀ VÀ TÍNH NĂNG CHỈNH SỬA / UPLOAD ẢNH */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-800 font-kids flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-500" />
                <span>Danh sách thẻ trong chủ đề ({topicCards.length} thẻ):</span>
              </h4>
              <button
                onClick={() => loadCardsForSelectedTopic(selectedTopicId)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-bold p-1 rounded-lg hover:bg-slate-100"
                title="Làm mới danh sách"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCards ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>

            {isLoadingCards ? (
              <div className="py-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-500" />
                <span className="text-xs font-bold">Đang tải danh sách thẻ...</span>
              </div>
            ) : topicCards.length === 0 ? (
              <div className="py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                <span className="text-sm font-semibold">Chưa có thẻ nào trong chủ đề này. Hãy nhập từ vựng bên trên để tạo nhé!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {topicCards.map((card, idx) => {
                  const isRegenerating = regeneratingCardIds[card.id];

                  return (
                    <div
                      key={card.id || idx}
                      className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-amber-50/50 rounded-2xl border border-slate-200 transition-all group"
                    >
                      {/* Vùng ảnh */}
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-300 bg-white flex-shrink-0">
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

                      {/* Nội dung từ & các nút hành động */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-800 text-base truncate">{card.word}</span>
                          
                          {/* Các nút tương tác: Sửa, Đổi ảnh AI, Nghe */}
                          <div className="flex items-center gap-1">
                            {/* Nút Chỉnh sửa thủ công */}
                            <button
                              onClick={() => handleOpenEditModal(card)}
                              className="p-1.5 rounded-full hover:bg-amber-200 text-amber-800 transition-transform active:scale-90"
                              title="Chỉnh sửa thông tin & Tải ảnh thủ công"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Nút Tạo lại ảnh AI */}
                            <button
                              onClick={() => handleRegenerateImage(card)}
                              disabled={isRegenerating}
                              className="p-1.5 rounded-full hover:bg-purple-200 text-purple-700 transition-transform active:scale-90 disabled:opacity-50"
                              title="Đổi ảnh mới bằng AI"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                            </button>

                            {/* Nút Nghe phát âm */}
                            <button
                              onClick={() => speakWord(card.word, card.audio_url)}
                              className="p-1.5 rounded-full hover:bg-sky-200 text-sky-700 transition-transform active:scale-90"
                              title="Nghe phát âm"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-purple-600 font-semibold">{card.phonetic || '/.../'}</div>
                        <div className="text-xs font-bold text-slate-600 truncate">{card.meaning_vi}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== MODAL CHỈNH SỬA THẺ & TẢI ẢNH THỦ CÔNG ==================== */}
      <AnimatePresence>
        {editingCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-4 border-amber-300 max-h-[90vh] overflow-y-auto space-y-5 relative"
            >
              {/* Nút đóng modal */}
              <button
                onClick={handleCloseEditModal}
                className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-xl">
                  ✏️
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 font-kids">
                    Chỉnh Sửa Thẻ Flashcard
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Cập nhật thông tin chi tiết và tải ảnh tùy chọn
                  </p>
                </div>
              </div>

              {/* KHU VỰC UPLOAD HÌNH ẢNH THỦ CÔNG */}
              <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-300 flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-300 bg-white shadow-sm flex-shrink-0">
                  <img
                    src={previewImageSrc || (editImageUrl?.includes('?') ? editImageUrl : `${editImageUrl}?t=${Date.now()}`)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="text-xs font-bold text-slate-700">Hình ảnh của thẻ:</div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleManualImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="flex items-center gap-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isUploadingImage ? 'Đang tải lên & nén...' : 'Tải ảnh từ máy tính'}</span>
                  </button>
                  <p className="text-[11px] text-slate-500">
                    Hỗ trợ PNG, JPG, WEBP (Tự nén sang .webp chuẩn 85%)
                  </p>
                </div>
              </div>

              {/* FORM CHỈNH SỬA CÁC TRƯỜNG DỮ LIỆU */}
              <form onSubmit={handleSaveCardEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Từ tiếng Anh (Word) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editWord}
                      onChange={(e) => setEditWord(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phiên âm (Phonetic IPA)
                    </label>
                    <input
                      type="text"
                      value={editPhonetic}
                      onChange={(e) => setEditPhonetic(e.target.value)}
                      placeholder="/.../"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-purple-700 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nghĩa tiếng Việt <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editMeaningVi}
                    onChange={(e) => setEditMeaningVi(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Câu ví dụ tiếng Anh (Example)
                  </label>
                  <input
                    type="text"
                    value={editExampleEn}
                    onChange={(e) => setEditExampleEn(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dịch nghĩa câu ví dụ (Example Translation)
                  </label>
                  <input
                    type="text"
                    value={editExampleVi}
                    onChange={(e) => setEditExampleVi(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {editModalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{editModalError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Hủy bỏ
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingEdit || isUploadingImage}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-black text-sm rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50"
                  >
                    {isSavingEdit ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang lưu...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Lưu Thay Đổi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
