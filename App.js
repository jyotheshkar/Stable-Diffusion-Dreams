import React, { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';

// The main React application component
export default function App() {
  const [prompt, setPrompt] = useState('a cinematic shot of a glowing jellyfish forest at night');
  const [imageUrls, setImageUrls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState(null);
  const [statusText, setStatusText] = useState('Enter a prompt to start dreaming.');
  
  const canvasRef = useRef(null);
  const imageObjectsRef = useRef([]);
  const animationFrameId = useRef(null);
  const transitionProgressRef = useRef(0);
  const currentImageIndexRef = useRef(0);

  // --- The core animation engine for morphing between images ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const animate = () => {
      if (!isAnimating || imageObjectsRef.current.length < 2 || canvas.width === 0) {
        animationFrameId.current = requestAnimationFrame(animate);
        return;
      }

      const fromIndex = currentImageIndexRef.current;
      const toIndex = fromIndex + 1;

      const imageFrom = imageObjectsRef.current[fromIndex];
      const imageTo = imageObjectsRef.current[toIndex];

      if (!imageFrom?.complete || !imageTo?.complete) {
        animationFrameId.current = requestAnimationFrame(animate);
        return;
      }

      // --- MORPHING LOGIC ---
      const transitionSpeed = 0.003; // Slower, more cinematic transition
      transitionProgressRef.current += transitionSpeed;

      if (transitionProgressRef.current >= 1.0) {
        transitionProgressRef.current = 0.0;
        currentImageIndexRef.current++;
        
        if (currentImageIndexRef.current === imageObjectsRef.current.length - 1) {
          generateNextImageInSequence();
        }
      }
      
      const t = transitionProgressRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1 - t;
      drawImageToCanvas(ctx, imageFrom);
      ctx.globalAlpha = t;
      drawImageToCanvas(ctx, imageTo);
      ctx.globalAlpha = 1.0;

      applyWarpEffect(ctx, canvas);
      animationFrameId.current = requestAnimationFrame(animate);
    };

    const drawImageToCanvas = (context, img) => {
        const canvasAspect = context.canvas.width / context.canvas.height;
        const imageAspect = img.width / img.height;
        let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

        if (imageAspect > canvasAspect) {
            sHeight = img.height; sWidth = sHeight * canvasAspect; sx = (img.width - sWidth) / 2;
        } else {
            sWidth = img.width; sHeight = sWidth / canvasAspect; sy = (img.height - sHeight) / 2;
        }
        context.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, context.canvas.width, context.canvas.height);
    };
    
    const applyWarpEffect = (context, canvas) => {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const originalData = new Uint8ClampedArray(imageData.data);
        const modifiedData = imageData.data;
        const warpTime = Date.now() * 0.002;

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const warpFactor = 8; const freqFactor = 0.03;
                const offsetX = Math.sin(y * freqFactor + warpTime) * warpFactor;
                const offsetY = Math.cos(x * freqFactor + warpTime) * warpFactor;
                const srcX = Math.round(x + offsetX);
                const srcY = Math.round(y + offsetY);

                if (srcX >= 0 && srcX < canvas.width && srcY >= 0 && srcY < canvas.height) {
                    const srcIndex = (srcY * canvas.width + srcX) * 4;
                    const destIndex = (y * canvas.width + x) * 4;
                    modifiedData[destIndex] = originalData[srcIndex];
                    modifiedData[destIndex+1] = originalData[srcIndex+1];
                    modifiedData[destIndex+2] = originalData[srcIndex+2];
                }
            }
        }
        context.putImageData(imageData, 0, 0);
    };
    
    const resizeCanvas = () => {
        const container = canvas.parentElement;
        if (container) {
            canvas.width = container.clientWidth;
            canvas.height = container.clientWidth * (9 / 16);
        }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isAnimating]);

  const imageToBase64 = (img) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return tempCanvas.toDataURL('image/png').split(',')[1];
  };

  const getNextPrompt = async (lastImage) => {
    setStatusText('Asking the AI storyteller for the next scene...');
    const base64ImageData = imageToBase64(lastImage);
    const storytellerPrompt = "This is a frame from a dream sequence. Briefly describe a new, visually interesting scene that logically follows this one. Be creative and concise. Only output the new scene description, nothing else. Example: 'A path appears in the forest leading to a glowing cave entrance.'";
    
    const payload = {
      contents: [{ role: "user", parts: [{ text: storytellerPrompt }, { inlineData: { mimeType: "image/png", data: base64ImageData } }] }],
    };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    
    let response;
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
        response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) break;

        if (i < maxRetries - 1) {
            const delay = Math.pow(2, i) * 1000;
            setStatusText(`Storyteller API issue. Retrying in ${delay/1000}s...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }

    if (!response.ok) {
        let errorDetails = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetails += ` - ${errorData.error?.message || JSON.stringify(errorData)}`;
        } catch (e) {
            // Ignore if parsing fails
        }
        throw new Error(`The AI storyteller is sleeping. (${errorDetails})`);
    }

    const result = await response.json();
    const newPrompt = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!newPrompt) throw new Error("The AI storyteller was speechless.");
    return newPrompt.trim();
  };

  const generateImage = async (promptToGenerate) => {
    setStatusText(`Dreaming of: ${promptToGenerate}`);
    const detailedPrompt = `award-winning photograph, 8k, hyper-detailed, cinematic lighting, of: "${promptToGenerate}".`;
    
    const payload = { instances: [{ prompt: detailedPrompt }], parameters: { sampleCount: 1 } };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errorDetails = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetails += ` - ${errorData.error?.message || JSON.stringify(errorData)}`;
        } catch (e) { /* ignore */ }
        throw new Error(`Image generation failed. (${errorDetails})`);
    }

    const result = await response.json();
    const base64Data = result.predictions && result.predictions[0]?.bytesBase64Encoded;

    if (base64Data) {
      const newUrl = `data:image/png;base64,${base64Data}`;
      const newImage = new Image();
      newImage.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        newImage.onload = resolve;
        newImage.onerror = reject;
        newImage.src = newUrl;
      });
      return newImage;
    } else {
      console.error("Unexpected API response structure:", result);
      throw new Error('API did not return a valid image.');
    }
  };
  
  const generateNextImageInSequence = async () => {
    try {
      const lastImage = imageObjectsRef.current[imageObjectsRef.current.length - 1];
      const newPrompt = await getNextPrompt(lastImage);
      const newImage = await generateImage(newPrompt);
      imageObjectsRef.current.push(newImage);
    } catch (e) {
      console.error("Failed to continue sequence:", e);
      setError(e.message);
      setIsAnimating(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setIsAnimating(false);
    setError(null);
    imageObjectsRef.current = [];
    currentImageIndexRef.current = 0;
    transitionProgressRef.current = 0;
    
    try {
      const firstImage = await generateImage(prompt);
      imageObjectsRef.current.push(firstImage);
      
      const nextPrompt = await getNextPrompt(firstImage);
      const secondImage = await generateImage(nextPrompt);
      imageObjectsRef.current.push(secondImage);

      setIsAnimating(true);
    } catch (e) {
      console.error("Failed to start generation:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-slate-100 p-4 font-sans">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-light text-white text-center mb-4 leading-tight">
          Stable Diffusion Dreams (Morphing Video Engine)
        </h1>
        <p className="text-slate-300 text-center mb-8 max-w-2xl">
          A true dream sequence. The scene continuously morphs into new, AI-generated worlds.
        </p>

        <div className="flex flex-col sm:flex-row w-full max-w-2xl gap-4 mb-6">
          <input
            type="text"
            className="flex-1 p-3 rounded-xl bg-black/30 text-slate-200 placeholder-slate-400 border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'a serene forest with glowing mushrooms'"
            disabled={isLoading || isAnimating}
          />
          <button
            onClick={handleGenerate}
            className="flex-shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105 disabled:bg-purple-800/50 disabled:shadow-none disabled:cursor-not-allowed"
            disabled={isLoading || isAnimating}
          >
            {isLoading ? 'Initializing...' : (isAnimating ? 'Dreaming...' : 'Start Dreaming')}
          </button>
        </div>

        <div className="relative w-full max-w-3xl rounded-2xl overflow-hidden shadow-xl aspect-video flex items-center justify-center bg-black/30">
          <canvas ref={canvasRef} className="w-full h-full"></canvas>
          
          {/* --- NEW: Central Loading Indicator --- */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
              <svg className="animate-spin h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-white/80 mt-4 text-lg">{statusText}</p>
            </div>
          )}

          <div className="absolute top-2 left-2 bg-black/50 text-white text-xs p-2 rounded-lg max-w-full truncate z-0">
            {isLoading ? statusText : (isAnimating ? statusText : 'Ready to dream.')}
          </div>
          {error && (
            <div className="absolute inset-0 bg-red-900/70 backdrop-blur-sm flex items-center justify-center text-red-200 p-4 rounded-xl text-center font-bold z-20">
              {error}
            </div>
          )}
          {isAnimating && !isLoading && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <button
                onClick={() => setIsAnimating(false)}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110"
                aria-label="Stop animation"
              >
                <Square size={24} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
