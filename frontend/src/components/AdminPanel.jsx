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
  Trash2,
  Upload,
  X,
  Save,
  Layers,
  Lock,
  Zap,
  Info
} from 'lucide-react';
import {
  createTopic,
  generateBatchCards,
  regenerateCardImage,
  fetchTopicCards,
  updateCard,
  deleteCard,
  uploadCardImage,
  fetchSystemConfig
} from '../services/api';
import { speakWord } from '../services/speech';
import { soundEffects } from '../services/soundEffects';

export default function AdminPanel({ topics = [], onBack, onTopicUpdated }) {
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '');
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false);

  // System configuration (Feature Flags & Rate Limit Quota)
  const [sysConfig, setSysConfig] = useState({
    imageAiEnabled: false,
    flashcardAiEnabled: true,
    rateLimit: 5,
    remainingQuota: 5,
    usedQuota: 0
  });

  // Form for creating new Topic
  const [newTopicNameEn, setNewTopicNameEn] = useState('');
  const [newTopicNameVi, setNewTopicNameVi] = useState('');
  const [newTopicIcon, setNewTopicIcon] = useState('🍎');
  const [newTopicColor, setNewTopicColor] = useState('amber');

  // Word input and image source options
  const [wordInput, setWordInput] = useState('');
  const [imageSource, setImageSource] = useState('ai_refined'); // 'ai_refined' | 'unsplash'
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState('');

  // Cards list of currently selected topic
  const [topicCards, setTopicCards] = useState([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  // Loading state for regenerating a specific card: { [cardId]: boolean }
  const [regeneratingCardIds, setRegeneratingCardIds] = useState({});

  // State for manual card editing modal
  const [editingCard, setEditingCard] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editPhonetic, setEditPhonetic] = useState('');
  const [editMeaningVi, setEditMeaningVi] = useState('');
  const [editExampleEn, setEditExampleEn] = useState('');
  const [editExampleVi, setEditExampleVi] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState('');

  // State for custom card deletion confirmation modal
  const [deletingCard, setDeletingCard] = useState(null);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState('');

  // Manual image upload
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState('');
  const fileInputRef = useRef(null);

  // Fetch system configuration upon loading Admin panel
  const loadSystemConfig = async () => {
    try {
      const cfg = await fetchSystemConfig();
      setSysConfig(cfg);
    } catch (e) {
      console.warn('Failed to load system config:', e);
    }
  };

  useEffect(() => {
    loadSystemConfig();
  }, []);

  // Load cards when topic is selected
  const loadCardsForSelectedTopic = async (topicId) => {
    if (!topicId) return;
    try {
      setIsLoadingCards(true);
      const res = await fetchTopicCards(topicId);
      setTopicCards(res.cards || []);
    } catch (e) {
      console.error('Error loading cards for topic:', e);
    } finally {
      setIsLoadingCards(false);
    }
  };

  useEffect(() => {
    if (selectedTopicId) {
      loadCardsForSelectedTopic(selectedTopicId);
    }
  }, [selectedTopicId]);

  // Handle creating a new topic
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

  // Handle batch flashcard generation via AI with selected image source
  const handleGenerate = async () => {
    if (!selectedTopicId) {
      setError('Vui lòng chọn một chủ đề');
      return;
    }

    if (!sysConfig.flashcardAiEnabled) {
      setError('Tính năng tự động sinh thẻ bằng AI hiện đang tạm đóng theo cấu hình hệ thống');
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

    // Check remaining quota if rate limit is active
    if (sysConfig.rateLimit > 0 && wordsList.length > sysConfig.remainingQuota) {
      setError(`Bạn chỉ còn ${sysConfig.remainingQuota} lượt tạo hôm nay, nhưng đã nhập ${wordsList.length} từ. Vui lòng giảm bớt số lượng từ!`);
      return;
    }

    try {
      setError('');
      setIsGenerating(true);
      const sourceName = imageSource === 'unsplash' ? 'Vector / Thật (Unsplash)' : 'AI Tinh Chỉnh (Gemini + Pollinations)';
      setProgressMsg(`Đang phân tích và tạo media cho ${wordsList.length} từ...`);
      soundEffects.playPop();

      const result = await generateBatchCards(selectedTopicId, wordsList, imageSource);
      soundEffects.playWin();
      setWordInput('');
      setProgressMsg(`Thành công! Đã tạo và lưu ${result.cards?.length || 0} thẻ vào bộ nhớ.`);

      // Refresh quota and card list
      await Promise.all([
        loadCardsForSelectedTopic(selectedTopicId),
        loadSystemConfig()
      ]);

      if (onTopicUpdated) onTopicUpdated();
    } catch (err) {
      setError(err.message || 'Lỗi khi sinh thẻ');
      soundEffects.playPop();
      loadSystemConfig();
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle regenerating image for a single card
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

  // Open edit modal
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

  // Close edit modal
  const handleCloseEditModal = () => {
    setEditingCard(null);
    setPreviewImageSrc('');
    setEditModalError('');
  };

  // Save edited card info
  const handleSaveCardEdit = async (e) => {
    e.preventDefault();
    if (!editingCard?.id) return;

    if (!editMeaningVi.trim()) {
      setEditModalError('Nghĩa tiếng Việt của từ không được để trống');
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

      // Update local topicCards state
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

  // Upload image manually from device
  const handleManualImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editingCard?.id) return;

    // Validate image MIME type
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setEditModalError('Vui lòng chọn file ảnh đúng định dạng PNG, JPG, JPEG hoặc WEBP');
      return;
    }

    // Immediate preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewImageSrc(objectUrl);

    try {
      setIsUploadingImage(true);
      setEditModalError('');
      soundEffects.playPop();

      const res = await uploadCardImage(editingCard.id, file);
      soundEffects.playStar();

      // Update image URL
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

  // Open delete modal
  const handleOpenDeleteModal = (card) => {
    soundEffects.playPop();
    setDeletingCard(card);
    setDeleteModalError('');
  };

  // Close delete modal
  const handleCloseDeleteModal = () => {
    setDeletingCard(null);
    setDeleteModalError('');
  };

  // Confirm and execute card deletion
  const handleConfirmDelete = async () => {
    if (!deletingCard?.id) return;

    try {
      setIsDeletingCard(true);
      setDeleteModalError('');

      await deleteCard(deletingCard.id);
      soundEffects.playStar();

      // Update card list on UI immediately
      setTopicCards(prev => prev.filter(c => c.id !== deletingCard.id));

      handleCloseDeleteModal();
      if (onTopicUpdated) onTopicUpdated();
    } catch (err) {
      soundEffects.playPop();
      setDeleteModalError(err.message || 'Lỗi khi xóa thẻ');
    } finally {
      setIsDeletingCard(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
      {/* Header Admin */}
      <div className="flex items-center justify-between gap-2 mb-6 sm:mb-8 pb-4 border-b-2 border-slate-200">
        <button
          onClick={() => {
            soundEffects.playPop();
            onBack();
          }}
          className="flex items-center gap-1.5 sm:gap-2 bg-white border-2 border-slate-200 hover:border-amber-400 px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl font-bold text-slate-700 shadow-sm transition-all hover:scale-105 active:scale-95 text-xs sm:text-sm shrink-0"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          <span>Về Ứng Dụng</span>
        </button>

        <div className="text-right min-w-0">
          <h2 className="text-lg sm:text-2xl font-black text-slate-800 font-kids flex items-center gap-1.5 sm:gap-2 justify-end truncate">
            <span>⚙️ Quản Trị Flashcards</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden sm:block">
            Tự động sinh AI & Tải ảnh / Chỉnh sửa thẻ thủ công
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: SELECT / CREATE TOPIC */}
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
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border-2 transition-all ${selectedTopicId === t.id
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

        {/* RIGHT COLUMN: GENERATE FLASHCARDS & MANAGE TOPIC CARDS */}
        <div className="lg:col-span-2 space-y-6">
          {/* BLOCK 1: WORD INPUT & AI GENERATION */}
          <div className="bg-white rounded-3xl p-6 border-2 border-slate-200 shadow-sm space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-800 font-kids flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>2. Tự Động Sinh Thẻ Mới Bằng AI</span>
                </h3>

                {/* FEATURE FLAG & RATE LIMIT BADGE */}
                <div className="flex items-center gap-2">
                  {!sysConfig.flashcardAiEnabled ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Tạm đóng tạo thẻ AI</span>
                    </span>
                  ) : sysConfig.rateLimit > 0 ? (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${sysConfig.remainingQuota > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Lượt tạo AI còn lại: {sysConfig.remainingQuota}/{sysConfig.rateLimit}</span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* IMAGE SOURCE SELECTOR OR MANUAL MODE BANNER */}
              {sysConfig.imageAiEnabled ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div
                    onClick={() => {
                      soundEffects.playPop();
                      setImageSource('ai_refined');
                    }}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${imageSource === 'ai_refined'
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
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${imageSource === 'unsplash'
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
              ) : (
                <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3">
                  <div className="p-2 bg-sky-100 text-sky-700 rounded-xl shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-sky-900 flex items-center gap-1.5">
                      <span>Tải ảnh từ máy tính (PNG, JPG, WEBP)</span>
                    </div>
                    <p className="text-xs text-sky-700 mt-0.5">
                      💡 Chế độ tải ảnh thủ công để tối ưu tài nguyên. Sau khi hệ thống sinh dữ liệu từ vựng & âm thanh chuẩn bản xứ, bạn có thể bấm nút Sửa (<Edit3 className="w-3 h-3 inline text-amber-700" />) trên từng thẻ để tải ảnh tùy thích từ máy tính!
                    </p>
                  </div>
                </div>
              )}
            </div>

            <textarea
              rows={3}
              placeholder="Ví dụ: dolphin, kangaroo, crocodile, zebra, penguin"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              disabled={isGenerating || !sysConfig.flashcardAiEnabled || (sysConfig.rateLimit > 0 && sysConfig.remainingQuota <= 0)}
              className="w-full p-4 rounded-2xl border-2 border-slate-300 focus:border-amber-400 focus:outline-none text-base font-semibold text-slate-800 placeholder-slate-400 resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
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
              disabled={isGenerating || !sysConfig.flashcardAiEnabled || (sysConfig.rateLimit > 0 && sysConfig.remainingQuota <= 0)}
              className={`w-full py-3.5 rounded-2xl font-black text-base shadow-bouncy flex items-center justify-center gap-2 transition-all ${isGenerating || !sysConfig.flashcardAiEnabled || (sysConfig.rateLimit > 0 && sysConfig.remainingQuota <= 0)
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500 hover:from-amber-500 hover:to-pink-600 text-white active:scale-98'
                }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang Xử Lý & Tải Media Cục Bộ...</span>
                </>
              ) : !sysConfig.flashcardAiEnabled ? (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Tạm Đóng Tạo Thẻ AI</span>
                </>
              ) : sysConfig.rateLimit > 0 && sysConfig.remainingQuota <= 0 ? (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Đã Hết Lượt Tạo AI Hôm Nay</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Tự Động Sinh Flashcards Bằng AI</span>
                </>
              )}
            </button>
          </div>

          {/* BLOCK 2: TOPIC CARDS LIST & EDIT / UPLOAD ACTIONS */}
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
                      {/* Image container */}
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

                      {/* Word info and action buttons */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-black text-slate-800 text-base truncate" title={card.word}>
                            {card.word}
                          </span>

                          {/* Action buttons: Edit, Delete/Lock, AI Regenerate, Speak */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Manual Edit button */}
                            <button
                              onClick={() => handleOpenEditModal(card)}
                              className="p-1.5 rounded-full hover:bg-amber-200 text-amber-800 transition-transform active:scale-90"
                              title="Chỉnh sửa thông tin & Tải ảnh thủ công"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* User custom card: Delete button (Trash); System card: Lock icon */}
                            {card.is_custom === 1 ? (
                              <button
                                onClick={() => handleOpenDeleteModal(card)}
                                className="p-1.5 rounded-full hover:bg-rose-100 text-rose-600 transition-transform active:scale-90"
                                title="Xóa thẻ từ vựng này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div
                                className="p-1.5 rounded-full text-slate-400 bg-slate-100/80 cursor-default flex items-center justify-center"
                                title="Thẻ mặc định của hệ thống (không thể xóa)"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </div>
                            )}

                            {/* AI Regenerate Image button (only shown when imageAiEnabled = true) */}
                            {sysConfig.imageAiEnabled && (
                              <button
                                onClick={() => handleRegenerateImage(card)}
                                disabled={isRegenerating}
                                className="p-1.5 rounded-full hover:bg-purple-200 text-purple-700 transition-transform active:scale-90 disabled:opacity-50"
                                title="Đổi ảnh mới bằng AI"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                              </button>
                            )}

                            {/* Pronunciation button */}
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

      {/* ==================== MODAL: CARD EDIT & MANUAL IMAGE UPLOAD ==================== */}
      <AnimatePresence>
        {editingCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border-4 border-amber-300 max-h-[90vh] overflow-y-auto space-y-5 relative"
            >
              {/* Close modal button */}
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

              {/* MANUAL IMAGE UPLOAD SECTION */}
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

              {/* FIELD EDITING FORM */}
              <form onSubmit={handleSaveCardEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Từ tiếng Anh (Word)</span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Đã khóa</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={editWord}
                      readOnly
                      disabled
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-bold text-sm cursor-not-allowed focus:outline-none select-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                      🔒 Không thể thay đổi từ vựng gốc để đảm bảo đồng bộ tệp hình ảnh và âm thanh.
                    </p>
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

      {/* ==================== MODAL: CONFIRM DELETE CUSTOM CARD ==================== */}
      <AnimatePresence>
        {deletingCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-rose-100 text-center space-y-4"
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shadow-sm">
                <Trash2 className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-800 font-kids">
                  Xác Nhận Xóa Thẻ?
                </h3>
                <p className="text-sm text-slate-600">
                  Bé/Phụ huynh có chắc chắn muốn xóa thẻ từ vựng{' '}
                  <span className="font-bold text-rose-600 underline decoration-rose-300">
                    "{deletingCard.word}"
                  </span>{' '}
                  không?
                </p>
                <p className="text-xs text-slate-400">
                  Thẻ và các file liên quan sẽ được gỡ bỏ khỏi hệ thống.
                </p>
              </div>

              {deleteModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{deleteModalError}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  disabled={isDeletingCard}
                  className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Hủy bỏ
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeletingCard}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-sm rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isDeletingCard ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Xóa Thẻ</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
