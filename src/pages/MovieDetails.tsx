import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Movie, Show, Theatre } from '@/types';
import { movieAPI, showsAPI, BACKEND_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/Navbar';
import { Calendar, Clock, Film, MapPin, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const MovieDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchMovieDetails();
      fetchShows();
    }
  }, [id]);

  const fetchMovieDetails = async () => {
    try {
      const response = await movieAPI.getById(Number(id));
      setMovie(response.data);
    } catch (error) {
      toast.error('Failed to fetch movie details');
      // Mock data for demo
      setMovie({
        m_id: Number(id),
        m_name: 'The Dark Cinema',
        release_date: '2024-01-15',
        director: 'Christopher Nolan',
        actors: 'Christian Bale, Heath Ledger, Aaron Eckhart',
        genre: 'Action',
        rating: '9.0',
        description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShows = async () => {
    try {
      const response = await showsAPI.getByMovie(Number(id));
      setShows(response.data);
    } catch (error) {
      // Mock shows for demo
      setShows([
        {
          show_id: 1,
          st_time: '10:00',
          end_time: '12:30',
          language: 'English',
          duration_weeks: 4,
          t_id: 1,
          show_date: new Date().toISOString().split('T')[0],
        },
        {
          show_id: 2,
          st_time: '14:00',
          end_time: '16:30',
          language: 'English',
          duration_weeks: 4,
          t_id: 1,
          show_date: new Date().toISOString().split('T')[0],
        },
        {
          show_id: 3,
          st_time: '18:00',
          end_time: '20:30',
          language: 'English',
          duration_weeks: 4,
          t_id: 2,
          show_date: new Date().toISOString().split('T')[0],
        },
      ]);
    }
  };

  const handleBookShow = (showId: number) => {
    if (!user) {
      toast.error('Please login to book tickets');
      navigate('/auth');
      return;
    }
    navigate(`/book/${showId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center h-96">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-xl text-muted-foreground">Movie not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Movie Poster */}
          <div className="md:col-span-1">
            <Card className="overflow-hidden border-border">
              <div className="aspect-[2/3] bg-muted flex items-center justify-center">
                {
                  (() => {
                    const imgSrc = movie.poster_url
                      ? (movie.poster_url.startsWith('http') ? movie.poster_url : `${BACKEND_BASE}${movie.poster_url}`)
                      : undefined;
                    return imgSrc ? (
                      <img src={imgSrc} alt={movie.m_name} className="w-full h-full object-cover" />
                    ) : (
                      <Film className="h-24 w-24 text-muted-foreground" />
                    );
                  })()
                }
              </div>
            </Card>
          </div>

          {/* Movie Details */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{movie.m_name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                {movie.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-gold fill-gold" />
                    <span className="text-lg font-semibold text-gold">{movie.rating}</span>
                  </div>
                )}
                {movie.genre && (
                  <span className="px-3 py-1 rounded-full bg-muted text-foreground">{movie.genre}</span>
                )}
              </div>
            </div>

            {movie.description && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Synopsis</h2>
                <p className="text-muted-foreground leading-relaxed">{movie.description}</p>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-1" />
                <div>
                  <p className="font-semibold">Release Date</p>
                  <p className="text-muted-foreground">{new Date(movie.release_date).toLocaleDateString()}</p>
                </div>
              </div>
              
              {movie.director && (
                <div className="flex items-start gap-3">
                  <Film className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold">Director</p>
                    <p className="text-muted-foreground">{movie.director}</p>
                  </div>
                </div>
              )}

              {movie.actors && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <Star className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <p className="font-semibold">Cast</p>
                    <p className="text-muted-foreground">{movie.actors}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shows Section */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Available Shows</h2>
          
          {shows.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shows.map((show) => (
                <Card key={show.show_id} className="p-6 border-border hover:border-primary/50 transition-colors">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{show.st_time} - {show.end_time}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>Theatre {show.t_id}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 rounded bg-muted">{show.language}</span>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => handleBookShow(show.show_id)}
                    >
                      Select Seats
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center border-border">
              <p className="text-muted-foreground">No shows available at the moment</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default MovieDetails;
