import { Movie } from '@/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MovieCardProps {
  movie: Movie;
}

const MovieCard = ({ movie }: MovieCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="group overflow-hidden border-border bg-card hover:border-primary/50 transition-all duration-300 cursor-pointer">
      <div className="relative aspect-[2/3] overflow-hidden bg-muted" onClick={() => navigate(`/movie/${movie.m_id}`)}>
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.m_name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Calendar className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-lg line-clamp-1">{movie.m_name}</h3>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {movie.genre && (
            <span className="px-2 py-1 rounded bg-muted text-xs">{movie.genre}</span>
          )}
          {movie.rating && (
            <span className="text-gold font-medium">★ {movie.rating}</span>
          )}
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(movie.release_date).toLocaleDateString()}</span>
          </div>
          {movie.director && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="line-clamp-1">{movie.director}</span>
            </div>
          )}
        </div>

        <Button 
          className="w-full bg-primary hover:bg-accent"
          onClick={() => navigate(`/movie/${movie.m_id}`)}
        >
          Book Now
        </Button>
      </div>
    </Card>
  );
};

export default MovieCard;
