import { Star, Trash2 } from "lucide-react";
import { Card } from "./ui/card";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { createSlug } from "../utils/slugify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export interface Movie {
  id: number;
  title: string;
  year: number;
  genre: string;
  rating: number;
  image: string;
  description: string;
  // Enhanced details
  imdbRating?: number;
  director?: string;
  cast?: string[];
  runtime?: string;
  plot?: string;
  imdbId?: string;
  trailer?: string;
  // User features
  userRating?: number;
  tags?: string[];
  // Community rating
  communityRating?: number;
  ratingCount?: number;
  // Timestamp for recently added tracking
  dateAdded?: number;
}

interface MovieCardProps {
  movie: Movie;
  onClick?: () => void;
  onDelete?: (id: number) => void;
}

export function MovieCard({ movie, onClick, onDelete }: MovieCardProps) {
  const navigate = useNavigate();
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleCardClick = () => {
    navigate(`/movie/${createSlug(movie.title, movie.year)}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when deleting
    setShowPasswordPrompt(true);
    setPassword("");
    setPasswordError("");
  };

  const handlePasswordSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (password === "hassle") {
      setShowPasswordPrompt(false);
      setPassword("");
      setPasswordError("");
      if (onDelete && confirm(`Are you sure you want to delete "${movie.title}"?`)) {
        onDelete(movie.id);
      }
    } else {
      setPasswordError("Incorrect password");
    }
  };

  const handleCancelPassword = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPasswordPrompt(false);
    setPassword("");
    setPasswordError("");
  };

  return (
    <div
      className="flex flex-col rounded-[10px] overflow-hidden transition-all duration-300 cursor-pointer relative group border border-transparent hover:border-[#f99251] md:border-transparent md:hover:border-[#f99251] dark:hover:border-[#a64a11] bg-white dark:bg-[#18110c] hover:scale-[1.02]"
      style={{
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.3s, transform 0.3s, border 0.3s'
      }}
      onMouseEnter={(e) => {
        const isDark = document.documentElement.classList.contains('dark');
        e.currentTarget.style.boxShadow = isDark ? '0 10px 30px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        const isDark = document.documentElement.classList.contains('dark');
        e.currentTarget.style.boxShadow = isDark ? '0 2px 10px rgba(0,0,0,0.06)' : '0 4px 14px rgba(0,0,0,0.08)';
      }}
      onClick={handleCardClick}
    >
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Delete movie"
      >
        <Trash2 className="size-4" />
      </button>
      
      {/* Poster - showing top 80% of the image, cropped at bottom */}
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-black">
        <img
          src={movie.image}
          alt={movie.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      
      {/* Text content below the poster */}
      <div className="p-1.5 md:p-3 flex flex-col gap-1 md:gap-1.5">
        {/* 1. Name */}
        <h3 className="font-medium text-[11px] leading-tight line-clamp-1 text-[#100b09] dark:text-[#f7f1ed]">{movie.title}</h3>

        {/* 2. Rating */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 leading-none">
            <span className="text-[11px] text-[rgba(16,11,9,0.8)] dark:text-[rgba(247,241,237,0.8)] leading-none">{movie.rating.toFixed(1)}</span>
            <Star className="size-3 fill-[#f99251] text-[#f99251] dark:fill-[#a64a11] dark:text-[#a64a11] flex-shrink-0" />
          </div>
          {movie.userRating && movie.userRating > 0 && (
            <div className="flex items-center gap-1 leading-none">
              <span className="text-[11px] text-blue-600 dark:text-blue-400 leading-none">{movie.userRating}</span>
              <Star className="size-3 fill-blue-600 text-blue-600 dark:fill-blue-400 dark:text-blue-400 flex-shrink-0" />
            </div>
          )}
        </div>

        {/* 3. Length and Year */}
        <div className="flex items-center gap-1.5 text-[11px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] leading-normal">
          {movie.runtime && (
            <>
              <span>{movie.runtime}</span>
              <span>•</span>
            </>
          )}
          <span>{movie.year}</span>
        </div>

        {/* 4. Genre */}
        <div className="text-[11px] text-[rgba(16,11,9,0.6)] dark:text-[rgba(247,241,237,0.6)] leading-normal line-clamp-1">
          {movie.genre}
        </div>
      </div>
      
      {showPasswordPrompt && (
        <Dialog open={showPasswordPrompt} onOpenChange={setShowPasswordPrompt}>
          <DialogContent className="p-4 md:p-6">
            <DialogHeader>
              <DialogTitle>Enter Password</DialogTitle>
              <DialogDescription>
                Please enter the password to delete the movie.
              </DialogDescription>
            </DialogHeader>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="mb-4"
            />
            {passwordError && <p className="text-red-500 mb-4">{passwordError}</p>}
            <div className="flex justify-end">
              <Button
                onClick={handlePasswordSubmit}
                className="mr-2"
              >
                Delete
              </Button>
              <Button
                onClick={handleCancelPassword}
                className="bg-gray-500 hover:bg-gray-600"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}