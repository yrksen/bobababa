import { useNavigate } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

const logoImage = 'https://i.imgur.com/vUiVqow.png?direct';

interface NotFoundPageProps {
  isDarkMode?: boolean;
}

export function NotFoundPage({ isDarkMode }: NotFoundPageProps) {
  const navigate = useNavigate();
  const [localDarkMode, setLocalDarkMode] = useState(false);

  // Load dark mode from localStorage if not provided
  useEffect(() => {
    if (isDarkMode === undefined) {
      const saved = localStorage.getItem('darkMode');
      setLocalDarkMode(saved ? JSON.parse(saved) : false);
    } else {
      setLocalDarkMode(isDarkMode);
    }
  }, [isDarkMode]);

  const darkModeActive = isDarkMode !== undefined ? isDarkMode : localDarkMode;

  return (
    <div className={`min-h-screen flex flex-col ${darkModeActive ? 'bg-gray-900' : 'bg-[#F5F5F0]'}`}>
      {/* Header */}
      <header className={`border-b ${darkModeActive ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} transition-colors duration-300`}>
        <div className="max-w-[2400px] mx-auto px-4 py-3 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <img src={logoImage} alt="Trash Bin Logo" className="h-8 w-auto" />
            <h1 className={`text-xl font-bold tracking-tight ${darkModeActive ? 'text-white' : 'text-black'}`}>
              Trash bin
            </h1>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          {/* 404 Number */}
          <h1 className={`text-9xl font-bold mb-4 ${darkModeActive ? 'text-white' : 'text-black'}`}>
            404
          </h1>
          
          {/* Message */}
          <h2 className={`text-3xl font-semibold mb-4 ${darkModeActive ? 'text-white' : 'text-black'}`}>
            Whoops! Can't find this page
          </h2>
          
          <p className={`text-lg mb-8 ${darkModeActive ? 'text-gray-300' : 'text-gray-600'}`}>
            The page you're looking for doesn't exist. It might have been moved, deleted, or the URL might be incorrect.
          </p>

          {/* Trash Icon Animation */}
          <div className="mb-8 flex justify-center">
            <div className={`text-6xl ${darkModeActive ? 'text-gray-600' : 'text-gray-400'}`}>
              🗑️
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                darkModeActive 
                  ? 'bg-white text-black hover:bg-gray-200' 
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              <Home className="size-5" />
              Go to Homepage
            </button>
            
            <button
              onClick={() => {
                navigate('/');
                // Small delay to ensure navigation happens first
                setTimeout(() => {
                  const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                  if (searchInput) {
                    searchInput.focus();
                  }
                }, 100);
              }}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                darkModeActive 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-gray-200 text-black hover:bg-gray-300'
              }`}
            >
              <Search className="size-5" />
              Search Movies
            </button>
          </div>

          {/* Helpful Links */}
          <div className="mt-12">
            <p className={`text-sm mb-3 ${darkModeActive ? 'text-gray-400' : 'text-gray-500'}`}>
              Popular pages:
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={() => navigate('/?view=main')}
                className={`text-sm hover:underline ${darkModeActive ? 'text-gray-300' : 'text-gray-600'}`}
              >
                Main Collection
              </button>
              <button
                onClick={() => navigate('/?view=towatch')}
                className={`text-sm hover:underline ${darkModeActive ? 'text-gray-300' : 'text-gray-600'}`}
              >
                To Watch List
              </button>
              <button
                onClick={() => navigate('/profile')}
                className={`text-sm hover:underline ${darkModeActive ? 'text-gray-300' : 'text-gray-600'}`}
              >
                Profile
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t ${darkModeActive ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} transition-colors duration-300 py-6`}>
        <div className="max-w-[2400px] mx-auto px-4 text-center">
          <p className={`text-sm ${darkModeActive ? 'text-gray-400' : 'text-gray-600'}`}>
            © {new Date().getFullYear()} Trash Bin. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
