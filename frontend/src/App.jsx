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

  // Admin & Parental Gate state management
  const [isParentalGateOpen, setIsParentalGateOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Virtual Pet & Mini-Games state management
  const [isPetOpen, setIsPetOpen] = useState(false);
  const [activeGame, setActiveGame] = useState(null); // 'bubble' | 'memory' | null

  // Load initial data from Backend
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
        console.error('Error fetching initial data from server:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Handle selecting a topic island
  const handleSelectTopic = async (topic) => {
    try {
      setLoading(true);
      const data = await fetchTopicCards(topic.id);
      setSelectedTopic(topic);
      setCurrentCards(data.cards || []);
      setActiveGame(null);
    } catch (err) {
      console.error('Error loading cards for topic:', err);
      alert('Không thể tải các thẻ của chủ đề này!');
    } finally {
      setLoading(false);
    }
  };

  // Navigate back to topic map
  const handleBackToMap = () => {
    setSelectedTopic(null);
    setCurrentCards([]);
    setActiveGame(null);
  };

  // Add / Deduct stars
  const handleUpdateStars = (amount) => {
    setStars(prev => {
      const newStars = Math.max(0, prev + amount);
      localStorage.setItem('kids_stars', newStars.toString());
      return newStars;
    });
  };

  // Reward stars upon completing cards or winning mini-games
  const handleEarnStar = (amount = 1) => {
    soundEffects.playStar();
    handleUpdateStars(amount);
  };

  // Refresh topic catalog when cards or topics are created by Admin
  const handleRefreshTopics = async () => {
    try {
      const data = await fetchTopics();
      setTopics(data);
    } catch (err) {
      console.error('Error refreshing topics:', err);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden bg-slate-50 select-none">
      {/* Top Header Navigation (Fixed Height Shell Layer) */}
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

      {/* Main Viewport Content Area */}
      <main className="flex-1 min-h-0 w-full relative overflow-hidden flex flex-col">
        {isAdminOpen ? (
          /* Type 2: Scrollable Document Screen */
          <div className="w-full h-full overflow-y-auto p-3 sm:p-6 max-w-5xl mx-auto">
            <AdminPanel
              topics={topics}
              onBack={() => setIsAdminOpen(false)}
              onTopicUpdated={handleRefreshTopics}
            />
          </div>
        ) : activeGame === 'bubble' ? (
          /* Type 1: App / Game Screen */
          <div className="w-full h-full flex flex-col justify-between overflow-hidden p-2 sm:p-4 max-w-4xl mx-auto">
            <BubbleQuiz
              topics={topics}
              initialTopic={selectedTopic}
              onBack={handleBackToMap}
              onEarnStar={handleEarnStar}
            />
          </div>
        ) : activeGame === 'memory' ? (
          /* Type 1: App / Game Screen */
          <div className="w-full h-full flex flex-col justify-between overflow-hidden p-2 sm:p-4 max-w-4xl mx-auto">
            <MemoryGame
              topics={topics}
              initialTopic={selectedTopic}
              onBack={handleBackToMap}
              onEarnStar={handleEarnStar}
            />
          </div>
        ) : loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="text-6xl animate-bounce mb-4">🚀</div>
            <p className="text-xl font-bold text-amber-800 font-kids">
              Đang chuẩn bị thẻ cho bé...
            </p>
          </div>
        ) : selectedTopic ? (
          /* Type 1: App / Game Screen */
          <div className="w-full h-full flex flex-col justify-between overflow-hidden p-2 sm:p-4 max-w-4xl mx-auto">
            <FlashcardViewer
              topic={selectedTopic}
              cards={currentCards}
              onBackToHome={handleBackToMap}
              onEarnStar={handleEarnStar}
            />
          </div>
        ) : (
          /* Type 2: Scrollable Document Screen */
          <div className="w-full h-full overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto">
            <TopicMap
              topics={topics}
              onSelectTopic={handleSelectTopic}
              onSelectGame={(gameType) => setActiveGame(gameType)}
            />
          </div>
        )}
      </main>

      {/* Virtual Pet Modal */}
      <VirtualPetModal
        isOpen={isPetOpen}
        onClose={() => setIsPetOpen(false)}
        stars={stars}
        onUpdateStars={handleUpdateStars}
      />

      {/* Parental Gate Security Modal */}
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

      {/* Standard App Footer */}
      <footer className="w-full shrink-0 py-1.5 px-4 text-center text-xs text-slate-400 border-t border-slate-100 bg-white/80 z-20">
        Kids English Flashcard App • Học Vui Mỗi Ngày • v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.1.0'}
      </footer>
    </div>
  );
}
