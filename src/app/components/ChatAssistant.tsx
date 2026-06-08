import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Movie } from './MovieCard';
import { createSlug } from '../utils/slugify';
import { useNavigate } from 'react-router-dom';

interface ChatAssistantProps {
  movies: Movie[];
  isDarkMode: boolean;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  suggestions?: Movie[];
}

export function ChatAssistant({ movies, isDarkMode }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [lastQuery, setLastQuery] = useState<string>('');
  const [lastResults, setLastResults] = useState<Movie[]>([]);
  const [resultOffset, setResultOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Initialize with greeting when opening
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: '1',
        text: "Hey! What are you in the mood for today? You can tell me a genre, an actor's name, or describe what kind of movie you want to watch!",
        isUser: false
      }]);
    }
  }, [isOpen, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const analyzeQuery = (query: string): Movie[] => {
    const lowerQuery = query.toLowerCase();
    let results: Movie[] = [];

    // Check for genre matches
    const genreResults = movies.filter(movie =>
      movie.genre && typeof movie.genre === 'string' && movie.genre.toLowerCase().includes(lowerQuery)
    );

    // Check for cast/actor matches (cast is an array)
    const castResults = movies.filter(movie =>
      movie.cast && Array.isArray(movie.cast) && movie.cast.some(actor => actor.toLowerCase().includes(lowerQuery))
    );

    // Check for plot matches
    const plotResults = movies.filter(movie =>
      movie.plot && typeof movie.plot === 'string' && movie.plot.toLowerCase().includes(lowerQuery)
    );

    // Check for director matches
    const directorResults = movies.filter(movie =>
      movie.director && typeof movie.director === 'string' && movie.director.toLowerCase().includes(lowerQuery)
    );

    // Combine results (prioritize exact matches)
    if (genreResults.length > 0) {
      results = genreResults;
    } else if (castResults.length > 0) {
      results = castResults;
    } else if (directorResults.length > 0) {
      results = directorResults;
    } else if (plotResults.length > 0) {
      results = plotResults;
    } else {
      // Try word-by-word matching for better results
      const words = lowerQuery.split(' ').filter(w => w.length > 3);
      results = movies.filter(movie => {
        const genreText = movie.genre && typeof movie.genre === 'string' ? movie.genre.toLowerCase() : '';
        const castText = movie.cast && Array.isArray(movie.cast) ? movie.cast.join(' ').toLowerCase() : '';
        const plotText = movie.plot && typeof movie.plot === 'string' ? movie.plot.toLowerCase() : '';
        const directorText = movie.director && typeof movie.director === 'string' ? movie.director.toLowerCase() : '';
        const searchText = `${genreText} ${castText} ${plotText} ${directorText}`;
        return words.some(word => searchText.includes(word));
      });
    }

    // Sort by rating - return ALL results (not just top 5)
    const withRatings = results.filter(m => m.imdbRating && m.imdbRating > 0);
    const withoutRatings = results.filter(m => !m.imdbRating || m.imdbRating === 0);

    const sortedWithRatings = withRatings.sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0));
    const combined = [...sortedWithRatings, ...withoutRatings];

    return combined; // Return all results, not just slice(0, 5)
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true
    };

    setMessages(prev => [...prev, userMessage]);
    const query = inputValue;
    setInputValue('');

    // Analyze and respond
    setTimeout(() => {
      const lowerQuery = query.toLowerCase().trim();
      // Remove punctuation for better matching
      const cleanQuery = lowerQuery.replace(/[?!.,;]/g, '').trim();

      // Check if this is a contextual query referring to previous results
      const hasPronouns = /\b(him|her|them|he|she|they|that|this)\b/i.test(lowerQuery);
      const hasContextualWords = /\b(with|by|from|starring|featuring)\b/i.test(lowerQuery);
      const isContextual = lastResults.length > 0 && (hasPronouns || hasContextualWords);

      // Check for "more" variations - use regex for flexible matching
      const isSimpleMore = lastResults.length > 0 && (
        /^(more|others|another)$/.test(cleanQuery) ||
        /^(show|give|get|find)?\s*(me)?\s*(more|others|another|other)\s*(movies?|results?|options?)?$/.test(cleanQuery) ||
        /^(what|any|anything)\s*(else|more)/.test(cleanQuery) ||
        /^(show|give)\s*(me)?\s*(others|other|more)/.test(cleanQuery)
      );

      // Check for filtering requests
      const isBestRated = /\b(best|top|highest|high)\s*(rated|rating)\b/i.test(lowerQuery);
      const isNewMovies = /\b(new|recent|latest|newest)\b/i.test(lowerQuery);

      let suggestions: Movie[] = [];
      let responseText = '';

      // Handle contextual queries with previous results
      if ((isContextual || isSimpleMore || isBestRated || isNewMovies) && lastResults.length > 0) {
        let filteredResults = [...lastResults];

        // Apply filters if specified
        if (isBestRated) {
          // Sort by rating (highest first)
          filteredResults = filteredResults.sort((a, b) => (b.imdbRating || 0) - (a.imdbRating || 0));
          setLastResults(filteredResults); // Update stored results with new order
          setResultOffset(0);
          suggestions = filteredResults.slice(0, 5);
          responseText = `Here are the highest-rated movies with ${lastQuery} sorted by rating:`;
        } else if (isNewMovies) {
          // Sort by year (newest first)
          filteredResults = filteredResults.sort((a, b) => {
            const yearA = typeof a.year === 'string' ? parseInt(a.year) : a.year || 0;
            const yearB = typeof b.year === 'string' ? parseInt(b.year) : b.year || 0;
            return yearB - yearA;
          });
          setLastResults(filteredResults); // Update stored results with new order
          setResultOffset(0);
          suggestions = filteredResults.slice(0, 5);
          responseText = `Here are the newest movies with ${lastQuery} sorted by release year:`;
        } else {
          // Show next batch from current results
          const nextOffset = resultOffset + 5;
          suggestions = filteredResults.slice(nextOffset, nextOffset + 5);

          if (suggestions.length > 0) {
            setResultOffset(nextOffset);
            responseText = `Here are ${suggestions.length} more movie${suggestions.length > 1 ? 's' : ''} with ${lastQuery}:`;
          } else {
            // No more results, start from beginning
            suggestions = filteredResults.slice(0, 5);
            setResultOffset(0);
            responseText = `That's all the movies I found for "${lastQuery}"! Here are the first ${suggestions.length} again:`;
          }
        }
      } else {
        // New search query
        const allResults = analyzeQuery(query);
        suggestions = allResults.slice(0, 5);

        // Store for contextual requests
        setLastQuery(query);
        setLastResults(allResults);
        setResultOffset(0);

        if (suggestions.length > 0) {
          const hasMore = allResults.length > 5;
          responseText = `Great choice! Here are ${suggestions.length} movie${suggestions.length > 1 ? 's' : ''} I think you'll love:${hasMore ? ` (I found ${allResults.length} total - type "more" to see more!)` : ''}`;
        } else {
          responseText = "Hmm, I couldn't find any movies matching that. Try telling me a genre like 'comedy' or 'action', an actor's name, or describe the kind of story you want!";
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    }, 500);
  };

  const handleMovieClick = (movie: Movie) => {
    navigate(`/movie/${createSlug(movie.title, movie.year)}`);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all hover:scale-110 ${
          isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-24 right-6 z-50 w-96 h-[500px] rounded-lg shadow-2xl flex flex-col ${
          isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between ${
            isDarkMode ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <div className="flex items-center gap-2">
              <MessageCircle className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Movie Assistant
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(message => (
              <div key={message.id}>
                <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.isUser
                      ? isDarkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-200'
                        : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.text}
                  </div>
                </div>

                {/* Movie Suggestions */}
                {message.suggestions && (
                  <div className="mt-2 space-y-2">
                    {message.suggestions.map(movie => (
                      <div
                        key={movie.id}
                        onClick={() => handleMovieClick(movie)}
                        className={`flex gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          isDarkMode
                            ? 'bg-gray-800 hover:bg-gray-700'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <img
                          src={movie.image}
                          alt={movie.title}
                          className="w-12 h-16 object-cover rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm truncate ${
                            isDarkMode ? 'text-white' : 'text-black'
                          }`}>
                            {movie.title}
                          </div>
                          <div className={`text-xs ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {movie.year} • ⭐ {movie.imdbRating?.toFixed(1)}
                          </div>
                          {movie.genre && (
                            <div className={`text-xs mt-1 truncate ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              {movie.genre}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`p-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className={`flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-black placeholder-gray-400'
                }`}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className={`p-2 rounded-lg transition-colors ${
                  inputValue.trim()
                    ? isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
