import React, { useRef, useEffect, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

const DigitalBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const scrollY = useRef(0);
    const rafId = useRef<number | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        // Reduced particle count for better performance
        const particleCount = window.innerWidth > 768 ? 30 : 15;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    vx: Math.random() * 0.2 - 0.1,
                    vy: Math.random() * 0.2 - 0.1,
                    size: Math.random() * 1.5 + 0.5,
                    opacity: Math.random() * 0.3 + 0.1,
                });
            }
        };
        
        // Throttled scroll handler using RAF
        const handleScroll = () => {
            if (!rafId.current) {
                rafId.current = requestAnimationFrame(() => {
                    scrollY.current = window.scrollY;
                    rafId.current = null;
                });
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Only animate when canvas is in viewport
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0 }
        );
        observer.observe(canvas);
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Throttle animation to 30fps for better performance
        let lastFrameTime = 0;
        const targetFps = 30;
        const frameInterval = 1000 / targetFps;
        
        const animate = (currentTime: number) => {
            // Only animate when visible
            if (!isVisible) {
                animationFrameId = requestAnimationFrame(animate);
                return;
            }
            
            const deltaTime = currentTime - lastFrameTime;
            
            if (deltaTime >= frameInterval) {
                lastFrameTime = currentTime - (deltaTime % frameInterval);
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                particles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy + (scrollY.current * 0.00005); // Parallax effect

                    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                    if (p.y > canvas.height) {
                        p.y = 0;
                        p.x = Math.random() * canvas.width;
                    }
                    
                    ctx.fillStyle = `rgba(59, 130, 246, ${p.opacity})`;
                    ctx.fillRect(p.x, p.y, p.size, p.size);
                });
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('scroll', handleScroll);
            observer.disconnect();
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
            }
        };
    }, [isVisible]);

    return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0" />;
};

export default DigitalBackground;