import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import TheShift from '../components/TheShift';
import Philosophy from '../components/Philosophy';
import Stats from '../components/Stats';
import Method from '../components/Method';
import ClientProfile from '../components/ClientProfile';
import FAQ from '../components/FAQ';
import Team from '../components/Team';
import FinalCTA from '../components/FinalCTA';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import DigitalBackground from '../components/DigitalBackground';
import CookieConsent from '../components/CookieConsent';

const HomePage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const methodRef = useRef<HTMLElement | null>(null);
    const philosophyRef = useRef<HTMLElement | null>(null);
    const clientProfileRef = useRef<HTMLElement | null>(null);
    const faqRef = useRef<HTMLElement | null>(null);

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

    const handleScrollTo = (ref: React.RefObject<HTMLElement | null>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    return (
        <div className="bg-brand-bg text-brand-text font-sans antialiased">
            <DigitalBackground />
            <Header 
                onMethodClick={() => handleScrollTo(methodRef)}
                onClientsClick={() => handleScrollTo(clientProfileRef)}
                onContactClick={handleOpenModal}
            />
            <main>
                <Hero onScrollClick={() => handleScrollTo(methodRef)} />
                <TheShift />
                <Philosophy ref={philosophyRef} />
                <Stats />
                <Method ref={methodRef} />
                <ClientProfile ref={clientProfileRef} />
                <Team />
                <FAQ ref={faqRef} onCTAClick={handleOpenModal} />
                <FinalCTA onCTAClick={handleOpenModal} />
            </main>
            <Footer 
                onPhilosophyClick={() => handleScrollTo(philosophyRef)}
                onMethodClick={() => handleScrollTo(methodRef)}
                onClientsClick={() => handleScrollTo(clientProfileRef)}
                onFAQClick={() => handleScrollTo(faqRef)}
                onContactClick={handleOpenModal}
            />
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} />
            <CookieConsent />
        </div>
    );
};

export default HomePage;
