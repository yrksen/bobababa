import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Search, X, RefreshCw, Star } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { DarkModeToggle } from '../components/DarkModeToggle';
import { RecentMoviesCarousel } from '../components/RecentMoviesCarousel';
import { Input } from '../components/ui/input';
import { createSlug } from '../utils/slugify';
const logoImage = 'https://i.imgur.com/vUiVqow.png?direct';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ea58c774`;

interface ProfilePageProps {
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean) => void;
  currentUser: any;
  setCurrentUser: (user: any) => void;
}

type ProfileSection = 'profile' | 'comments' | 'ratings' | 'logout';

export function ProfilePage({ isDarkMode, setIsDarkMode, currentUser, setCurrentUser }: ProfilePageProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<ProfileSection>('profile');
  const [userComments, setUserComments] = useState<any[]>([]);
  const [userRatings, setUserRatings] = useState<any[]>([]);
  const [movies, setMovies] = useState<any[]>([]);
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [newEmail, setNewEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture || '');
  const [updateMessage, setUpdateMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentMovies, setRecentMovies] = useState<any[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const [isUpdatingCastDirector, setIsUpdatingCastDirector] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<string>('');

  useEffect(() => {
    if (!currentUser) navigate('/');
  }, [currentUser, navigate]);

  useEffect(() => {
    loadRecentMovies();
  }, []);

  const loadRecentMovies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/movies`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      if (data.success) {
        setAllMovies(data.movies);
        const recent = [...data.movies].sort((a, b) => b.id - a.id).slice(0, 12);
        setRecentMovies(recent);
      }
    } catch (error) {
      console.error('Error loading recent movies:', error);
    }
  };

  const handleMovieClickFromCarousel = (movie: any) => {
    navigate(`/movie/${createSlug(movie.title, movie.year)}`);
  };

  const handleTryMyLuck = () => {
    if (movies.length > 0) {
      const randomMovie = movies[Math.floor(Math.random() * movies.length)];
      navigate(`/movie/${createSlug(randomMovie.title, randomMovie.year)}`);
    }
  };

  useEffect(() => {
    if (activeSection === 'comments' && currentUser) fetchUserComments();
  }, [activeSection, currentUser]);

  useEffect(() => {
    if (activeSection === 'ratings' && currentUser) fetchUserRatings();
  }, [activeSection, currentUser]);

  const fetchUserComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/comments`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      if (data.success) {
        const filtered = data.comments.filter((c: any) => c.username === currentUser.username);
        setUserComments(filtered);

        const moviesResponse = await fetch(`${API_BASE_URL}/movies`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        });
        const moviesData = await moviesResponse.json();
        if (moviesData.success) setMovies(moviesData.movies);
      }
    } catch (error) {
      console.error('Error fetching user comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRatings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-ratings/${currentUser.username}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();

      if (data.success) {
        const ratingsArray = Object.entries(data.userRatings).map(([movieId, rating]) => ({
          movieId,
          rating: Number(rating),
        }));
        setUserRatings(ratingsArray);

        const [moviesResponse, toWatchResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/movies`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }),
          fetch(`${API_BASE_URL}/towatch`, { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }),
        ]);

        const moviesData = await moviesResponse.json();
        const toWatchData = await toWatchResponse.json();

        setMovies([
          ...(moviesData.success ? moviesData.movies : []),
          ...(toWatchData.success ? toWatchData.movies : []),
        ]);
      }
    } catch (error) {
      console.error('Error fetching user ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    navigate('/');
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMessage('');
    if (newPassword && newPassword !== confirmPassword) {
      setUpdateMessage('Passwords do not match');
      return;
    }
    updateProfileInBackend();
  };

  const updateProfileInBackend = async () => {
    try {
      const updateData: any = {
        userId: currentUser.id,
        email: newEmail,
        profilePicture: profilePicture,
      };
      if (newPassword && newPassword.trim() !== '') updateData.password = newPassword;

      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (data.success) {
        const updatedUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setUpdateMessage('Profile updated successfully!');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setUpdateMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setUpdateMessage('Failed to update profile. Please try again.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
      setUpdateMessage('Please upload a JPG or PNG image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUpdateMessage('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setProfilePicture(base64String);

      try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId: currentUser.id, profilePicture: base64String }),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.success) {
          const updatedUser = data.user;
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser);
          setShowImageUpload(false);
          setUpdateMessage('Profile picture updated successfully!');
        } else {
          setUpdateMessage(`Error: ${data.error}`);
        }
      } catch (error) {
        console.error('Error updating profile picture:', error);
        setUpdateMessage('Failed to update profile picture. Please try again.');
      }
    };
    reader.readAsDataURL(file);
  };

  const getMovieTitle = (movieId: string) => {
    const movie = movies.find(m => m.id === parseInt(movieId));
    return movie?.title || 'Unknown Movie';
  };

  const getMovieSlug = (movieId: string) => {
    const movie = movies.find(m => m.id === parseInt(movieId));
    return movie ? createSlug(movie.title, movie.year) : null;
  };

  const handleUpdateCastDirector = async () => {
    setIsUpdatingCastDirector(true);
    setUpdateProgress('Starting update...');

    try {
      let hasMore = true;
      let totalUpdated = 0;

      while (hasMore) {
        setUpdateProgress(`Updating... (${totalUpdated} movies updated so far)`);

        const response = await fetch(`${API_BASE_URL}/movies/update-cast-director?limit=10`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.success) {
          totalUpdated += data.updated;
          hasMore = data.hasMore;

          if (!hasMore) {
            setUpdateProgress(`✅ Complete! Updated ${totalUpdated} movies.`);
            setTimeout(() => {
              loadRecentMovies();
              setUpdateProgress('');
              setIsUpdatingCastDirector(false);
            }, 3000);
          }
        } else {
          setUpdateProgress(`❌ Error: ${data.error}`);
          setIsUpdatingCastDirector(false);
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error('Error updating cast/director:', error);
      setUpdateProgress(`❌ Failed to update: ${error}`);
      setIsUpdatingCastDirector(false);
    }
  };

  if (!currentUser) return null;

  const inputClass = `w-full px-3 py-2 text-[13px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d07339] bg-[#fdfaf8] border-[#eea77a] text-[#100b09] placeholder-[rgba(16,11,9,0.5)] dark:bg-[#18110c] dark:border-[#7e3e15] dark:text-[rgba(247,241,237,0.9)] dark:placeholder-[rgba(247,241,237,0.4)]`;
  const labelClass = `block mb-2 text-[11px] font-semibold uppercase tracking-wide text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]`;

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfaf8] dark:bg-[#0b0704]">
      {/* Header */}
      <div
        className="sticky top-0 z-40 bg-white dark:bg-[#120d09] border-b"
        style={{ height: '64px', borderBottomColor: isDarkMode ? 'rgba(126,62,21,0.4)' : 'rgba(208,115,57,0.25)', borderBottomWidth: '1px' }}
      >
        <div className="relative flex items-center justify-between gap-4 px-6 h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition-opacity" onClick={() => navigate('/')}>
            <img src={logoImage} alt="Trash Bin Logo" className="size-6" />
            <h1 className="text-sm font-bold tracking-tight text-[#100b09] dark:text-[#f7f1ed]">Trash Bin</h1>
          </div>

          {/* Search */}
          <div className="absolute hidden md:flex items-center gap-4" style={{ left: 'calc(100vw / 8)', width: 'auto' }}>
            <div className="relative" style={{ width: 'calc(100vw / 8 * 3)' }}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]" />
              <Input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) navigate(`/?search=${encodeURIComponent(e.target.value)}`);
                }}
                className="h-10 pl-10 pr-10 border rounded-lg bg-[#fdfaf8] text-[#100b09] placeholder-[rgba(16,11,9,0.6)] border-[#eea77a] focus:border-[#d07339] dark:bg-[#18110c] dark:text-[rgba(247,241,237,0.6)] dark:border-[#7e3e15] dark:focus:border-[#c36a32] dark:placeholder-[rgba(247,241,237,0.6)]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-opacity hover:opacity-70 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <button
              onClick={handleTryMyLuck}
              className="text-sm font-medium cursor-pointer tracking-tight whitespace-nowrap text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] transition-colors"
            >
              🎲 Random
            </button>
          </div>

          {/* Update Data button */}
          <button
            onClick={handleUpdateCastDirector}
            disabled={isUpdatingCastDirector}
            className={`absolute hidden md:flex items-center gap-1.5 text-sm font-medium tracking-tight whitespace-nowrap transition-colors text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] ${isUpdatingCastDirector ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{ left: 'calc(100vw / 8 + (100vw / 8 * 3) + 150px)' }}
          >
            <RefreshCw className={`size-4 ${isUpdatingCastDirector ? 'animate-spin' : ''}`} />
            {isUpdatingCastDirector ? 'Updating...' : 'Update Data'}
          </button>

          {/* Right side */}
          <div className="flex items-center gap-4 md:gap-6">
            <h1
              className="hidden md:block text-sm font-medium cursor-pointer tracking-tight text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] transition-colors"
              onClick={() => navigate('/?view=towatch')}
            >
              Watchlist
            </h1>
            <h1
              className="md:hidden text-sm font-medium cursor-pointer tracking-tight text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] transition-colors"
              onClick={() => navigate('/?view=towatch')}
            >
              Watchlist
            </h1>
            <DarkModeToggle isDark={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
            <button
              onClick={() => navigate('/profile')}
              className="text-sm font-medium cursor-pointer tracking-tight whitespace-nowrap text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] transition-colors"
            >
              Profile
            </button>
          </div>
        </div>
      </div>

      {/* Recent Movies Carousel */}
      <header
        className="border-b w-full bg-[#fbf3ee] dark:bg-[#120d09]"
        style={{ borderBottomColor: isDarkMode ? 'rgba(126,62,21,0.4)' : 'rgba(208,115,57,0.25)', borderBottomWidth: '1px' }}
      >
        <div className="w-full">
          <RecentMoviesCarousel movies={recentMovies} onMovieClick={handleMovieClickFromCarousel} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-3 md:px-6 py-4 md:py-8">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="rounded-[10px] p-3 md:p-4 bg-white dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)]">
              <div className="mb-4 md:mb-6 text-center">
                <button
                  onClick={() => setShowImageUpload(true)}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full mx-auto mb-2 md:mb-3 flex items-center justify-center overflow-hidden cursor-pointer transition-opacity hover:opacity-70 bg-[rgba(238,167,122,0.2)] dark:bg-[rgba(126,62,21,0.25)]"
                >
                  {profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="size-8 md:size-10 text-[#d07339] dark:text-[#c36a32]" />
                  )}
                </button>
                <h2 className="text-base md:text-lg font-bold text-[#100b09] dark:text-[#f7f1ed]">
                  {currentUser.username}
                </h2>
                <p className="text-[11px] md:text-[13px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]">
                  {currentUser.email}
                </p>
              </div>

              <nav className="grid grid-cols-2 md:grid-cols-1 gap-1">
                {(['profile', 'comments', 'ratings'] as ProfileSection[]).map((section) => (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`w-full text-left px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-[11px] md:text-[13px] font-medium transition-colors ${
                      activeSection === section
                        ? 'bg-[#d07339] dark:bg-[#c36a32] text-white'
                        : 'text-[rgba(16,11,9,0.7)] dark:text-[rgba(247,241,237,0.7)] hover:bg-[rgba(238,167,122,0.15)] dark:hover:bg-[rgba(126,62,21,0.2)]'
                    }`}
                  >
                    {section === 'profile' ? 'My Profile' : section === 'comments' ? 'My Comments' : 'My Ratings'}
                  </button>
                ))}

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 md:px-4 py-2 md:py-2.5 rounded-lg text-[11px] md:text-[13px] font-medium transition-colors text-red-600 dark:text-red-400 hover:bg-[rgba(238,167,122,0.15)] dark:hover:bg-[rgba(126,62,21,0.2)]"
                >
                  Log Out
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            <div className="rounded-[10px] p-4 md:p-6 bg-white dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)]">
              {/* My Profile Section */}
              {activeSection === 'profile' && (
                <div>
                  <h2 className="text-[16px] font-bold mb-6 text-[#100b09] dark:text-[#f7f1ed]">Edit Profile</h2>

                  {updateMessage && (
                    <div className={`mb-4 p-3 rounded-lg text-[13px] ${
                      updateMessage.includes('success')
                        ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {updateMessage}
                    </div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
                    <div>
                      <label className={labelClass}>Profile Picture URL</label>
                      <input
                        type="url"
                        value={profilePicture}
                        onChange={(e) => setProfilePicture(e.target.value)}
                        placeholder="Enter image URL"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Email</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className={labelClass}>New Password (optional)</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        className={inputClass}
                      />
                    </div>

                    {newPassword && (
                      <div>
                        <label className={labelClass}>Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          required
                          className={inputClass}
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="px-6 py-2.5 text-[13px] font-medium rounded-lg transition-colors bg-[#d07339] hover:bg-[#b8622e] dark:bg-[#c36a32] dark:hover:bg-[#a85a28] text-white"
                    >
                      Update Profile
                    </button>
                  </form>

                  {updateProgress && (
                    <div className={`mt-6 p-3 rounded-lg text-[12px] max-w-md ${
                      updateProgress.includes('✅')
                        ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : updateProgress.includes('❌')
                        ? 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-[rgba(238,167,122,0.15)] text-[#100b09] dark:bg-[rgba(126,62,21,0.2)] dark:text-[rgba(247,241,237,0.8)]'
                    }`}>
                      {updateProgress}
                    </div>
                  )}
                </div>
              )}

              {/* My Comments Section */}
              {activeSection === 'comments' && (
                <div>
                  <h2 className="text-[16px] font-bold mb-6 text-[#100b09] dark:text-[#f7f1ed]">My Comments</h2>

                  {loading ? (
                    <p className="text-[13px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]">Loading comments...</p>
                  ) : userComments.length === 0 ? (
                    <p className="text-[13px] text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)]">You haven't posted any comments yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {userComments.map((comment) => {
                        const slug = getMovieSlug(comment.movieId);
                        return (
                          <button
                            key={comment.id}
                            onClick={() => slug && navigate(`/movie/${slug}`)}
                            className="w-full text-left p-4 rounded-lg border border-[rgba(208,115,57,0.15)] dark:border-[rgba(126,62,21,0.25)] hover:bg-[rgba(238,167,122,0.1)] dark:hover:bg-[rgba(126,62,21,0.15)] transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-semibold text-[14px] text-[#100b09] dark:text-[#f7f1ed]">
                                {getMovieTitle(comment.movieId)}
                              </h3>
                              <span className="text-[11px] text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)] shrink-0 ml-3">
                                {new Date(comment.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-[13px] text-[rgba(16,11,9,0.7)] dark:text-[rgba(247,241,237,0.7)]">
                              {comment.text}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* My Ratings Section */}
              {activeSection === 'ratings' && (
                <div>
                  <h2 className="text-[16px] font-bold mb-6 text-[#100b09] dark:text-[#f7f1ed]">My Ratings</h2>

                  {loading ? (
                    <p className="text-[13px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]">Loading ratings...</p>
                  ) : userRatings.length === 0 ? (
                    <p className="text-[13px] text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)]">You haven't rated any movies yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {userRatings.map((rating) => {
                        const slug = getMovieSlug(rating.movieId);
                        return (
                          <button
                            key={rating.movieId}
                            onClick={() => slug && navigate(`/movie/${slug}`)}
                            className="w-full p-4 rounded-lg border border-[rgba(208,115,57,0.15)] dark:border-[rgba(126,62,21,0.25)] flex items-center justify-between hover:bg-[rgba(238,167,122,0.1)] dark:hover:bg-[rgba(126,62,21,0.15)] transition-colors"
                          >
                            <h3 className="font-semibold text-[13px] text-left text-[#100b09] dark:text-[#f7f1ed]">
                              {getMovieTitle(rating.movieId)}
                            </h3>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`size-4 ${
                                    star <= rating.rating
                                      ? 'fill-[#f99251] text-[#f99251] dark:fill-[#a64a11] dark:text-[#a64a11]'
                                      : 'fill-none text-[rgba(16,11,9,0.2)] dark:text-[rgba(247,241,237,0.2)]'
                                  }`}
                                />
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="border-t bg-[#fbf3ee] dark:bg-[#120d09] mt-auto"
        style={{ borderTopColor: isDarkMode ? 'rgba(126,62,21,0.4)' : 'rgba(208,115,57,0.25)', borderTopWidth: '1px' }}
      >
        <div className="flex items-center justify-between px-6" style={{ height: '64px' }}>
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Trash Bin Logo" className="size-6" />
            <h1 className="text-sm font-bold tracking-tight text-[#100b09] dark:text-[#f7f1ed]">Trash Bin</h1>
          </div>
          <button
            onClick={() => {
              const subject = encodeURIComponent('Contact Trash Bin');
              const body = encodeURIComponent('Enter your message here...');
              window.location.href = `mailto:wannabenargail@gmail.com?subject=${subject}&body=${body}`;
            }}
            className="text-sm cursor-pointer transition-colors text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32]"
          >
            Contact
          </button>
          <span className="text-xs md:text-sm text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]">
            © {new Date().getFullYear()} All rights reserved
          </span>
        </div>
      </footer>

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowImageUpload(false)}
        >
          <div
            className="max-w-md w-full rounded-[10px] p-6 bg-[#fdfaf8] dark:bg-[#18110c] border border-[rgba(208,115,57,0.25)] dark:border-[rgba(126,62,21,0.4)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#100b09] dark:text-[#f7f1ed]">Upload Profile Picture</h3>
              <button
                onClick={() => setShowImageUpload(false)}
                className="text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)] hover:text-[#d07339] dark:hover:text-[#c36a32] transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-[13px] mb-4 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]">
              Choose a JPG or PNG image (max 5MB)
            </p>

            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleImageUpload}
              className="w-full text-[13px] text-[rgba(16,11,9,0.7)] dark:text-[rgba(247,241,237,0.7)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[13px] file:font-medium file:bg-[#d07339] file:text-white hover:file:bg-[#b8622e] dark:file:bg-[#c36a32] dark:hover:file:bg-[#a85a28] file:cursor-pointer file:transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
