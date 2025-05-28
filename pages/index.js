import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/router';

const LandingPage = () => {
  const router = useRouter();
  const wordListRef = useRef(null);
  const selectorRef = useRef(null);
  const currentIndexRef = useRef(0);
  const [isLoading, setIsLoading] = useState(false);

  const words = ['Gmail', 'LinkedIn', 'Twitter'];

  useEffect(() => {
    // Load GSAP from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
    script.onload = initializeAnimation;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleGetStarted = () => {
    setIsLoading(true);
    // Show loading for 3 seconds
    setTimeout(() => {
      router.push('/workflow');
    }, 3000);
  };

  const initializeAnimation = () => {
    if (!window.gsap || !wordListRef.current || !selectorRef.current) return;

    const { gsap } = window;
    const wordList = wordListRef.current;
    const selectorElement = selectorRef.current;
    const wordElements = Array.from(wordList.children);
    const totalWords = wordElements.length;
    const wordHeight = 100 / totalWords;

    const updateSelectorWidth = () => {
      const centerIndex = (currentIndexRef.current + 1) % totalWords;
      const centerWord = wordElements[centerIndex];
      const centerWordWidth = centerWord.getBoundingClientRect().width;
      const listWidth = wordList.getBoundingClientRect().width;
      const percentageWidth = (centerWordWidth / listWidth) * 100;

      gsap.to(selectorElement, {
        width: `${Math.min(percentageWidth + 20, 100)}%`,
        duration: 0.6,
        ease: 'power2.out',
      });
    };

    const moveWords = () => {
      currentIndexRef.current++;
      
      gsap.to(wordList, {
        yPercent: -wordHeight * currentIndexRef.current,
        duration: 1.4,
        ease: 'elastic.out(1, 0.75)',
        onStart: updateSelectorWidth,
        onComplete: () => {
          if (currentIndexRef.current >= totalWords - 2) {
            wordList.appendChild(wordList.children[0]);
            currentIndexRef.current--;
            gsap.set(wordList, { yPercent: -wordHeight * currentIndexRef.current });
          }
        }
      });
    };

    setTimeout(updateSelectorWidth, 100);

    gsap.timeline({ repeat: -1, delay: 1.5 })
      .call(moveWords)
      .to({}, { duration: 2.5 })
      .repeat(-1);
    };

    return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-between px-4 relative overflow-hidden">
      <div className="w-full pt-4 flex justify-end z-10">
       
             
       <a
         href="https://github.com/mdanassaif/EffortlessAgent"
         target="_blank"
         rel="noopener noreferrer"
      
       >
         <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
           <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
         </svg>
       
       </a>
   
  

</div>
      {/* Animated background particles */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: 0.2,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="text-center relative z-10">
          <h1 className="text-7xl md:text-9xl font-bold text-white mb-8 tracking-tight">
            Effortless
          </h1>
          
          <div className="flex items-center justify-center gap-3 text-2xl md:text-3xl text-white mb-12 font-light flex-wrap">
            <span>One AI agent for</span>
            
            {/* GSAP Animated Word Flipper */}
            <div className="relative inline-block">
              <div className="looping-words">
                <div className="looping-words__container">
                  <ul ref={wordListRef} className="looping-words__list">
                    {[...words, ...words.slice(0, 2)].map((word, index) => (
                      <li key={index} className="looping-words__item">
                        <span className="looping-words__text">{word}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Fade overlay */}
                <div className="looping-words__fade"></div>
                
                {/* Selector frame */}
                <div ref={selectorRef} className="looping-words__selector">
                  <div className="looping-words__edge"></div>
                  <div className="looping-words__edge"></div>
                  <div className="looping-words__edge"></div>
                  <div className="looping-words__edge"></div>
                </div>
              </div>
          </div>
        </div>
        
          {/* CTA Button */}
            <button 
            onClick={handleGetStarted}
            disabled={isLoading}
            className="group relative bg-white text-black px-10 py-5 rounded-full text-xl font-semibold transition-all duration-500 transform hover:scale-105 flex items-center gap-3 mx-auto shadow-2xl hover:shadow-white/20 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Button shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="loading-dots">
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
                <span>Loading...</span>
              </div>
            ) : (
              <>
                <span className="relative z-10">Get Started</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300 relative z-10" />
              </>
            )}
                        </button>
                </div>
              </div>

      {/* Privacy Notice */}
      <div className="w-full py-4 text-center relative z-10">
        <p className="text-xs text-gray-500">100% local storage. No data sent to servers.</p>
      </div>

      {/* GitHub Contribution Section */}
    
    </div>
  );
};

export default LandingPage;