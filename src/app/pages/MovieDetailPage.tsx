import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Star, Calendar, Clock, Film, Users, ExternalLink, Trash2, Search, X, User, Check, Tag, ChevronRight, ChevronLeft, Play, FileText, Pencil, ImageIcon, Reply } from 'lucide-react';
import { GifPicker } from '../components/GifPicker';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Movie } from '../components/MovieCard';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { DarkModeToggle } from '../components/DarkModeToggle';
import { LoginModal } from '../components/LoginModal';
import { AddMovieDialog } from '../components/AddMovieDialog';
import { RecentMoviesCarousel } from '../components/RecentMoviesCarousel';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { createSlug, decodeSlug } from '../utils/slugify';
const logoImage = 'https://i.imgur.com/vUiVqow.png?direct';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-ea58c774`;

interface Comment {
  id: number;
  movieId: number;
  username: string;
  text: string;
  timestamp: number;
  profilePicture?: string;
  parentId?: number;
  imageUrl?: string;
}

interface MovieDetailPageProps {
  currentUser: any;
  setCurrentUser: (user: any) => void;
}

export function MovieDetailPage({ currentUser, setCurrentUser }: MovieDetailPageProps) {
  const { title: titleSlug } = useParams<{ title: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [username, setUsername] = useState('');
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [communityRating, setCommunityRating] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  
  // Reply + image state for comments
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyingToUsername, setReplyingToUsername] = useState<string>('');
  const [replyingToReplyId, setReplyingToReplyId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyUsername, setReplyUsername] = useState('');
  const [replyImageUrl, setReplyImageUrl] = useState('');
  const [showReplyImageInput, setShowReplyImageInput] = useState(false);
  const [commentImageUrl, setCommentImageUrl] = useState('');
  const [showCommentImageInput, setShowCommentImageInput] = useState(false);
  const [showCommentGifPicker, setShowCommentGifPicker] = useState(false);
  const [showReplyGifPicker, setShowReplyGifPicker] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({});

  const EMOJIS = ['👍', '👎', '❤️', '😂', '😮'];

  // Password prompt state for deleting comments
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');
  const [pendingDeleteCommentId, setPendingDeleteCommentId] = useState<number | null>(null);
  const [pendingDeleteUsername, setPendingDeleteUsername] = useState('');
  
  // Password prompt state for updating poster
  const [showPosterPrompt, setShowPosterPrompt] = useState(false);
  const [posterPassword, setPosterPassword] = useState('');
  const [posterPasswordError, setPosterPasswordError] = useState('');
  const [newPosterUrl, setNewPosterUrl] = useState('');
  
  // Trailer state
  const [newTrailerUrl, setNewTrailerUrl] = useState('');
  
  // Carousel state (poster/trailer toggle)
  const [carouselView, setCarouselView] = useState<'poster' | 'trailer'>('poster');
  
  // Trailer playing state - only load iframe when user clicks play
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false);
  
  // Password prompt state for updating trailer
  const [showTrailerPrompt, setShowTrailerPrompt] = useState(false);
  const [trailerPassword, setTrailerPassword] = useState('');
  const [trailerPasswordError, setTrailerPasswordError] = useState('');
  
  // Password prompt state for deleting movie
  const [showDeleteMoviePrompt, setShowDeleteMoviePrompt] = useState(false);
  const [deleteMoviePassword, setDeleteMoviePassword] = useState('');
  const [deleteMoviePasswordError, setDeleteMoviePasswordError] = useState('');

  // Tags state
  const [newTag, setNewTag] = useState('');
  
  // Runtime update state
  const [showRuntimePrompt, setShowRuntimePrompt] = useState(false);
  const [runtimePassword, setRuntimePassword] = useState('');
  const [runtimePasswordError, setRuntimePasswordError] = useState('');
  const [newRuntime, setNewRuntime] = useState('');
  const [isEditingRuntime, setIsEditingRuntime] = useState(false);

  // For AddMovieDialog
  const [allMovies, setAllMovies] = useState<Movie[]>([]);

  // Track if this movie is from the "to watch" list
  const [isFromToWatch, setIsFromToWatch] = useState(false);


  // Generate or retrieve anonymous user ID for non-logged-in users
  const getAnonymousUserId = () => {
    let anonymousId = localStorage.getItem('anonymousUserId');
    if (!anonymousId) {
      // Generate a unique ID using timestamp + random string
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('anonymousUserId', anonymousId);
    }
    return anonymousId;
  };

  const handleTryMyLuck = () => {
    // Navigate to home page and let it handle the random selection
    navigate('/');
  };

  // Apply dark mode on load and when it changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (titleSlug) {
      loadMovieData();
      loadRecentMovies();
    }
  }, [titleSlug]);

  // Load comments and rating after movie is loaded
  useEffect(() => {
    if (movie) {
      loadComments();
      loadUserRating();
    }
  }, [movie?.id, currentUser]);

  const loadRecentMovies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/movies`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      
      if (data.success) {
        // Get 12 most recent movies
        const recent = [...data.movies]
          .sort((a, b) => b.id - a.id)
          .slice(0, 12);
        setRecentMovies(recent);
      }
    } catch (error) {
      console.error('Error loading recent movies:', error);
    }
  };

  const loadMovieData = async () => {
    try {
      setIsLoading(true);
      
      // Load from main movies
      const moviesResponse = await fetch(`${API_BASE_URL}/movies`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const moviesData = await moviesResponse.json();
      
      // Load from to watch
      const toWatchResponse = await fetch(`${API_BASE_URL}/towatch`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const toWatchData = await toWatchResponse.json();
      
      // Combine and find the movie
      const allMoviesData = [...moviesData.movies, ...toWatchData.movies];
      setAllMovies(allMoviesData);

      // The slug format is now "title-year", so we need to match it properly
      const foundMovie = allMoviesData.find((m: Movie) =>
        createSlug(m.title, m.year) === titleSlug
      );
      
      if (foundMovie) {
        console.log('Found movie data:', foundMovie);
        console.log('Movie ID:', foundMovie.id);
        setMovie(foundMovie);
        // Don't set userRating here - let loadUserRating handle it
        
        // Set the poster URL input to current poster by default
        setNewPosterUrl(foundMovie.image);
        
        // Find recommended movies based on the first genre (randomly ordered)
        if (foundMovie.genre) {
          // Get the first genre from the current movie
          const firstGenre = foundMovie.genre.split(',')[0].trim().toLowerCase();
          
          // Filter movies that have the same first genre
          const filtered = allMoviesData.filter((m: Movie) => 
            m.id !== foundMovie.id && // Exclude current movie
            m.genre && 
            m.genre.split(',').some((g: string) => 
              g.trim().toLowerCase() === firstGenre
            )
          );
          
          // Randomize and take 5
          const shuffled = filtered.sort(() => Math.random() - 0.5);
          const similar = shuffled.slice(0, 5);
          
          setSimilarMovies(similar);
        }
        
        // Check if this movie is from the "to watch" list
        setIsFromToWatch(toWatchData.movies.some((m: Movie) => m.id === foundMovie.id));
      } else {
        // Movie not found - redirect to 404 page
        navigate('/404-not-found', { replace: true });
        return;
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading movie:', error);
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    if (!movie) return;
    try {
      const response = await fetch(`${API_BASE_URL}/comments`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await response.json();
      
      const movieComments = data.comments.filter((c: Comment) => c.movieId === movie.id);
      setComments(movieComments.sort((a: Comment, b: Comment) => a.timestamp - b.timestamp));
      await loadReactions();
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const loadUserRating = async () => {
    if (!movie) return;

    console.log('Loading user rating for movie ID:', movie.id);

    try {
      // Load community rating for this movie
      const ratingsResponse = await fetch(`${API_BASE_URL}/ratings/${movie.id}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const ratingsData = await ratingsResponse.json();
      console.log('Community ratings data:', ratingsData);
      
      if (ratingsData.success) {
        setCommunityRating(ratingsData.average || 0);
        setRatingCount(ratingsData.count || 0);
        
        // Update movie object with community rating
        setMovie({
          ...movie,
          communityRating: ratingsData.average,
          ratingCount: ratingsData.count
        });
      }

      // Determine user identifier
      let userIdentifier = '';
      if (currentUser) {
        userIdentifier = currentUser.username;
      } else {
        userIdentifier = getAnonymousUserId();
      }

      console.log('Fetching ratings for user identifier:', userIdentifier);

      // Load user's personal rating
      const userRatingsResponse = await fetch(`${API_BASE_URL}/user-ratings/${userIdentifier}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const userData = await userRatingsResponse.json();
      console.log('User ratings data:', userData);
      
      if (userData.success && userData.userRatings) {
        const rating = userData.userRatings[movie.id] || 0;
        console.log(`User's rating for movie ${movie.id}:`, rating);
        setUserRating(rating);
      }
    } catch (error) {
      console.error('Error loading ratings:', error);
    }
  };

  const handleAddComment = async () => {
    const finalUsername = currentUser ? currentUser.username : username.trim();

    if ((!newComment.trim() && !commentImageUrl.trim()) || !finalUsername) {
      alert('Please enter a comment or attach an image/GIF');
      return;
    }

    if (!movie) return;

    try {
      const comment: Comment = {
        id: Date.now(),
        movieId: movie.id,
        username: finalUsername,
        text: newComment.trim(),
        timestamp: Date.now(),
        profilePicture: currentUser?.profilePicture || '',
        ...(commentImageUrl.trim() && { imageUrl: commentImageUrl.trim() }),
      };

      await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(comment),
      });

      setNewComment('');
      setCommentImageUrl('');
      setShowCommentImageInput(false);
      if (!currentUser) setUsername('');
      loadComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAddReply = async (parentId: number) => {
    const finalUsername = currentUser ? currentUser.username : replyUsername.trim();

    if ((!replyText.trim() && !replyImageUrl.trim()) || !finalUsername) {
      alert('Please enter a reply or attach an image/GIF');
      return;
    }

    if (!movie) return;

    try {
      const reply: Comment = {
        id: Date.now(),
        movieId: movie.id,
        username: finalUsername,
        text: replyText.trim(),
        timestamp: Date.now(),
        profilePicture: currentUser?.profilePicture || '',
        parentId,
        ...(replyImageUrl.trim() && { imageUrl: replyImageUrl.trim() }),
      };

      await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(reply),
      });

      setReplyText('');
      setReplyImageUrl('');
      setShowReplyImageInput(false);
      setReplyingToId(null);
      if (!currentUser) setReplyUsername('');
      loadComments();
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const loadReactions = async () => {
    if (!movie) return;
    try {
      const res = await fetch(`${API_BASE_URL}/reactions/${movie.id}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await res.json();
      if (data.success) setReactions(data.reactions || {});
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  };

  const handleReact = async (commentId: number, emoji: string) => {
    if (!movie) return;
    const userIdentifier = currentUser ? currentUser.username : getAnonymousUserId();
    try {
      const res = await fetch(`${API_BASE_URL}/reactions/${movie.id}/${commentId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, userIdentifier }),
      });
      const data = await res.json();
      if (data.success) {
        setReactions(prev => ({ ...prev, [String(commentId)]: data.reactions }));
      }
    } catch (error) {
      console.error('Error reacting:', error);
    }
  };

  const handleDeleteComment = async (commentId: number, commentUsername: string) => {
    if (!movie) return;
    // If user is logged in and owns the comment, delete without password
    if (currentUser && currentUser.username === commentUsername) {
      const confirm = window.confirm('Are you sure you want to delete this comment?');
      if (!confirm) return;

      try {
        await fetch(`${API_BASE_URL}/comments/${movie.id}/${commentId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        });
        loadComments();
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
      return;
    }

    // For other cases, prompt for master password
    setShowDeletePrompt(true);
    setPendingDeleteCommentId(commentId);
    setPendingDeleteUsername(commentUsername);
  };

  const handleDeletePasswordSubmit = async () => {
    if (!pendingDeleteCommentId || !movie) return;

    // Check master password "hassle"
    if (deletePassword !== 'hassle') {
      setDeletePasswordError('Incorrect password');
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/comments/${movie.id}/${pendingDeleteCommentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      loadComments();
      setShowDeletePrompt(false);
      setDeletePassword('');
      setDeletePasswordError('');
    } catch (error) {
      console.error('Error deleting comment:', error);
      setShowDeletePrompt(false);
      setDeletePassword('');
      setDeletePasswordError('');
    }
  };

  const handleRatingChange = async (rating: number) => {
    if (!movie) return;

    let userIdentifier = '';

    // If logged in, use their username
    if (currentUser) {
      userIdentifier = currentUser.username;
    } else {
      // For non-logged-in users, use anonymous ID
      userIdentifier = getAnonymousUserId();
    }

    console.log('Submitting rating:', { movieId: movie.id, rating, userIdentifier });

    try {
      // Submit rating to the ratings API
      const response = await fetch(`${API_BASE_URL}/ratings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          movieId: movie.id,
          rating: rating,
          userIdentifier: userIdentifier,
        }),
      });

      const data = await response.json();
      console.log('Rating submission response:', data);
      
      if (data.success) {
        setUserRating(rating);
        console.log('Rating submitted successfully, reloading ratings...');
        // Reload ratings to update community rating
        await loadUserRating();
      } else {
        console.error('Failed to submit rating:', data.error);
        alert(`Failed to submit rating: ${data.error}`);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating. Please try again.');
    }
  };

  const handleUpdatePoster = () => {
    if (newPosterUrl.trim() !== '') {
      setShowPosterPrompt(true);
      setPosterPassword('');
      setPosterPasswordError('');
    }
  };

  const handlePosterPasswordSubmit = async () => {
    if (!movie) return;

    // Check master password "hassle"
    if (posterPassword !== 'hassle') {
      setPosterPasswordError('Incorrect password');
      return;
    }

    try {
      const endpoint = isFromToWatch ? 'towatch' : 'movies';
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${movie.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: newPosterUrl }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Poster update failed:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to update poster');
      }

      const data = await response.json();
      console.log('Poster updated successfully:', data);
      
      // Update the movie state
      setMovie({ ...movie, image: newPosterUrl });
      setNewPosterUrl('');
      setShowPosterPrompt(false);
      setPosterPassword('');
      setPosterPasswordError('');
      
      alert('Poster updated successfully!');
    } catch (error) {
      console.error('Error updating poster:', error);
      setPosterPasswordError(error instanceof Error ? error.message : 'Failed to update poster');
    }
  };

  const handleDeleteMovie = () => {
    setShowDeleteMoviePrompt(true);
    setDeleteMoviePassword('');
    setDeleteMoviePasswordError('');
  };

  const handleDeleteMoviePasswordSubmit = async () => {
    if (!movie) return;

    // Check master password "hassle"
    if (deleteMoviePassword !== 'hassle') {
      setDeleteMoviePasswordError('Incorrect password');
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/movies/${movie.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      
      // Navigate back to home after deleting
      navigate('/');
    } catch (error) {
      console.error('Error deleting movie:', error);
      setDeleteMoviePasswordError('Failed to delete movie');
    }
  };

  const handleAddMovie = async (newMovie: Movie) => {
    try {
      // Add to main movies collection
      await fetch(`${API_BASE_URL}/movies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(newMovie),
      });
      
      // Reload movies list
      await loadMovieData();
    } catch (error) {
      console.error('Error adding movie:', error);
    }
  };

  const handleMarkAsWatched = async () => {
    if (!movie) return;

    const confirmed = window.confirm(`Mark "${movie.title}" as watched and move to main list?`);
    if (!confirmed) return;

    try {
      // Get current movies to find max ID
      const moviesRes = await fetch(`${API_BASE_URL}/movies`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const moviesData = await moviesRes.json();
      const currentMovies = moviesData.movies || [];
      const maxId = currentMovies.length > 0 ? Math.max(...currentMovies.map((m: any) => m.id)) : 0;
      const newId = maxId + 1;

      // Fetch all comments for this movie and migrate to new ID
      const commentsRes = await fetch(`${API_BASE_URL}/comments`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const commentsData = await commentsRes.json();
      const movieComments = (commentsData.comments || []).filter((c: Comment) => c.movieId === movie.id);

      for (const comment of movieComments) {
        // Create comment under the new movie ID
        await fetch(`${API_BASE_URL}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ ...comment, movieId: newId }),
        });
        // Delete the old comment (endpoint requires movieId/commentId)
        await fetch(`${API_BASE_URL}/comments/${movie.id}/${comment.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        });
      }

      // Fetch all ratings for this movie and migrate to new ID
      const ratingsRes = await fetch(`${API_BASE_URL}/ratings/${movie.id}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const ratingsData = await ratingsRes.json();
      const individualRatings = ratingsData.ratings || [];

      for (const ratingEntry of individualRatings) {
        await fetch(`${API_BASE_URL}/ratings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ movieId: newId, rating: ratingEntry.rating, userIdentifier: ratingEntry.userIdentifier }),
        });
      }

      // Delete from to-watch
      await fetch(`${API_BASE_URL}/towatch/${movie.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });

      // Add to main movies with updated timestamp and new ID
      const movieToAdd = {
        ...movie,
        id: newId,
        dateAdded: Date.now(),
      };

      await fetch(`${API_BASE_URL}/movies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(movieToAdd),
      });

      navigate('/');
    } catch (error) {
      console.error('Error marking movie as watched:', error);
      alert('Failed to mark movie as watched. Please try again.');
    }
  };

  const handleAddTag = async () => {
    if (!movie || !newTag.trim()) return;

    const currentTags = movie.tags || [];
    const updatedTags = [...currentTags, newTag.trim()];

    try {
      const endpoint = isFromToWatch ? 'towatch' : 'movies';
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${movie.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (response.ok) {
        setMovie({ ...movie, tags: updatedTags });
        setNewTag('');
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!movie) return;

    const currentTags = movie.tags || [];
    const updatedTags = currentTags.filter(tag => tag !== tagToRemove);

    try {
      const endpoint = isFromToWatch ? 'towatch' : 'movies';
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${movie.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (response.ok) {
        setMovie({ ...movie, tags: updatedTags });
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  const handleUpdateTrailer = () => {
    console.log('=== handleUpdateTrailer CALLED ===');
    console.log('newTrailerUrl:', newTrailerUrl);
    
    if (!movie || !newTrailerUrl.trim()) {
      console.log('EARLY RETURN: No movie or empty URL');
      alert('Please enter a trailer URL');
      return;
    }

    console.log('Opening trailer password modal...');
    setShowTrailerPrompt(true);
    setTrailerPassword('');
    setTrailerPasswordError('');
  };

  const handleTrailerPasswordSubmit = async () => {
    if (!movie) return;

    if (trailerPassword !== 'hassle') {
      setTrailerPasswordError('Incorrect password');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/movies/${movie.id}/trailer`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trailer: newTrailerUrl }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update trailer');
      }

      setMovie({ ...movie, trailer: newTrailerUrl });
      setNewTrailerUrl('');
      setShowTrailerPrompt(false);
      setTrailerPassword('');
      setTrailerPasswordError('');
      
      alert('Trailer updated successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Error updating trailer:', error);
      setTrailerPasswordError(`Failed to update trailer: ${error}`);
    }
  };

  const handleUpdateRuntime = () => {
    if (!newRuntime.trim()) {
      alert('Please enter a runtime');
      return;
    }
    setShowRuntimePrompt(true);
    setRuntimePassword('');
    setRuntimePasswordError('');
  };

  const handleRuntimePasswordSubmit = async () => {
    if (!movie) return;

    if (runtimePassword !== 'hassle') {
      setRuntimePasswordError('Incorrect password');
      return;
    }

    try {
      const endpoint = isFromToWatch ? 'towatch' : 'movies';
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${movie.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runtime: newRuntime }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update runtime');
      }

      setMovie({ ...movie, runtime: newRuntime });
      setNewRuntime('');
      setIsEditingRuntime(false);
      setShowRuntimePrompt(false);
      setRuntimePassword('');
      setRuntimePasswordError('');
      
      alert('Runtime updated successfully!');
    } catch (error) {
      console.error('Error updating runtime:', error);
      setRuntimePasswordError(`Failed to update runtime: ${error}`);
    }
  };

  // Helper function to extract YouTube video ID
  const getYouTubeVideoId = (url: string | undefined) => {
    if (!url) return null;
    
    try {
      // Handle youtube.com/watch?v= format
      if (url.includes('youtube.com/watch')) {
        const urlObj = new URL(url);
        const videoId = urlObj.searchParams.get('v');
        if (videoId) return videoId;
      }
      
      // Handle youtu.be/ format
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) return videoId;
      }
      
      // Handle youtube.com/embed/ format (but NOT embed search)
      if (url.includes('youtube.com/embed/') && !url.includes('listType=search')) {
        const videoId = url.split('youtube.com/embed/')[1]?.split('?')[0];
        if (videoId) return videoId;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing YouTube URL:', error);
      return null;
    }
  };

  // Helper function to convert YouTube URLs to embed format
  const getYouTubeEmbedUrl = (url: string | undefined) => {
    if (!url) return null;
    
    // If it's already an embed search URL, return as-is
    if (url.includes('youtube.com/embed') && url.includes('listType=search')) {
      return url;
    }
    
    // Otherwise, try to extract video ID and convert
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };
  
  // Helper function to get YouTube thumbnail
  const getYouTubeThumbnail = (url: string | undefined) => {
    if (!url) return null;
    
    // For embed search URLs, we can't get a thumbnail - return a placeholder
    if (url.includes('listType=search')) {
      return 'https://i.ytimg.com/vi//maxresdefault.jpg'; // YouTube's default placeholder
    }
    
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };

  // Filter movies for search dropdown
  const searchResults = searchQuery
    ? allMovies.filter((movie) => {
        const query = searchQuery.toLowerCase();
        return (
          movie.title.toLowerCase().includes(query) ||
          movie.genre.toLowerCase().includes(query) ||
          movie.year.toString().includes(query)
        );
      })
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfaf8] dark:bg-[#0b0704]">
        <div className="flex flex-col items-center gap-4">
          {/* Spinning Logo */}
          <div className="w-16 h-16 animate-spin">
            <img src="https://i.imgur.com/vUiVqow.png?direct" alt="Trash Bin Logo" className="w-full h-full" />
          </div>
          {/* Loading Text */}
          <div className="text-lg font-medium text-[#100b09] dark:text-[#f7f1ed]">
            Bear with us...
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-4 dark:text-white">Movie not found</h1>
          <Button onClick={() => navigate('/')}>Go Back Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-[#fdfaf8] dark:bg-[#0b0704] ${isDarkMode ? 'dark' : ''}`}>
      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        isDarkMode={isDarkMode}
      />

      {/* Header */}
      <div
        className="sticky top-0 z-40 bg-white dark:bg-[#120d09] border-b"
        style={{ height: '64px', borderBottomColor: isDarkMode ? 'rgba(126,62,21,0.4)' : 'rgba(208,115,57,0.25)', borderBottomWidth: '1px' }}
      >
        <div className="flex items-center justify-between gap-4 px-6 h-full">
          {/* Left side - Logo */}
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => navigate('/')}
          >
            <img src={logoImage} alt="Trash Bin Logo" className="size-6" />
            <h1 className="text-sm font-bold tracking-tight text-[#100b09] dark:text-[#f7f1ed]">
              Trash Bin
            </h1>
          </div>

          {/* Center - Search Bar with Random */}
          <div className="absolute hidden md:flex items-center gap-4" style={{ left: 'calc(100vw / 8)', width: 'auto' }}>
            <div className="relative" style={{ width: 'calc(100vw / 8 * 3)' }}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]" />
              <Input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(e.target.value.length > 0);
                }}
                onFocus={() => setShowSearchDropdown(searchQuery.length > 0)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                className="h-10 pl-10 pr-10 border rounded-lg bg-[#fdfaf8] text-[#100b09] placeholder-[rgba(16,11,9,0.6)] border-[#eea77a] focus:border-[#d07339] dark:bg-[#18110c] dark:text-[rgba(247,241,237,0.6)] dark:border-[#7e3e15] dark:focus:border-[#c36a32] dark:placeholder-[rgba(247,241,237,0.6)]"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-opacity hover:opacity-70 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}

              {/* Live Search Dropdown */}
              {showSearchDropdown && searchQuery && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50 bg-[#fdfaf8] border-[rgba(208,115,57,0.25)] dark:bg-[#120d09] dark:border-[rgba(126,62,21,0.4)]">
                  {searchResults.slice(0, 8).map((movie) => (
                    <div
                      key={movie.id}
                      onClick={() => {
                        navigate(`/movie/${createSlug(movie.title, movie.year)}`);
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-[rgba(238,167,122,0.15)] dark:hover:bg-[rgba(126,62,21,0.2)] border-b last:border-b-0 border-[rgba(208,115,57,0.15)] dark:border-[rgba(126,62,21,0.3)]"
                    >
                      <ImageWithFallback
                        src={movie.image}
                        alt={movie.title}
                        className="w-12 h-16 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-[#100b09] dark:text-[#f7f1ed]">
                          {movie.title}
                        </div>
                        <div className="text-xs flex items-center gap-2 mt-1 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]">
                          {(movie.imdbRating || movie.rating) ? (
                            <span className="flex items-center gap-1">
                              <Star className="size-3 fill-[#f99251] text-[#f99251] dark:fill-[#a64a11] dark:text-[#a64a11]" />
                              {(movie.imdbRating || movie.rating).toFixed(1)}
                            </span>
                          ) : null}
                          {movie.runtime && (
                            <>
                              {(movie.imdbRating || movie.rating) && <span>•</span>}
                              <span>{movie.runtime}</span>
                            </>
                          )}
                          <>
                            {((movie.imdbRating || movie.rating) || movie.runtime) && <span>•</span>}
                            <span>{movie.year}</span>
                          </>
                        </div>
                        {movie.genre && (
                          <div className="text-xs mt-0.5 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]">
                            {movie.genre}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Random button */}
            <button
              onClick={handleTryMyLuck}
              className="text-sm font-medium cursor-pointer tracking-tight whitespace-nowrap text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] transition-colors"
            >
              🎲 Random
            </button>
          </div>

          {/* Right side - Watchlist, Theme toggle and Sign in */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Watchlist for desktop */}
            <h1
              className="hidden md:block text-sm font-medium cursor-pointer tracking-tight text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] transition-colors"
              onClick={() => navigate('/?view=towatch')}
            >
              Watchlist
            </h1>

            {/* Random + Watchlist for mobile */}
            <button
              onClick={handleTryMyLuck}
              className="md:hidden text-sm font-medium cursor-pointer tracking-tight text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] transition-colors"
            >
              🎲
            </button>
            <h1
              className="md:hidden text-sm font-medium cursor-pointer tracking-tight text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] transition-colors"
              onClick={() => navigate('/?view=towatch')}
            >
              Watchlist
            </h1>

            <DarkModeToggle isDark={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />

            {currentUser ? (
              <button
                onClick={() => navigate('/profile')}
                className="text-sm font-medium cursor-pointer tracking-tight whitespace-nowrap text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] transition-colors"
              >
                Profile
              </button>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="text-sm font-medium cursor-pointer tracking-tight whitespace-nowrap text-[rgba(16,11,9,0.6)] hover:text-[#d07339] dark:text-[rgba(247,241,237,0.6)] dark:hover:text-[#c36a32] transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Movies Navigation - Full Width */}
      <header
        className="border-b w-full bg-[#fbf3ee] dark:bg-[#120d09]"
        style={{ borderBottomColor: isDarkMode ? 'rgba(126,62,21,0.4)' : 'rgba(208,115,57,0.25)', borderBottomWidth: '1px' }}
      >
        <div className="w-full">
          <RecentMoviesCarousel movies={recentMovies} onMovieClick={(movie) => navigate(`/movie/${createSlug(movie.title, movie.year)}`)} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 pb-8">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 px-4 py-2 rounded-md bg-[#d07339] hover:bg-[#b8622e] dark:bg-[#c36a32] dark:hover:bg-[#a85a28] text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>

          {/* Main Layout with Sidebar */}
          <div className="flex flex-col lg:grid lg:grid-cols-[320px_1fr_320px] lg:items-start gap-8">
            {/* Left Column - Poster Only */}
            <div className="shrink-0">
              {/* Poster Container */}
              <div className="bg-white dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] rounded-[10px] overflow-hidden max-w-xs mx-auto lg:max-w-none">
                <img
                  src={movie.image}
                  alt={movie.title}
                  className="w-full object-cover"
                  loading="lazy"
                />

                {/* Update Poster - directly under poster */}
                <div className="p-4 bg-[#fbf3ee] dark:bg-[#0d0905]">
                  <div className="mb-3">
                    <input
                      type="text"
                      value={newPosterUrl}
                      onChange={(e) => setNewPosterUrl(e.target.value)}
                      className="w-full px-3 py-2 text-[11px] border rounded bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
                      placeholder={movie.image}
                    />
                  </div>
                  <button
                    onClick={handleUpdatePoster}
                    className="w-full px-4 py-2.5 bg-[#d07339] hover:bg-[#b8622e] dark:bg-[#c36a32] dark:hover:bg-[#a85a28] text-white text-[13px] font-medium rounded transition-colors"
                  >
                    Update Poster
                  </button>
                </div>
              </div>
            </div>

            {/* Middle Column - Movie Details */}
            <div className="flex-1">
              {/* Movie Details Section */}
              <div className="bg-white dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] rounded-[10px] p-6 mb-8 relative">
                {/* Name */}
                <h1 className="text-2xl font-bold mb-3 text-[#100b09] dark:text-[#f7f1ed]">{movie.title}</h1>

                {/* Year, Length, Genres */}
                <div className="flex flex-wrap gap-4 mb-4 text-[13px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]">
                  {movie.year && (
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4" />
                      <span>{movie.year}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="size-4" />
                    {!isEditingRuntime ? (
                      movie.runtime ? (
                        <div className="flex items-center gap-2 group">
                          <span>{movie.runtime}</span>
                          <button
                            onClick={() => {
                              setNewRuntime(movie.runtime || '');
                              setIsEditingRuntime(true);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)] hover:text-[#d07339]"
                            title="Edit Runtime"
                          >
                            <Pencil className="size-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsEditingRuntime(true)}
                          className="text-[#d07339] dark:text-[#c36a32] hover:underline flex items-center gap-1"
                        >
                          <span>+ Add Time</span>
                        </button>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newRuntime}
                          onChange={(e) => setNewRuntime(e.target.value)}
                          placeholder="e.g. 1h 30m"
                          className="w-24 px-2 py-1 text-xs border rounded bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-1 focus:ring-[#d07339]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateRuntime();
                            if (e.key === 'Escape') setIsEditingRuntime(false);
                          }}
                        />
                        <button
                          onClick={handleUpdateRuntime}
                          className="text-green-600 dark:text-green-400 hover:opacity-70"
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingRuntime(false);
                            setNewRuntime('');
                          }}
                          className="text-red-600 dark:text-red-400 hover:opacity-70"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {movie.genre && (
                    <div className="flex items-center gap-2">
                      <Film className="size-4" />
                      <span>{movie.genre}</span>
                    </div>
                  )}
                </div>

                {/* Ratings Row: IMDb (left) + User Rating (right) - Only show in poster view */}
                {carouselView === 'poster' && (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-8 mb-4">
                      {/* IMDb Rating (Left) */}
                      <div>
                        <h3 className="text-[13px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] mb-2">IMDb Rating</h3>
                        <div className="flex items-center gap-2">
                          {(movie.imdbRating || movie.rating) && (
                            <>
                              <Star className="size-5 fill-[#f99251] text-[#f99251] dark:fill-[#a64a11] dark:text-[#a64a11]" />
                              <span className="font-bold text-[#100b09] dark:text-[#f7f1ed] text-lg">
                                {movie.imdbRating || movie.rating}
                              </span>
                              <span className="text-sm text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)]">/ 10</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* User Rating (Right) */}
                      <div>
                        <h3 className="text-[13px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] mb-2">Your Rating</h3>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRatingChange(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                className={`size-5 ${
                                  star <= (hoverRating || userRating)
                                    ? 'fill-[#f99251] text-[#f99251] dark:fill-[#a64a11] dark:text-[#a64a11]'
                                    : 'fill-none text-[rgba(16,11,9,0.2)] dark:text-[rgba(247,241,237,0.2)] stroke-2'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Community Rating */}
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="size-4 text-[#d07339] dark:text-[#c36a32]" />
                      <span className="font-semibold text-[#100b09] dark:text-[#f7f1ed] text-[15px]">
                        {movie.communityRating ? movie.communityRating.toFixed(1) : '0'}
                      </span>
                      <span className="text-[13px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]">
                        ({movie.ratingCount || 0} {movie.ratingCount === 1 ? 'rating' : 'ratings'})
                      </span>
                    </div>
                  </>
                )}

                {/* Show these details only in poster view */}
                {carouselView === 'poster' && (
                  <>
                    {/* Director */}
                    {movie.director && (
                      <div className="mb-2 flex items-center gap-2">
                        <User className="size-4 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]" />
                        <span className="font-semibold text-[#100b09] dark:text-[#f7f1ed] text-[13px]">Director: </span>
                        <span className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] text-[13px]">{movie.director}</span>
                      </div>
                    )}

                    {/* Cast */}
                    {movie.cast && (
                      <div className="mb-2 flex items-start gap-2">
                        <Users className="size-4 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] mt-0.5" />
                        <div>
                          <span className="font-semibold text-[#100b09] dark:text-[#f7f1ed] text-[13px]">Cast: </span>
                          <span className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] text-[13px]">
                            {Array.isArray(movie.cast) ? movie.cast.join(", ") : movie.cast}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Plot */}
                    {movie.plot && (
                      <div className="mb-3">
                        <h3 className="font-semibold mb-1 text-[#100b09] dark:text-[#f7f1ed] text-[13px] flex items-center gap-2">
                          <FileText className="size-4" />
                          Plot:
                        </h3>
                        <p className="text-[rgba(16,11,9,0.8)] dark:text-[rgba(247,241,237,0.8)] whitespace-pre-wrap text-[13px]">{movie.plot}</p>
                      </div>
                    )}

                    {/* View on IMDb */}
                    {movie.imdbId && (
                      <div className="mb-4">
                        <a
                          href={`https://www.imdb.com/title/${movie.imdbId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[rgba(208,115,57,0.1)] dark:bg-[rgba(126,62,21,0.2)] border-2 border-[#d07339] dark:border-[#c36a32] rounded-full text-[#d07339] dark:text-[#f99251] hover:bg-[rgba(208,115,57,0.2)] dark:hover:bg-[rgba(126,62,21,0.3)] transition-colors text-[13px] font-medium"
                        >
                          <ExternalLink className="size-4" />
                          View on IMDb
                        </a>
                      </div>
                    )}

                    {/* Mark as Watched Section - Only show if this is from "to watch" list */}
                    {isFromToWatch && (
                      <div className="mb-4">
                        <h2 className="font-semibold mb-3 text-[#100b09] dark:text-[#f7f1ed] text-[13px]" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                          Mark as Watched
                        </h2>
                        <button
                          onClick={handleMarkAsWatched}
                          className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="size-5" />
                          Mark as Watched
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Show trailer in trailer view */}
                {carouselView === 'trailer' && (
                  <div className="mb-4">
                    <h3 className="font-semibold mb-3 text-[#100b09] dark:text-[#f7f1ed] text-lg">Trailer</h3>

                    {/* Show trailer player or message */}
                    {movie.trailer && getYouTubeEmbedUrl(movie.trailer) ? (
                      <div className="mb-4">
                        {!isTrailerPlaying ? (
                          <div
                            className="aspect-video rounded-lg overflow-hidden bg-black relative cursor-pointer group"
                            onClick={() => setIsTrailerPlaying(true)}
                          >
                            <img
                              src={getYouTubeThumbnail(movie.trailer) || ''}
                              alt="Trailer thumbnail"
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                              <div className="bg-red-600 hover:bg-red-700 rounded-full p-4 transition-colors">
                                <Play className="size-12 text-white fill-white" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-video rounded-lg overflow-hidden bg-black">
                            <iframe
                              src={getYouTubeEmbedUrl(movie.trailer) || ''}
                              className="w-full h-full"
                              allowFullScreen
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              title="Movie Trailer"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-4 p-8 bg-[rgba(238,167,122,0.1)] dark:bg-[rgba(126,62,21,0.15)] rounded-lg text-center">
                        <p className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] text-[13px]">
                          No trailer available
                        </p>
                      </div>
                    )}

                    <div className="mb-3">
                      <h2 className="font-semibold mb-3 text-[#100b09] dark:text-[#f7f1ed] text-[13px]">Update Trailer URL</h2>
                      <input
                        type="text"
                        value={newTrailerUrl}
                        onChange={(e) => setNewTrailerUrl(e.target.value)}
                        className="w-full px-3 py-2 text-[13px] border rounded bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
                        placeholder="YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
                      />
                    </div>
                    <button
                      onClick={handleUpdateTrailer}
                      className="w-full px-4 py-2.5 bg-[#d07339] hover:bg-[#b8622e] dark:bg-[#c36a32] dark:hover:bg-[#a85a28] text-white text-[13px] font-medium rounded-lg transition-colors"
                    >
                      Update Trailer
                    </button>
                  </div>
                )}

                {/* Tags */}
                {movie.tags && movie.tags.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2 text-[#100b09] dark:text-[#f7f1ed] text-[13px]">Tags:</h3>
                    <div className="flex flex-wrap gap-2">
                      {movie.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-[#eea77a] dark:bg-[#7e3e15] text-[#100b09] dark:text-[#f7f1ed] rounded-full text-[11px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete Movie Button */}
                <div className="mb-4">
                  <h2 className="font-semibold mb-3 text-[#100b09] dark:text-[#f7f1ed] text-[13px]">Delete Movie</h2>
                  <button
                    onClick={handleDeleteMovie}
                    className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white text-[13px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </button>
                </div>

                {/* Right Arrow to go to Trailer - Only show in poster view */}
                {carouselView === 'poster' && (
                  <button
                    onClick={() => setCarouselView('trailer')}
                    className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
                    title="View Trailer"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                )}

                {/* Left Arrow to go back to Description - Only show in trailer view */}
                {carouselView === 'trailer' && (
                  <button
                    onClick={() => {
                      setCarouselView('poster');
                      setIsTrailerPlaying(false);
                    }}
                    className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
                    title="Back to Description"
                  >
                    <ChevronLeft className="size-6" />
                  </button>
                )}
              </div>

              {/* Comments Section */}
              <div className="mt-8 bg-white dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] rounded-[10px] p-6 mb-8">
                <h2 className="text-lg font-bold mb-4 text-[#100b09] dark:text-[#f7f1ed]">Comments</h2>

                {/* Add Comment Form */}
                <div className="mb-6 space-y-3">
                  {!currentUser && (
                    <input
                      type="text"
                      placeholder="Your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
                    />
                  )}
                  {currentUser && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[rgba(238,167,122,0.15)] dark:bg-[rgba(126,62,21,0.15)]">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${isDarkMode ? 'bg-[rgba(126,62,21,0.3)]' : 'bg-[rgba(208,115,57,0.2)]'}`}>
                        {currentUser.profilePicture ? (
                          <img src={currentUser.profilePicture} alt={currentUser.username} className="w-full h-full object-cover" />
                        ) : (
                          <User className="size-4 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]" />
                        )}
                      </div>
                      <span className="text-[13px] font-medium text-[#100b09] dark:text-[#f7f1ed]">
                        Commenting as {currentUser.username}
                      </span>
                    </div>
                  )}
                  <textarea
                    placeholder="Write your comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339] resize-none"
                  />
                  {showCommentImageInput && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Paste image URL..."
                        value={commentImageUrl}
                        onChange={(e) => setCommentImageUrl(e.target.value)}
                        className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
                      />
                      {commentImageUrl && (
                        <img src={commentImageUrl} alt="preview" className="max-h-40 rounded-lg object-contain border border-[rgba(208,115,57,0.2)]" onError={(e) => e.currentTarget.style.display = 'none'} />
                      )}
                    </div>
                  )}
                  {commentImageUrl && !showCommentImageInput && (
                    <div className="relative inline-block">
                      <img src={commentImageUrl} alt="GIF preview" className="max-h-32 rounded-lg object-contain border border-[rgba(208,115,57,0.2)]" onError={(e) => e.currentTarget.style.display = 'none'} />
                      <button onClick={() => setCommentImageUrl('')} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80 transition-colors">
                        <X className="size-3 text-white" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCommentGifPicker(true)}
                      className="px-3 py-2 text-[13px] rounded-lg border transition-colors flex items-center gap-1.5 border-[#eea77a] dark:border-[#7e3e15] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] hover:bg-[rgba(238,167,122,0.1)]"
                    >
                      GIF
                    </button>
                    <button
                      onClick={() => { setShowCommentImageInput(!showCommentImageInput); if (showCommentImageInput) setCommentImageUrl(''); }}
                      className={`px-3 py-2 text-[13px] rounded-lg border transition-colors flex items-center gap-1.5 ${showCommentImageInput ? 'bg-[rgba(208,115,57,0.15)] border-[#d07339] text-[#d07339]' : 'border-[#eea77a] dark:border-[#7e3e15] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] hover:bg-[rgba(238,167,122,0.1)]'}`}
                    >
                      <ImageIcon className="size-3.5" />
                      Image
                    </button>
                    <button
                      onClick={handleAddComment}
                      className="flex-1 px-4 py-2.5 bg-[#d07339] hover:bg-[#b8622e] dark:bg-[#c36a32] dark:hover:bg-[#a85a28] text-white text-[13px] font-medium rounded-lg transition-colors"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  {comments.filter(c => !c.parentId).length === 0 ? (
                    <p className="text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)] text-center py-8 text-[13px]">
                      No comments yet. Be the first to comment!
                    </p>
                  ) : (
                    comments
                      .filter(c => !c.parentId)
                      .sort((a, b) => a.timestamp - b.timestamp)
                      .map((comment) => {
                        const commentReactions = reactions[String(comment.id)] || {};
                        const userId = currentUser ? currentUser.username : getAnonymousUserId();
                        // Direct replies to this top-level comment only
                        const directReplies = comments
                          .filter(c => c.parentId === comment.id)
                          .sort((a, b) => a.timestamp - b.timestamp);

                        // Reusable inline reply form — receives the exact parentId to post under
                        const makeReplyForm = (targetParentId: number) => (
                          <div className="mt-2 space-y-2">
                            {!currentUser && (
                              <input
                                type="text"
                                placeholder="Your username"
                                value={replyUsername}
                                onChange={(e) => setReplyUsername(e.target.value)}
                                className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
                              />
                            )}
                            <textarea
                              placeholder={`Reply to ${replyingToUsername}...`}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows={2}
                              autoFocus
                              className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339] resize-none"
                            />
                            {showReplyImageInput && (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  placeholder="Paste image URL..."
                                  value={replyImageUrl}
                                  onChange={(e) => setReplyImageUrl(e.target.value)}
                                  className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
                                />
                                {replyImageUrl && (
                                  <img src={replyImageUrl} alt="preview" className="max-h-32 rounded-lg object-contain border border-[rgba(208,115,57,0.2)]" onError={(e) => e.currentTarget.style.display = 'none'} />
                                )}
                              </div>
                            )}
                            {replyImageUrl && !showReplyImageInput && (
                              <div className="relative inline-block">
                                <img src={replyImageUrl} alt="GIF preview" className="max-h-24 rounded-lg object-contain border border-[rgba(208,115,57,0.2)]" onError={(e) => e.currentTarget.style.display = 'none'} />
                                <button onClick={() => setReplyImageUrl('')} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 hover:bg-black/80 transition-colors">
                                  <X className="size-3 text-white" />
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button onClick={() => setShowReplyGifPicker(true)} className="px-2.5 py-1.5 text-[12px] rounded-lg border transition-colors border-[#eea77a] dark:border-[#7e3e15] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] hover:bg-[rgba(238,167,122,0.1)]">GIF</button>
                              <button onClick={() => { setShowReplyImageInput(!showReplyImageInput); if (showReplyImageInput) setReplyImageUrl(''); }} className={`px-2.5 py-1.5 text-[12px] rounded-lg border transition-colors flex items-center gap-1 ${showReplyImageInput ? 'bg-[rgba(208,115,57,0.15)] border-[#d07339] text-[#d07339]' : 'border-[#eea77a] dark:border-[#7e3e15] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] hover:bg-[rgba(238,167,122,0.1)]'}`}><ImageIcon className="size-3" />Image</button>
                              <button onClick={() => { setReplyingToId(null); setReplyingToReplyId(null); setReplyingToUsername(''); setReplyText(''); setReplyImageUrl(''); setShowReplyImageInput(false); }} className="px-3 py-1.5 text-[12px] rounded-lg border border-[#eea77a] dark:border-[#7e3e15] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] hover:bg-[rgba(238,167,122,0.1)] transition-colors">Cancel</button>
                              <button onClick={() => handleAddReply(targetParentId)} className="flex-1 px-3 py-1.5 text-[12px] font-medium rounded-lg bg-[#d07339] hover:bg-[#b8622e] dark:bg-[#c36a32] dark:hover:bg-[#a85a28] text-white transition-colors">Post Reply</button>
                            </div>
                          </div>
                        );

                        return (
                          <div key={comment.id}>
                            {/* ── Top-level comment ── */}
                            <div className="border border-[rgba(208,115,57,0.15)] dark:border-[rgba(126,62,21,0.25)] rounded-lg p-4 hover:bg-[rgba(238,167,122,0.05)] dark:hover:bg-[rgba(126,62,21,0.07)] transition-colors">
                              <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${isDarkMode ? 'bg-[rgba(126,62,21,0.3)]' : 'bg-[rgba(208,115,57,0.15)]'}`}>
                                  {comment.profilePicture ? (
                                    <img src={comment.profilePicture} alt={comment.username} className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="size-4 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                    <div>
                                      <span className="font-semibold text-[#100b09] dark:text-[#f7f1ed] text-[13px]">{comment.username}</span>
                                      <span className="text-[11px] text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)] ml-2">{new Date(comment.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <button onClick={() => handleDeleteComment(comment.id, comment.username)} className="text-red-500/50 hover:text-red-600 dark:text-red-500/40 dark:hover:text-red-400 transition-colors"><Trash2 className="size-3.5" /></button>
                                  </div>
                                  {comment.text && <p className="text-[rgba(16,11,9,0.8)] dark:text-[rgba(247,241,237,0.8)] text-[13px] leading-relaxed mb-2">{comment.text}</p>}
                                  {comment.imageUrl && <img src={comment.imageUrl} alt="comment media" className="mb-2 max-h-48 rounded-lg object-contain border border-[rgba(208,115,57,0.2)]" onError={(e) => e.currentTarget.style.display = 'none'} />}
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {EMOJIS.map(emoji => {
                                        const users = commentReactions[emoji] || [];
                                        const hasReacted = users.includes(userId);
                                        return (
                                          <button key={emoji} onClick={() => handleReact(comment.id, emoji)} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[13px] transition-all ${hasReacted ? 'bg-[rgba(208,115,57,0.2)] border border-[rgba(208,115,57,0.5)]' : 'border border-transparent hover:bg-[rgba(238,167,122,0.12)] dark:hover:bg-[rgba(126,62,21,0.15)]'}`}>
                                            <span>{emoji}</span>
                                            {users.length > 0 && <span className="text-[10px] font-medium text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] ml-0.5">{users.length}</span>}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <button
                                      onClick={() => { setReplyingToId(comment.id); setReplyingToReplyId(null); setReplyingToUsername(comment.username); setReplyText(''); setReplyImageUrl(''); setShowReplyImageInput(false); }}
                                      className="text-[rgba(16,11,9,0.45)] dark:text-[rgba(247,241,237,0.45)] hover:text-[#d07339] dark:hover:text-[#c36a32] transition-colors flex items-center gap-1 text-[11px] ml-2 shrink-0"
                                    >
                                      <Reply className="size-3" />Reply
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Reply form directly under the top-level comment */}
                            {replyingToId === comment.id && replyingToReplyId === null && (
                              <div className="ml-8 mt-1 pl-4 border-l-2 border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)]">
                                {makeReplyForm(comment.id)}
                              </div>
                            )}

                            {/* ── Level-1 replies: direct replies to the top-level comment ── */}
                            {directReplies.length > 0 && (
                              <div className="ml-8 mt-1 space-y-1 border-l-2 border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] pl-4">
                                {directReplies.map((reply) => {
                                  const replyReactions = reactions[String(reply.id)] || {};
                                  // Level-2: replies specifically to this reply
                                  const subReplies = comments
                                    .filter(c => c.parentId === reply.id)
                                    .sort((a, b) => a.timestamp - b.timestamp);

                                  return (
                                    <div key={reply.id}>
                                      {/* Level-1 reply bubble */}
                                      <div className="border border-[rgba(208,115,57,0.1)] dark:border-[rgba(126,62,21,0.15)] rounded-lg p-3 bg-[rgba(238,167,122,0.04)] dark:bg-[rgba(126,62,21,0.05)]">
                                        <div className="flex items-start gap-2.5">
                                          <div className={`w-7 h-7 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${isDarkMode ? 'bg-[rgba(126,62,21,0.3)]' : 'bg-[rgba(208,115,57,0.15)]'}`}>
                                            {reply.profilePicture ? <img src={reply.profilePicture} alt={reply.username} className="w-full h-full object-cover" /> : <User className="size-3.5 text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]" />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                              <div>
                                                <span className="font-semibold text-[#100b09] dark:text-[#f7f1ed] text-[12px]">{reply.username}</span>
                                                <span className="text-[10px] text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)] ml-2">{new Date(reply.timestamp).toLocaleDateString()}</span>
                                              </div>
                                              <button onClick={() => handleDeleteComment(reply.id, reply.username)} className="text-red-500/50 hover:text-red-600 dark:text-red-500/40 dark:hover:text-red-400 transition-colors"><Trash2 className="size-3" /></button>
                                            </div>
                                            {reply.text && <p className="text-[rgba(16,11,9,0.8)] dark:text-[rgba(247,241,237,0.8)] text-[12px] leading-relaxed">{reply.text}</p>}
                                            {reply.imageUrl && <img src={reply.imageUrl} alt="reply media" className="mt-2 max-h-48 rounded-lg object-contain border border-[rgba(208,115,57,0.2)]" onError={(e) => e.currentTarget.style.display = 'none'} />}
                                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-[rgba(208,115,57,0.08)] dark:border-[rgba(126,62,21,0.12)]">
                                              <div className="flex items-center gap-1 flex-wrap">
                                                {EMOJIS.map(emoji => {
                                                  const users = replyReactions[emoji] || [];
                                                  const hasReacted = users.includes(userId);
                                                  return (
                                                    <button key={emoji} onClick={() => handleReact(reply.id, emoji)} className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[12px] transition-all ${hasReacted ? 'bg-[rgba(208,115,57,0.2)] border border-[rgba(208,115,57,0.5)]' : 'border border-transparent hover:bg-[rgba(238,167,122,0.12)] dark:hover:bg-[rgba(126,62,21,0.15)]'}`}>
                                                      <span>{emoji}</span>
                                                      {users.length > 0 && <span className="text-[10px] font-medium text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] ml-0.5">{users.length}</span>}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                              <button
                                                onClick={() => { setReplyingToId(comment.id); setReplyingToReplyId(reply.id); setReplyingToUsername(reply.username); setReplyText(''); setReplyImageUrl(''); setShowReplyImageInput(false); }}
                                                className="text-[rgba(16,11,9,0.4)] dark:text-[rgba(247,241,237,0.4)] hover:text-[#d07339] dark:hover:text-[#c36a32] transition-colors flex items-center gap-0.5 text-[10px] ml-2 shrink-0"
                                              >
                                                <Reply className="size-3" />Reply
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* ── Level-2 sub-thread: one per each reply being replied to ── */}
                                      {(subReplies.length > 0 || (replyingToId === comment.id && replyingToReplyId === reply.id)) && (
                                        <div className="ml-7 mt-1 space-y-1 border-l-2 border-[rgba(208,115,57,0.12)] dark:border-[rgba(126,62,21,0.2)] pl-3">
                                          {subReplies.map((subReply) => {
                                            const subReplyReactions = reactions[String(subReply.id)] || {};
                                            return (
                                              <div key={subReply.id} className="border border-[rgba(208,115,57,0.08)] dark:border-[rgba(126,62,21,0.12)] rounded-lg p-2.5 bg-[rgba(238,167,122,0.03)] dark:bg-[rgba(126,62,21,0.04)]">
                                                <div className="flex items-start gap-2">
                                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${isDarkMode ? 'bg-[rgba(126,62,21,0.25)]' : 'bg-[rgba(208,115,57,0.12)]'}`}>
                                                    {subReply.profilePicture ? <img src={subReply.profilePicture} alt={subReply.username} className="w-full h-full object-cover" /> : <User className="size-3 text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)]" />}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                      <div className="flex items-baseline gap-1 flex-wrap">
                                                        <span className="font-semibold text-[#100b09] dark:text-[#f7f1ed] text-[11px]">{subReply.username}</span>
                                                        <span className="text-[rgba(208,115,57,0.9)] dark:text-[rgba(195,106,50,0.9)] text-[10px]">@{reply.username}</span>
                                                        <span className="text-[10px] text-[rgba(16,11,9,0.4)] dark:text-[rgba(247,241,237,0.4)]">{new Date(subReply.timestamp).toLocaleDateString()}</span>
                                                      </div>
                                                      <button onClick={() => handleDeleteComment(subReply.id, subReply.username)} className="text-red-500/50 hover:text-red-600 dark:text-red-500/40 dark:hover:text-red-400 transition-colors ml-1 shrink-0"><Trash2 className="size-2.5" /></button>
                                                    </div>
                                                    {subReply.text && <p className="text-[rgba(16,11,9,0.75)] dark:text-[rgba(247,241,237,0.75)] text-[11px] leading-relaxed">{subReply.text}</p>}
                                                    {subReply.imageUrl && <img src={subReply.imageUrl} alt="sub-reply media" className="mt-1.5 max-h-36 rounded-lg object-contain border border-[rgba(208,115,57,0.15)]" onError={(e) => e.currentTarget.style.display = 'none'} />}
                                                    <div className="flex items-center justify-between gap-0.5 mt-1.5">
                                                      {EMOJIS.map(emoji => {
                                                        const users = subReplyReactions[emoji] || [];
                                                        const hasReacted = users.includes(userId);
                                                        return (
                                                          <button key={emoji} onClick={() => handleReact(subReply.id, emoji)} className={`flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[11px] transition-all ${hasReacted ? 'bg-[rgba(208,115,57,0.2)] border border-[rgba(208,115,57,0.5)]' : 'border border-transparent hover:bg-[rgba(238,167,122,0.12)] dark:hover:bg-[rgba(126,62,21,0.15)]'}`}>
                                                            <span>{emoji}</span>
                                                            {users.length > 0 && <span className="text-[9px] font-medium text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] ml-0.5">{users.length}</span>}
                                                          </button>
                                                        );
                                                      })}
                                                      <button
  onClick={() => { setReplyingToId(comment.id); setReplyingToReplyId(subReply.id); setReplyingToUsername(subReply.username); setReplyText(''); setReplyImageUrl(''); setShowReplyImageInput(false); }}
  className="text-[rgba(16,11,9,0.3)] dark:text-[rgba(247,241,237,0.3)] hover:text-[#d07339] dark:hover:text-[#c36a32] transition-colors flex items-center gap-1 text-[10px] ml-auto hover:opacity-70"
>
  <Reply className="size-2.5" />Reply
</button>
</div>
                                                   </div>

                                                </div>
                                              </div>
                                            );
                                          })}
                                          {/* Reply form inline under this specific level-1 reply */}
                                          {replyingToId === comment.id && replyingToReplyId === reply.id && (
                                            <div className="pt-1">
                                              {makeReplyForm(reply.id)}
                                            </div>
                                          )}
                                          {/* Reply form inline under this specific level-2 reply */}
{replyingToId === comment.id && replyingToReplyId === subReply.id && (
  <div className="ml-7 mt-1 pl-3 border-l-2 border-[rgba(208,115,57,0.12)] dark:border-[rgba(126,62,21,0.2)]">
    {makeReplyForm(subReply.id)}
  </div>
)}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Tags + Recommended (plain static column) */}
            <div className="space-y-6">
              {/* Tags Section */}
              <div className="bg-white dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] rounded-[10px] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="size-5 text-[#100b09] dark:text-[#f7f1ed]" />
                  <h2 className="text-lg font-bold text-[#100b09] dark:text-[#f7f1ed]">Tags</h2>
                </div>

                {movie.tags && movie.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {movie.tags.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#eea77a] dark:bg-[#7e3e15] text-[#100b09] dark:text-[#f7f1ed] rounded-full text-[11px]"
                      >
                        <span>{tag}</span>
                        <button onClick={() => handleRemoveTag(tag)} className="hover:opacity-70 transition-opacity">
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)] italic text-sm mb-4">
                    No tags yet
                  </p>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 text-sm rounded-lg border bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-5 py-2 text-sm font-medium rounded-lg transition-colors bg-[#d07339] hover:bg-[#b8622e] dark:bg-[#c36a32] dark:hover:bg-[#a85a28] text-white"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Recommended Section */}
              <div className="bg-white dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] rounded-[10px] p-6">
                <h2 className="text-lg font-bold mb-4 text-[#100b09] dark:text-[#f7f1ed]">Recommended</h2>

                {similarMovies.length === 0 ? (
                  <p className="text-[rgba(16,11,9,0.5)] dark:text-[rgba(247,241,237,0.5)] text-center py-8 text-[13px]">
                    No recommendations found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {similarMovies.map((similarMovie) => (
                      <div
                        key={similarMovie.id}
                        onClick={() => navigate(`/movie/${createSlug(similarMovie.title, similarMovie.year)}`)}
                        className="cursor-pointer group"
                      >
                        <div className="flex gap-3">
                          <img
                            src={similarMovie.image}
                            alt={similarMovie.title}
                            className="w-20 h-28 object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[13px] text-[#100b09] dark:text-[#f7f1ed] group-hover:text-[#d07339] dark:group-hover:text-[#f99251] transition-colors line-clamp-2">
                              {similarMovie.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              {(similarMovie.imdbRating || similarMovie.rating) && (
                                <div className="flex items-center gap-1">
                                  <Star className="size-3 fill-[#f99251] text-[#f99251] dark:fill-[#a64a11] dark:text-[#a64a11]" />
                                  <span className="text-[11px] font-medium text-[#100b09] dark:text-[#f7f1ed]">
                                    {similarMovie.imdbRating || similarMovie.rating}
                                  </span>
                                </div>
                              )}
                              {similarMovie.userRating && similarMovie.userRating > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="size-3 fill-blue-500 text-blue-500 dark:fill-blue-400 dark:text-blue-400" />
                                  <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
                                    {similarMovie.userRating}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)]">
                              {similarMovie.runtime && (
                                <>
                                  <span>{similarMovie.runtime}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>{similarMovie.year}</span>
                            </div>
                            {similarMovie.genre && (
                              <p className="text-[11px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] mt-0.5 line-clamp-1">
                                {similarMovie.genre}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="border-t bg-[#fbf3ee] dark:bg-[#120d09]"
        style={{ borderTopColor: isDarkMode ? 'rgba(126,62,21,0.4)' : 'rgba(208,115,57,0.25)', borderTopWidth: '1px' }}
      >
        <div className="flex items-center justify-between px-6" style={{ height: '64px' }}>
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Trash Bin Logo" className="size-6" />
            <h1 className="text-sm font-bold tracking-tight text-[#100b09] dark:text-[#f7f1ed]">
              Trash Bin
            </h1>
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

      {/* GIF Pickers */}
      {showCommentGifPicker && (
        <GifPicker
          isDarkMode={isDarkMode}
          onSelect={(url) => { setCommentImageUrl(url); setShowCommentImageInput(false); }}
          onClose={() => setShowCommentGifPicker(false)}
        />
      )}
      {showReplyGifPicker && (
        <GifPicker
          isDarkMode={isDarkMode}
          onSelect={(url) => { setReplyImageUrl(url); setShowReplyImageInput(false); }}
          onClose={() => setShowReplyGifPicker(false)}
        />
      )}

      {/* Delete Comment Password Prompt */}
      {showDeletePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#fdfaf8] dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] rounded-[10px] p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-[#100b09] dark:text-[#f7f1ed]">Delete Comment</h2>
            <p className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] mb-4">
              Enter the password to delete this comment:
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
            />
            {deletePasswordError && (
              <p className="text-red-500 text-[13px] mt-2">{deletePasswordError}</p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDeletePrompt(false)}
                className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] hover:opacity-70 transition-opacity mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePasswordSubmit}
                className="px-4 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Poster Password Prompt */}
      {showPosterPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#fdfaf8] dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] rounded-[10px] p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-[#100b09] dark:text-[#f7f1ed]">Update Poster</h2>
            <p className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] mb-4">
              Enter the password to update the poster:
            </p>
            <input
              type="password"
              value={posterPassword}
              onChange={(e) => setPosterPassword(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
            />
            {posterPasswordError && (
              <p className="text-red-500 text-[13px] mt-2">{posterPasswordError}</p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowPosterPrompt(false)}
                className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] hover:opacity-70 transition-opacity mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handlePosterPasswordSubmit}
                className="px-4 py-2 bg-[#d07339] hover:bg-[#b8622e] dark:bg-[#c36a32] dark:hover:bg-[#a85a28] text-white text-[13px] font-medium rounded-lg transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Trailer Password Prompt */}
      {showTrailerPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#fdfaf8] dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] rounded-[10px] p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-[#100b09] dark:text-[#f7f1ed]">Update Trailer</h2>
            <p className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] mb-4">
              Enter the password to update the trailer:
            </p>
            <input
              type="password"
              value={trailerPassword}
              onChange={(e) => setTrailerPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleTrailerPasswordSubmit()}
              className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
            />
            {trailerPasswordError && (
              <p className="text-red-500 text-[13px] mt-2">{trailerPasswordError}</p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowTrailerPrompt(false)}
                className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] hover:opacity-70 transition-opacity mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleTrailerPasswordSubmit}
                className="px-4 py-2 bg-[#d07339] hover:bg-[#b8622e] dark:bg-[#c36a32] dark:hover:bg-[#a85a28] text-white text-[13px] font-medium rounded-lg transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Runtime Password Prompt */}
      {showRuntimePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#fdfaf8] dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] rounded-[10px] p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-[#100b09] dark:text-[#f7f1ed]">Update Runtime</h2>
            <p className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] mb-4">
              Enter the password to update the runtime:
            </p>
            <input
              type="password"
              value={runtimePassword}
              onChange={(e) => setRuntimePassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRuntimePasswordSubmit()}
              className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
            />
            {runtimePasswordError && (
              <p className="text-red-500 text-[13px] mt-2">{runtimePasswordError}</p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowRuntimePrompt(false)}
                className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] hover:opacity-70 transition-opacity mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleRuntimePasswordSubmit}
                className="px-4 py-2 bg-[#d07339] hover:bg-[#b8622e] dark:bg-[#c36a32] dark:hover:bg-[#a85a28] text-white text-[13px] font-medium rounded-lg transition-colors"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Movie Password Prompt */}
      {showDeleteMoviePrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#fdfaf8] dark:bg-[#18110c] border border-[rgba(208,115,57,0.2)] dark:border-[rgba(126,62,21,0.3)] rounded-[10px] p-6 shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-[#100b09] dark:text-[#f7f1ed]">Delete Movie</h2>
            <p className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] mb-4">
              Enter the password to delete this movie:
            </p>
            <input
              type="password"
              value={deleteMoviePassword}
              onChange={(e) => setDeleteMoviePassword(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border rounded-lg bg-[#fdfaf8] dark:bg-[#18110c] border-[#eea77a] dark:border-[#7e3e15] text-[#100b09] dark:text-[rgba(247,241,237,0.7)] focus:outline-none focus:ring-2 focus:ring-[#d07339]"
            />
            {deleteMoviePasswordError && (
              <p className="text-red-500 text-[13px] mt-2">{deleteMoviePasswordError}</p>
            )}
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDeleteMoviePrompt(false)}
                className="text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] hover:opacity-70 transition-opacity mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMoviePasswordSubmit}
                className="px-4 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
