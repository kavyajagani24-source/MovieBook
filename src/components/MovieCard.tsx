import { Movie } from '@/types';
import { Card } from '@/components/ui/card';
import { BACKEND_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Film, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface MovieCardProps {
  movie: Movie;
}

const MovieCard = ({ movie }: MovieCardProps) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const imgSrc = movie.poster_url
    ? (movie.poster_url.startsWith('http') ? movie.poster_url : `${BACKEND_BASE}${movie.poster_url}`)
    : undefined;

  return (
    <Card className="group overflow-hidden border border-gray-200 bg-card hover:shadow-lg transition-all duration-300 cursor-pointer rounded-lg">
      <div className="relative aspect-[2/3] overflow-hidden rounded-t-lg" onClick={() => navigate(`/movie/${movie.m_id}`)}>
        {imgSrc && !imageError ? (
          <img
            src={imgSrc}
            alt={movie.m_name}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary/10 to-accent/10">
            <Film className="h-16 w-16 text-muted-foreground/60" />
            <span className="text-center px-4 text-sm font-medium text-muted-foreground">
              {movie.m_name}
            </span>
          </div>
        )}

        {/* Rating badge */}
        {movie.rating && (
          <div className="absolute left-3 bottom-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-2 text-sm shadow">
            <Star className="h-4 w-4 text-gold" />
            <span className="font-semibold text-sm">{movie.rating}</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-md line-clamp-1">{movie.m_name}</h3>

        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {movie.genre && (
              <span className="px-2 py-0.5 rounded bg-muted text-xs">{movie.genre}</span>
            )}
          </div>
          {movie.release_date && (
            <div className="text-xs">{new Date(movie.release_date).getFullYear()}</div>
          )}
        </div>

        <Button 
          className="mt-3 w-full bg-primary"
          onClick={() => navigate(`/movie/${movie.m_id}`)}
        >
          Book Now
        </Button>
      </div>
    </Card>
  );
};

export default MovieCard;
