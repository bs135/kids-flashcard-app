import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TopicMap from './components/TopicMap';
import FlashcardViewer from './components/FlashcardViewer';
import ParentalGateModal from './components/ParentalGateModal';
import AdminPanel from './components/AdminPanel';
import VirtualPetModal from './components/VirtualPetModal';
import BubbleQuiz from './components/BubbleQuiz';
import MemoryGame from './components/MemoryGame';
import { fetchTopics, fetchTopicCards, fetchUserProgress } from './services/api';
import { soundEffects } from './services/soundEffects';

export default function App() {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentCards, setCurrentCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(() => {
    return parseInt(localStorage.getItem('kids_stars') || '0', 10);
  });

  // Quản lý trạng thái Admin & Parental Gate
  const [isParentalGateOpen, setIsParentalGateOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Quản lý trạng thái Thú Cưng Ảo & Mini-Games
  const [isPetOpen, setIsPetOpen] = useState(false);
  const [activeGame, setActiveGame] = useState(null); // 'bubble' | 'memory' | null

  // Tải dữ liệu ban đầu từ Backend
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [topicsData, progressData] = await Promise.all([
          fetchTopics(),
          fetchUserProgress()
        ]);
        setTopics(topicsData);
        if (progressData && progressData.stars !== undefined) {
          const storedStars = parseInt(localStorage.getItem('kids_stars') || '0', 10);
          const initialStars = Math.max(progressData.stars || 0, storedStars);
          setStars(initialStars);
          localStorage.setItem('kids_stars', initialStars.toString());
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu từ máy chủ:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Xử lý khi bé chọn một hòn đảo chủ đề
  const handleSelectTopic = async (topic) => {
    try {
      setLoading(true);
      const data = await fetchTopicCards(topic.id);
      setSelectedTopic(topic);
      setCurrentCards(data.cards || []);
      setActiveGame(null);
    } catch (err) {
      console.error('Lỗi tải thẻ của chủ đề:', err);
      alert('Không thể tải các thẻ của chủ đề này!');
    } finally {
      setLoading(false);
    }
  };

  // Quay về bản đồ chủ đề
  const handleBackToMap = () => {
    setSelectedTopic(null);
    setCurrentCards([]);
    setActiveGame(null);
  };

  // Cộng / Trừ sao cho bé
  const handleUpdateStars = (amount) => {
    setStars(prev => {
      const newStars = Math.max(0, prev + amount);
      localStorage.setItem('kids_stars', newStars.toString());
      return newStars;
    });
  };

  // Cộng sao khi học xong thẻ hoặc thắng mini-game
  const handleEarnStar = (amount = 1) => {
    soundEffects.playStar();
    handleUpdateStars(amount);
  };

  // Tải lại danh sách chủ đề khi Admin tạo thêm từ/chủ đề
  const handleRefreshTopics = async () => {
    try {
      const data = await fetchTopics();
      setTopics(data);
    } catch (err) {
      console.error('Lỗi làm mới chủ đề:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Thanh Header trên cùng */}
      <Header
        stars={stars}
        currentTopic={selectedTopic}
        onBackToMap={handleBackToMap}
        onOpenAdmin={() => setIsParentalGateOpen(true)}
        onOpenPet={() => setIsPetOpen(true)}
        onOpenGames={() => {
          setActiveGame(activeGame ? null : 'bubble');
          setSelectedTopic(null);
        }}
      />

      {/* Vùng Nội Dung Chính */}
      <main className="flex-1 flex flex-col justify-center">
        {isAdminOpen ? (
          <AdminPanel
            topics={topics}
            onBack={() => setIsAdminOpen(false)}
            onTopicUpdated={handleRefreshTopics}
          />
        ) : activeGame === 'bubble' ? (
          <BubbleQuiz
            topics={topics}
            initialTopic={selectedTopic}
            onBack={handleBackToMap}
            onEarnStar={handleEarnStar}
          />
        ) : activeGame === 'memory' ? (
          <MemoryGame
            topics={topics}
            initialTopic={selectedTopic}
            onBack={handleBackToMap}
            onEarnStar={handleEarnStar}
          />
        ) : loading ? (
          <div className="text-center py-20">
            <div className="text-6xl animate-bounce mb-4">🚀</div>
            <p className="text-xl font-bold text-amber-800 font-kids">
              Đang chuẩn bị thẻ cho bé...
            </p>
          </div>
        ) : selectedTopic ? (
          <FlashcardViewer
            topic={selectedTopic}
            cards={currentCards}
            onBackToHome={handleBackToMap}
            onEarnStar={handleEarnStar}
          />
        ) : (
          <TopicMap
            topics={topics}
            onSelectTopic={handleSelectTopic}
            onSelectGame={(gameType) => setActiveGame(gameType)}
          />
        )}
      </main>

      {/* Modal Thú Cưng Ảo (Dino) */}
      <VirtualPetModal
        isOpen={isPetOpen}
        onClose={() => setIsPetOpen(false)}
        stars={stars}
        onUpdateStars={handleUpdateStars}
      />

      {/* Cổng Bảo Vệ Phụ Huynh */}
      <ParentalGateModal
        isOpen={isParentalGateOpen}
        onClose={() => setIsParentalGateOpen(false)}
        onSuccess={() => {
          setIsParentalGateOpen(false);
          setIsAdminOpen(true);
          setSelectedTopic(null);
          setActiveGame(null);
        }}
      />

      {/* Footer nhỏ nhẹ */}
      <footer className="py-4 text-center text-xs font-semibold text-slate-400">
        Kids English Flashcard App • Học Vui Mỗi Ngày • v1.0.0
      </footer>
    </div>
  );
}
