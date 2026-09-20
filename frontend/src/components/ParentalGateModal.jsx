import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, ShieldAlert } from 'lucide-react';
import { soundEffects } from '../services/soundEffects';

export default function ParentalGateModal({ isOpen, onClose, onSuccess }) {
  const [num1, setNum1] = useState(3);
  const [num2, setNum2] = useState(4);
  const [answer, setAnswer] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Generate a new math problem whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      const a = Math.floor(Math.random() * 5) + 3; // 3 - 7
      const b = Math.floor(Math.random() * 6) + 4; // 4 - 9
      setNum1(a);
      setNum2(b);
      setAnswer('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = parseInt(answer.trim(), 10);
    if (parsed === num1 * num2) {
      soundEffects.playStar();
      onSuccess();
    } else {
      soundEffects.playPop();
      setErrorMsg('Câu trả lời chưa chính xác! Vui lòng thử lại.');
      setAnswer('');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white rounded-3xl p-5 sm:p-8 max-w-md w-full shadow-2xl border-3 sm:border-4 border-amber-300 relative select-none my-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Lock className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold text-slate-800 font-kids">
              Cổng Xác Nhận Phụ Huynh
            </h3>
            <p className="text-sm text-slate-500 font-medium">
              Khu vực dành riêng cho cha mẹ. Vui lòng giải phép tính đơn giản dưới đây để tiếp tục:
            </p>

            {/* Protective math question */}
            <div className="py-4 px-6 bg-amber-50 rounded-2xl border-2 border-amber-200 inline-block my-2">
              <span className="text-3xl sm:text-4xl font-black text-amber-900 tracking-wider">
                {num1} &times; {num2} = ?
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <input
                type="number"
                pattern="[0-9]*"
                inputMode="numeric"
                autoFocus
                placeholder="Nhập kết quả..."
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full text-center text-2xl font-bold px-4 py-3 rounded-2xl border-2 border-slate-300 focus:border-amber-500 focus:outline-none"
              />

              {errorMsg && (
                <p className="text-sm font-bold text-rose-500 flex items-center justify-center gap-1">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold shadow-md transition-transform active:scale-95"
                >
                  Xác Nhận
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
