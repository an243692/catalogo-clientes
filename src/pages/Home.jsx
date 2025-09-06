import React from 'react';
import Hero from '../components/Hero';
import Features from '../components/Features';
import MainContent from '../components/MainContent';
import WhatsAppFloat from '../components/WhatsAppFloat';

const Home = () => {
  return (
    <>
      <Hero />
      <Features />
      <MainContent />
      <WhatsAppFloat />
    </>
  );
};

export default Home;