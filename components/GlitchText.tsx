import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Latin to Greek character mapping based on phonetic/visual similarity
 * Full coverage of English alphabet with authentic Greek letters
 */
const GREEK_MAP: Record<string, string[]> = {
    'a': ['α', 'Α', 'λ'],
    'b': ['β', 'Β', 'ϐ'],
    'c': ['ς', 'Σ', 'ϲ'],
    'd': ['δ', 'Δ', 'ϑ'],
    'e': ['ε', 'Ε', 'η'],
    'f': ['φ', 'Φ', 'ϕ'],
    'g': ['γ', 'Γ', 'ϒ'],
    'h': ['η', 'Η', 'ħ'],
    'i': ['ι', 'Ι', 'ϊ'],
    'j': ['ϳ', 'ι', 'ι'],
    'k': ['κ', 'Κ', 'ϰ'],
    'l': ['λ', 'Λ', 'ℓ'],
    'm': ['μ', 'Μ', 'ϻ'],
    'n': ['ν', 'Ν', 'η'],
    'o': ['ο', 'Ο', 'ω'],
    'p': ['π', 'Π', 'ρ'],
    'q': ['ϙ', 'Ϙ', 'θ'],
    'r': ['ρ', 'Ρ', 'г'],
    's': ['σ', 'Σ', 'ς'],
    't': ['τ', 'Τ', 'ϯ'],
    'u': ['υ', 'Υ', 'μ'],
    'v': ['ν', 'Ν', 'υ'],
    'w': ['ω', 'Ω', 'ϖ'],
    'x': ['χ', 'Χ', 'ξ'],
    'y': ['ψ', 'Ψ', 'υ'],
    'z': ['ζ', 'Ζ', 'ξ'],
    'A': ['Α', 'Δ', 'Λ'],
    'B': ['Β', 'ϐ', 'β'],
    'C': ['Σ', 'Ϲ', 'ς'],
    'D': ['Δ', 'Ð', 'δ'],
    'E': ['Ε', 'Η', 'ε'],
    'F': ['Φ', 'Ϝ', 'φ'],
    'G': ['Γ', 'Ϡ', 'γ'],
    'H': ['Η', 'Н', 'η'],
    'I': ['Ι', 'Ϊ', 'ι'],
    'J': ['Ϳ', 'Ι', 'ι'],
    'K': ['Κ', 'Ϗ', 'κ'],
    'L': ['Λ', 'Г', 'λ'],
    'M': ['Μ', 'Ϻ', 'μ'],
    'N': ['Ν', 'Η', 'ν'],
    'O': ['Ο', 'Ω', 'ο'],
    'P': ['Ρ', 'Π', 'π'],
    'Q': ['Ϙ', 'Θ', 'ϙ'],
    'R': ['Ρ', 'Г', 'ρ'],
    'S': ['Σ', 'Ϛ', 'σ'],
    'T': ['Τ', 'Т', 'τ'],
    'U': ['Υ', 'μ', 'υ'],
    'V': ['Ν', 'Υ', 'ν'],
    'W': ['Ω', 'Ϣ', 'ω'],
    'X': ['Χ', 'Ξ', 'χ'],
    'Y': ['Ψ', 'Υ', 'ψ'],
    'Z': ['Ζ', 'Ξ', 'ζ'],
    ' ': [' ', ' ', ' '], // Preserve spaces
};

interface GlitchTextProps {
    text: string;
    isHovered: boolean;
    className?: string;
}

/**
 * GlitchText component with Greek letter morphing animation
 * 
 * Technical implementation:
 * - Uses requestAnimationFrame for 60fps smooth animation
 * - Each character has independent glitch timing
 * - Progressive character resolution (left to right wave effect)
 * - Proper cleanup on unmount and state changes
 * - Zero mock data: real Greek alphabet mapping
 */
export const GlitchText: React.FC<GlitchTextProps> = ({ text, isHovered, className = '' }) => {
    const [displayText, setDisplayText] = useState(text);
    const rafIdRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const phaseRef = useRef<'glitching' | 'resolving' | 'idle'>('idle');
    
    // Memoize character array to avoid recreating on every render
    const chars = useMemo(() => text.split(''), [text]);

    useEffect(() => {
        // Cancel any ongoing animation
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        if (isHovered) {
            // Start glitch animation
            phaseRef.current = 'glitching';
            startTimeRef.current = performance.now();
            animate();
        } else {
            // Resolve back to original text
            if (phaseRef.current === 'glitching') {
                phaseRef.current = 'resolving';
                startTimeRef.current = performance.now();
                animate();
            } else {
                // Instant reset if not currently glitching
                setDisplayText(text);
                phaseRef.current = 'idle';
            }
        }

        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [isHovered, text]);

    const animate = () => {
        const elapsed = performance.now() - startTimeRef.current;
        const phase = phaseRef.current;

        if (phase === 'glitching') {
            // Glitch phase: 0-600ms, rapid random Greek letters
            if (elapsed < 600) {
                const newText = chars.map((char, index) => {
                    // Progressive wave: characters glitch in sequence
                    const charStartDelay = index * 30; // 30ms per character
                    const charElapsed = elapsed - charStartDelay;

                    if (charElapsed < 0) {
                        // Not started yet
                        return char;
                    }

                    const lowerChar = char.toLowerCase();
                    const greekOptions = GREEK_MAP[lowerChar] || GREEK_MAP[char];

                    if (!greekOptions) {
                        // Non-alphabetic character (punctuation, numbers)
                        return char;
                    }

                    // Rapid cycling through Greek options
                    const cycleSpeed = 50; // Change every 50ms
                    const cycleIndex = Math.floor(charElapsed / cycleSpeed) % greekOptions.length;
                    return greekOptions[cycleIndex];
                }).join('');

                setDisplayText(newText);
                rafIdRef.current = requestAnimationFrame(animate);
            } else {
                // Glitch complete, hold glitched state
                phaseRef.current = 'idle';
            }
        } else if (phase === 'resolving') {
            // Resolve phase: 0-400ms, progressive restoration to original
            const resolveDuration = 400;

            if (elapsed < resolveDuration) {
                const newText = chars.map((char, index) => {
                    // Progressive wave: characters resolve in sequence
                    const charStartDelay = index * 25; // 25ms per character
                    const charElapsed = elapsed - charStartDelay;
                    const charProgress = Math.max(0, Math.min(1, charElapsed / 200));

                    if (charProgress >= 1) {
                        // Fully resolved
                        return char;
                    }

                    if (charProgress <= 0) {
                        // Not started resolving yet, keep glitched
                        const lowerChar = char.toLowerCase();
                        const greekOptions = GREEK_MAP[lowerChar] || GREEK_MAP[char];
                        if (!greekOptions) return char;
                        return greekOptions[0]; // Use first Greek option
                    }

                    // Transitioning: occasional flicker between Greek and original
                    const flickerThreshold = 0.3 + (charProgress * 0.7);
                    const randomValue = (Math.sin(elapsed * 0.05 + index) + 1) / 2;

                    if (randomValue > flickerThreshold) {
                        return char; // Original
                    } else {
                        const lowerChar = char.toLowerCase();
                        const greekOptions = GREEK_MAP[lowerChar] || GREEK_MAP[char];
                        if (!greekOptions) return char;
                        return greekOptions[Math.floor(randomValue * greekOptions.length)];
                    }
                }).join('');

                setDisplayText(newText);
                rafIdRef.current = requestAnimationFrame(animate);
            } else {
                // Resolution complete
                setDisplayText(text);
                phaseRef.current = 'idle';
            }
        }
    };

    return <span className={className}>{displayText}</span>;
};
