import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import TheShift from './components/TheShift';
import Philosophy from './components/Philosophy';
import Stats from './components/Stats';
import NicosiaMethod from './components/NicosiaMethod';
import ClientProfile from './components/ClientProfile';
import FAQ from './components/FAQ';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';
import Modal from './components/Modal';
import DigitalBackground from './components/DigitalBackground';

const App: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const nicosiaMethodRef = useRef<HTMLElement>(null);
    const headerRef = useRef<HTMLElement>(null);
    const philosophyRef = useRef<HTMLElement>(null);
    const clientProfileRef = useRef<HTMLElement>(null);
    const faqRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isModalOpen]);

    const handleScrollTo = (ref: React.RefObject<HTMLElement>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    return (
        <div className="bg-brand-bg text-brand-text font-sans antialiased">
            <DigitalBackground />
            <Header 
                ref={headerRef} 
                onMethodClick={() => handleScrollTo(nicosiaMethodRef)}
                onClientsClick={() => handleScrollTo(clientProfileRef)}
                onContactClick={handleOpenModal}
            />
            <main>
                <Hero onScrollClick={() => handleScrollTo(nicosiaMethodRef)} />
                <TheShift />
                <Philosophy ref={philosophyRef} />
                <Stats />
                <NicosiaMethod ref={nicosiaMethodRef} />
                <ClientProfile ref={clientProfileRef} />
                <FAQ ref={faqRef} onCTAClick={handleOpenModal} />
                <FinalCTA onCTAClick={handleOpenModal} />
            </main>
            <Footer 
                onPhilosophyClick={() => handleScrollTo(philosophyRef)}
                onMethodClick={() => handleScrollTo(nicosiaMethodRef)}
                onClientsClick={() => handleScrollTo(clientProfileRef)}
                onFAQClick={() => handleScrollTo(faqRef)}
                onContactClick={handleOpenModal}
            />
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} />
        </div>
    );
};

export default App;
