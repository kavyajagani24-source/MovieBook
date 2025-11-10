import { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MovieCard from '@/components/MovieCard';
import Navbar from '@/components/Navbar';
import { Movie } from '@/types';
import { movieAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Home = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    filterMovies();
  }, [searchQuery, selectedGenre, movies]);

  const fetchMovies = async () => {
    try {
      setIsLoading(true);
      const response = await movieAPI.getAll();
      setMovies(response.data);
      setFilteredMovies(response.data);
    } catch (error) {
      toast.error('Failed to fetch movies');
      // Use mock data for demo
      const mockMovies: Movie[] = [
        {
          m_id: 1,
          m_name: 'The Dark Cinema',
          release_date: '2024-01-15',
          director: 'Christopher Nolan',
          actors: 'Christian Bale, Heath Ledger',
          genre: 'Action',
          rating: '9.0',
          description: 'A thrilling action movie',
        },
        {
          m_id: 2,
          m_name: 'Romance in Paris',
          release_date: '2024-02-20',
          director: 'Sofia Coppola',
          actors: 'Emma Stone, Ryan Gosling',
          genre: 'Romance',
          rating: '8.5',
          description: 'A beautiful love story',
        },
        {
          m_id: 3,
          m_name: 'Cosmic Journey',
          release_date: '2024-03-10',
          director: 'Denis Villeneuve',
          actors: 'Timothée Chalamet, Zendaya',
          genre: 'Sci-Fi',
          rating: '8.8',
          description: 'An epic space adventure',
        },
      ];
      setMovies(mockMovies);
      setFilteredMovies(mockMovies);
    } finally {
      setIsLoading(false);
    }
  };

  const filterMovies = () => {
    let filtered = movies;

    if (searchQuery) {
      filtered = filtered.filter(
        (movie) =>
          movie.m_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          movie.director?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          movie.actors?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedGenre !== 'all') {
      filtered = filtered.filter((movie) => movie.genre === selectedGenre);
    }

    setFilteredMovies(filtered);
  };

  const genres = ['all', ...new Set(movies.map((m) => m.genre).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold">
            <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Book Your Experience
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover the latest movies and book your tickets in seconds
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search movies, directors, actors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-full md:w-48 bg-card border-border">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {genres.slice(1).map((genre) => (
                <SelectItem key={genre} value={genre as string}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Movies Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : filteredMovies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.m_id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">No movies found</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
