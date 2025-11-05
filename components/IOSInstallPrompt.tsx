import React, { useState, useEffect } from 'react';
import { X, Share, Plus, Square } from 'lucide-react';

interface IOSInstallPromptProps {
  onClose?: () => void;
}

export const IOSInstallPrompt: React.FC<IOSInstallPromptProps> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if it's iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    // Check if already dismissed
    const isDismissed = localStorage.getItem('ios-pwa-prompt-dismissed') === 'true';
    
    // Show banner only on iOS Safari, not in standalone mode, and not previously dismissed
    if (isIOS && !isInStandaloneMode && !isDismissed) {
      // Delay to avoid intrusive immediate popup
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('ios-pwa-prompt-dismissed', 'true');
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/10 p-2 rounded-lg backdrop-blur">
                  <Square className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Установите приложение</h3>
                  <p className="text-sm text-white/90">Anóteros Lógos</p>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-lg p-3 mb-3">
                <p className="text-sm font-medium mb-2">Быстрый доступ с главного экрана:</p>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">1.</span>
                    <span>Нажмите</span>
                    <Share className="w-4 h-4 inline-block" />
                    <span className="font-semibold">Поделиться</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">2.</span>
                    <span>Выберите</span>
                    <Plus className="w-4 h-4 inline-block" />
                    <span className="font-semibold">На экран &quot;Домой&quot;</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Работает офлайн</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Быстрый запуск</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Полноэкранный режим</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Bottom safe area for iOS notch */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-[env(safe-area-inset-bottom)]"></div>
    </div>
  );
};
