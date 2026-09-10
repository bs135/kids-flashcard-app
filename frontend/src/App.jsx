import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TopicMap from './components/TopicMap';
import FlashcardViewer from './components/FlashcardViewer';
import { fetchTopics, fetchTopicCards, fetchUserProgress } from './services/api';
import { soundEffects } from './services/soundEffects';

export default function App() {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [currentCards, setCurrentCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(0);

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
        setStars(progressData.stars || 0);
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
  };

  // Cộng sao cho bé khi hoàn thành
  const handleEarnStar = (amount = 1) => {
    soundEffects.playStar();
    setStars(prev => {
      const newStars = prev + amount;
      localStorage.setItem('kids_stars', newStars.toString());
      return newStars;
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Thanh Header trên cùng */}
      <Header
        stars={stars}
        currentTopic={selectedTopic}
        onBackToMap={handleBackToMap}
      />

      {/* Vùng Nội Dung Chính */}
      <main className="flex-1 flex flex-col justify-center">
        {loading ? (
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
          />
        )}
      </main>

      {/* Footer nhỏ nhẹ */}
      <footer className="py-4 text-center text-xs font-semibold text-slate-400">
        Kids English Flashcard App • Học Vui Mỗi Ngày
      </footer>
    </div>
  );
}
