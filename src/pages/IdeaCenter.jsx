import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const IdeaCenter = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [fadeClass, setFadeClass] = useState('opacity-100');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const { user } = useAuth();
  const { language } = useLanguage();

  // Loading mesajları
  const loadingMessages = language === 'tr' 
    ? [
      "Düşünüyorum...",
      "Harika bir soru! Hemen cevaplıyorum...",
      "Bu konuda size yardımcı olacağım...",
      "Yanıtımı hazırlıyorum...",
      "Bilgilerimi gözden geçiriyorum...",
      "En iyi cevabı oluşturuyorum...",
      "Biraz daha bekleyin, detaylı bir yanıt hazırlıyorum...",
      "Bu soruyu cevaplamak için sabırsızlanıyorum..."
    ]
    : [
      "Thinking...",
      "Great question! Answering now...",
      "I'll help you with this...",
      "Preparing my response...",
      "Reviewing my knowledge...",
      "Creating the best answer...",
      "Please wait, preparing a detailed response...",
      "I'm eager to answer this question..."
    ];

  // Örnek sorular listesi
  const sampleQuestions = language === 'tr'
    ? [
      "1-2 yaş grubu için duyusal oyun önerileri verebilir misin? Özellikle dokunma duyusunu geliştirecek aktiviteler arıyorum.",
      "3 yaş grubu için İngilizce oyun atölyemde öğretebileceğim eğlenceli bir aktivite önerir misin?",
      "2 yaş çocuklar için müzikli ve hareketli bir İngilizce aktivite arıyorum, ne önerirsin?",
      "4 yaş grubu için hayvan seslerini İngilizce öğretebileceğimiz eğlenceli bir oyun önerir misin?",
      "1.5 yaş bebekler için güvenli sensory play aktiviteleri neler olabilir?",
      "3-4 yaş grubu için basit İngilizce şarkılar eşliğinde oynayabileceğimiz oyunlar nelerdir?",
      "2-3 yaş çocuklar için mevsim temalı duyusal oyun önerilerin neler?",
      "4 yaş grubu için vücut parçalarını İngilizce öğretebileceğim interaktif bir aktivite arıyorum, ne önerirsin?",
      "1-2 yaş arası çocuklar için su bazlı güvenli duyusal oyun önerileri verebilir misin?",
      "3 yaş grubu için günlük rutinleri İngilizce öğretebileceğimiz eğlenceli aktiviteler nelerdir?",
      "2 yaş grubu için el-göz koordinasyonunu geliştirecek duyusal oyunlar önerir misin?",
      "4 yaş için sayıları İngilizce öğretirken kullanabileceğimiz duyusal materyal fikirleri neler olabilir?",
      "1-3 yaş arası karışık yaş grubu için uygun sensory bin aktiviteleri nelerdir?",
      "3-4 yaş için hava durumunu İngilizce öğretebileceğimiz eğlenceli bir aktivite önerir misin?",
      "2 yaş çocuklar için duyu bütünleme aktiviteleri içeren İngilizce oyun önerilerin neler?"
    ]
    : [
      "Can you suggest sensory play ideas for ages 1-2? I'm looking for activities that develop the sense of touch.",
      "Could you recommend a fun activity I can teach in my English play workshop for 3-year-olds?",
      "I'm looking for a musical and active English activity for 2-year-olds, what do you suggest?",
      "Can you suggest a fun game to teach animal sounds in English for a 4-year-old group?",
      "What safe sensory play activities might work for 1.5-year-old babies?",
      "What games can we play with simple English songs for 3-4 year olds?",
      "What are your seasonal-themed sensory play suggestions for 2-3 year old children?",
      "I'm looking for an interactive activity to teach body parts in English to a 4-year-old group, what do you suggest?",
      "Can you suggest safe water-based sensory play ideas for children ages 1-2?",
      "What are fun activities to teach daily routines in English to a 3-year-old group?",
      "Can you suggest sensory games that develop hand-eye coordination for 2-year-olds?",
      "What sensory material ideas could we use when teaching numbers in English for 4-year-olds?",
      "What are appropriate sensory bin activities for mixed age groups between 1-3 years?",
      "Can you suggest a fun activity to teach weather in English for ages 3-4?",
      "What are your suggestions for English games with sensory integration activities for 2-year-olds?"
    ];

  // Rastgele soru seçme fonksiyonu
  const getRandomQuestion = () => {
    const randomIndex = Math.floor(Math.random() * sampleQuestions.length);
    setInput(sampleQuestions[randomIndex]);
  };

  useEffect(() => {
    if (isLoading) {
      let currentIndex = 0;
      const interval = setInterval(() => {
        setFadeClass('opacity-0');
        setTimeout(() => {
          setLoadingMessage(loadingMessages[currentIndex]);
          setFadeClass('opacity-100');
          currentIndex = (currentIndex + 1) % loadingMessages.length;
        }, 300);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  // Mesaj gönderildiğinde scroll
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  // Sadece yeni mesaj eklendiğinde veya streaming mesaj geldiğinde scroll yap
  useEffect(() => {
    // Sadece mesaj dizisi değiştiğinde scroll yap
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  // Streaming mesaj güncellendiğinde scroll
  useEffect(() => {
    if (currentStreamingMessage) {
      scrollToBottom();
    }
  }, [currentStreamingMessage]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentStreamingMessage('');

    // Kullanıcı mesajı gönderdikten sonra scroll yap
    setTimeout(scrollToBottom, 100);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Hello Kido - Fikir Merkezi',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1:free',
          messages: [...messages, userMessage],
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(language === 'tr' ? 'API yanıt vermedi' : 'API did not respond');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices && data.choices[0]?.delta?.content) {
                const newContent = data.choices[0].delta.content;
                fullMessage += newContent;
                setCurrentStreamingMessage(fullMessage);
              }
            } catch (error) {
              console.error('JSON parse error:', error);
            }
          }
        }
      }

      // Eğer fullMessage boşsa hata fırlat
      if (!fullMessage.trim()) {
        throw new Error(language === 'tr' ? 'Boş yanıt alındı' : 'Empty response received');
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fullMessage
      }]);
      setCurrentStreamingMessage('');

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: language === 'tr' 
          ? 'Opss... Bir şeyler ters gitti 😔 Lütfen sorunuzu tekrar sorar mısınız? Eğer sorun devam ederse birkaç dakika bekleyip tekrar deneyebilirsiniz.'
          : 'Oops... Something went wrong 😔 Could you please ask your question again? If the problem persists, wait a few minutes and try again.'
      }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-50px)] max-w-4xl mx-auto flex flex-col">
      {/* Header */}
      <div className="shrink-0 py-4 px-6 border-b border-gray-200 dark:border-[#2a3241]">
        <h2 className="text-xl font-semibold text-[#1d1d1f] dark:text-white">
          {language === 'tr' ? 'Fikir Merkezi' : 'Idea Center'}
        </h2>
        <div className="flex items-center space-x-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {language === 'tr' 
              ? 'Yapay zeka asistanınız size yardımcı olmak için hazır' 
              : 'Your AI assistant is ready to help you'}
          </p>
          <div className="group relative">
            <button className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-50">
              <div className="bg-gray-800 text-white text-sm py-2 px-3 rounded-lg shadow-lg whitespace-nowrap min-w-[240px]">
                <div className="mb-2">
                  <span className="font-semibold">
                    {language === 'tr' ? 'Yapay Zeka Modeli:' : 'AI Model:'}
                  </span>
                  <span className="ml-1 text-blue-300">DeepSeek R1 Lite</span>
                </div>
                <p className="text-gray-300 text-xs">
                  {language === 'tr'
                    ? 'Sistem yoğunluğuna bağlı olarak yapay zekanın cevap vermesi uzun sürebilir.'
                    : 'The AI response may take longer depending on system load.'}
                </p>
              </div>
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 transform rotate-45"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin' }}>
          <div className="space-y-4 pb-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} items-start space-x-2`}
              >
                {/* Avatar - Assistant */}
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#0071e3]/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#1d1d1f] dark:text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.7134 8.12811L20.4668 8.69379C20.2864 9.10792 19.7136 9.10792 19.5331 8.69379L19.2866 8.12811C18.8471 7.11947 18.0555 6.31641 17.0677 5.87708L16.308 5.53922C15.8973 5.35653 15.8973 4.75881 16.308 4.57612L17.0252 4.25714C18.0384 3.80651 18.8442 2.97373 19.2761 1.93083L19.5293 1.31953C19.7058 0.893489 20.2942 0.893489 20.4706 1.31953L20.7238 1.93083C21.1558 2.97373 21.9616 3.80651 22.9748 4.25714L23.6919 4.57612C24.1027 4.75881 24.1027 5.35653 23.6919 5.53922L22.9323 5.87708C21.9445 6.31641 21.1529 7.11947 20.7134 8.12811ZM12 2C6.47715 2 2 6.47715 2 12C2 14.7614 3.11929 17.2614 4.92893 19.0711L2 22H12C17.5228 22 22 17.5228 22 12C22 11.5975 21.9762 11.2002 21.9298 10.8094L19.9437 11.0452C19.9809 11.3579 20 11.6765 20 12C20 16.4183 16.4183 20 12 20H6.82843L7.75736 19.0711L6.34315 17.6569C4.85124 16.1649 4 14.1524 4 12C4 7.58172 7.58172 4 12 4C12.6919 4 13.3618 4.0876 14 4.25179L14.4983 2.31487C13.6987 2.10914 12.8614 2 12 2ZM9 9H7V15H9V9ZM17 9H15V15H17V9ZM13 6H11V18H13V6Z"></path></svg>
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-[#1d1d1f] dark:bg-[#0071e3] text-white'
                      : 'bg-gray-100 dark:bg-[#2a3241] text-[#1d1d1f] dark:text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Avatar - User */}
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[#1d1d1f] dark:bg-[#0071e3] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-medium">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming Message */}
            {currentStreamingMessage && (
              <div className="flex justify-start items-start space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#0071e3]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#1d1d1f] dark:text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.7134 8.12811L20.4668 8.69379C20.2864 9.10792 19.7136 9.10792 19.5331 8.69379L19.2866 8.12811C18.8471 7.11947 18.0555 6.31641 17.0677 5.87708L16.308 5.53922C15.8973 5.35653 15.8973 4.75881 16.308 4.57612L17.0252 4.25714C18.0384 3.80651 18.8442 2.97373 19.2761 1.93083L19.5293 1.31953C19.7058 0.893489 20.2942 0.893489 20.4706 1.31953L20.7238 1.93083C21.1558 2.97373 21.9616 3.80651 22.9748 4.25714L23.6919 4.57612C24.1027 4.75881 24.1027 5.35653 23.6919 5.53922L22.9323 5.87708C21.9445 6.31641 21.1529 7.11947 20.7134 8.12811ZM12 2C6.47715 2 2 6.47715 2 12C2 14.7614 3.11929 17.2614 4.92893 19.0711L2 22H12C17.5228 22 22 17.5228 22 12C22 11.5975 21.9762 11.2002 21.9298 10.8094L19.9437 11.0452C19.9809 11.3579 20 11.6765 20 12C20 16.4183 16.4183 20 12 20H6.82843L7.75736 19.0711L6.34315 17.6569C4.85124 16.1649 4 14.1524 4 12C4 7.58172 7.58172 4 12 4C12.6919 4 13.3618 4.0876 14 4.25179L14.4983 2.31487C13.6987 2.10914 12.8614 2 12 2ZM9 9H7V15H9V9ZM17 9H15V15H17V9ZM13 6H11V18H13V6Z"></path></svg>
                </div>
                <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-gray-100 dark:bg-[#2a3241] text-[#1d1d1f] dark:text-white">
                  <p className="whitespace-pre-wrap">{currentStreamingMessage}</p>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && !currentStreamingMessage && (
              <div className="flex justify-start items-start space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#0071e3]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#1d1d1f] dark:text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.7134 8.12811L20.4668 8.69379C20.2864 9.10792 19.7136 9.10792 19.5331 8.69379L19.2866 8.12811C18.8471 7.11947 18.0555 6.31641 17.0677 5.87708L16.308 5.53922C15.8973 5.35653 15.8973 4.75881 16.308 4.57612L17.0252 4.25714C18.0384 3.80651 18.8442 2.97373 19.2761 1.93083L19.5293 1.31953C19.7058 0.893489 20.2942 0.893489 20.4706 1.31953L20.7238 1.93083C21.1558 2.97373 21.9616 3.80651 22.9748 4.25714L23.6919 4.57612C24.1027 4.75881 24.1027 5.35653 23.6919 5.53922L22.9323 5.87708C21.9445 6.31641 21.1529 7.11947 20.7134 8.12811ZM12 2C6.47715 2 2 6.47715 2 12C2 14.7614 3.11929 17.2614 4.92893 19.0711L2 22H12C17.5228 22 22 17.5228 22 12C22 11.5975 21.9762 11.2002 21.9298 10.8094L19.9437 11.0452C19.9809 11.3579 20 11.6765 20 12C20 16.4183 16.4183 20 12 20H6.82843L7.75736 19.0711L6.34315 17.6569C4.85124 16.1649 4 14.1524 4 12C4 7.58172 7.58172 4 12 4C12.6919 4 13.3618 4.0876 14 4.25179L14.4983 2.31487C13.6987 2.10914 12.8614 2 12 2ZM9 9H7V15H9V9ZM17 9H15V15H17V9ZM13 6H11V18H13V6Z"></path></svg>
                </div>
                <div className="flex items-center space-x-3 bg-gray-100 dark:bg-[#2a3241] rounded-2xl px-4 py-2">
                  <div className="animate-spin w-5 h-5">
                    <svg className="text-[#1d1d1f] dark:text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <span className={`text-[#1d1d1f] dark:text-white font-medium transition-opacity duration-300 ${fadeClass}`}>
                    {loadingMessage}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area - sabit alt konumu */}
      <div className="shrink-0 p-4 border-t border-gray-200 dark:border-[#2a3241] mt-auto">
        <form onSubmit={sendMessage} className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'tr' 
                ? "Bir soru sorun veya fikir isteyin..." 
                : "Ask a question or request ideas..."}
              className="w-full p-3 pr-12 rounded-xl border border-gray-200 dark:border-[#2a3241] bg-white dark:bg-[#1a1f2e] text-[#1d1d1f] dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] dark:focus:ring-[#0071e3]"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={getRandomQuestion}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[#0071e3] dark:hover:text-[#0071e3] transition-colors disabled:opacity-50 border border-gray-200 dark:border-[#2a3241] rounded-lg hover:border-[#0071e3] dark:hover:border-[#0071e3] group"
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
                <div className="bg-gray-800 text-white text-xs py-2 px-3 rounded-lg shadow-lg whitespace-nowrap">
                  <p>{language === 'tr' 
                    ? "Örnek etkinlik soruları için tıklayın" 
                    : "Click for example activity questions"}</p>
                </div>
                <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-800 transform rotate-45"></div>
              </div>
            </button>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 rounded-xl bg-[#1d1d1f] dark:bg-[#0071e3] text-white font-medium hover:bg-black dark:hover:bg-[#0077ed] disabled:bg-gray-300 dark:disabled:bg-[#0071e3]/50 transition-colors duration-200 disabled:cursor-not-allowed"
          >
            {language === 'tr' ? "Gönder" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IdeaCenter; 