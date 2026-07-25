import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import Hero from '../components/Hero';
import TheShift from '../components/TheShift';
import Method from '../components/Method';
import Process from '../components/Process';
import ClientProfile from '../components/ClientProfile';
import FAQ from '../components/FAQ';
import FinalCTA from '../components/FinalCTA';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import CookieConsent from '../components/CookieConsent';
import Grain from '../components/Grain';
import Marquee from '../components/Marquee';

const HomePage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const servicesRef = useRef<HTMLElement | null>(null);
    const approachRef = useRef<HTMLElement | null>(null);
    const industriesRef = useRef<HTMLElement | null>(null);
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
        <div className="relative bg-brand-bg text-brand-text font-sans antialiased overflow-x-hidden">
            <Grain />
            <Header
                onMethodClick={() => handleScrollTo(servicesRef)}
                onClientsClick={() => handleScrollTo(industriesRef)}
                onContactClick={handleOpenModal}
            />
            <main className="relative z-[2]">
                <Hero
                    onScrollClick={() => handleScrollTo(servicesRef)}
                    onContactClick={handleOpenModal}
                />
                <Marquee />
                <TheShift />
                <Method ref={servicesRef} />
                <Process ref={approachRef} />
                <ClientProfile ref={industriesRef} />
                <FAQ ref={faqRef} onCTAClick={handleOpenModal} />
                <FinalCTA onCTAClick={handleOpenModal} />
            </main>
            <Footer
                onPhilosophyClick={() => handleScrollTo(approachRef)}
                onMethodClick={() => handleScrollTo(servicesRef)}
                onClientsClick={() => handleScrollTo(industriesRef)}
                onFAQClick={() => handleScrollTo(faqRef)}
                onContactClick={handleOpenModal}
            />
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} />
            <CookieConsent />
        </div>
    );
};

export default HomePage;
