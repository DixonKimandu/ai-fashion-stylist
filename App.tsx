import React, { useState } from 'react';
import { Sparkles, Shirt, Recycle } from 'lucide-react';
import Tabs from './components/Tabs';
import Styling from './components/Styling';
import Sustainability from './components/Sustainability';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('styling');

  const tabs = [
    { id: 'styling', label: 'Styling', icon: <Shirt size={20} /> },
    { id: 'sustainability', label: 'Sustainability', icon: <Recycle size={20} /> }
  ];

  return (
    <div className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-6xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-3">
          <Sparkles className="text-indigo-500" size={36}/> AI Fashion Stylist
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
          {activeTab === 'styling' 
            ? 'Upload a garment, describe an occasion, and get a complete look styled from our inventory.'
            : 'Transform your old clothing into sustainable tote bags. Upload old garments and we will automatically detect the material and create a unique tote bag design incorporating your clothing.'}
        </p>
      </header>

      <main className="w-full max-w-6xl">
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
        {activeTab === 'styling' ? <Styling /> : <Sustainability />}
      </main>
    </div>
  );
};

export default App;