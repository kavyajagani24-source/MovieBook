import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../config/db.js";
import { pool } from "../config/pgPool.js";
import dotenv from "dotenv";
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const POSTER_MOVIES = [
  { m_name: "Interstellar", poster: "interstellar.jpg", director: "Christopher Nolan", actors: "Matthew McConaughey, Anne Hathaway", genre: "Sci-Fi", rating: "8.7", release_date: "2014-11-07", description: "Explorers travel through a wormhole in search of a new home for humanity." },
  { m_name: "Inception", poster: "inception.jpg", director: "Christopher Nolan", actors: "Leonardo DiCaprio, Joseph Gordon-Levitt", genre: "Sci-Fi", rating: "8.8", release_date: "2010-07-16", description: "A thief enters dreams to plant an idea." },
  { m_name: "Batman", poster: "batman.jpg", director: "Tim Burton", actors: "Michael Keaton, Jack Nicholson", genre: "Action", rating: "7.5", release_date: "1989-06-23", description: "Batman faces the Joker in Gotham City." },
  { m_name: "The Batman", poster: "MV5BMmU5NGJlMzAtMGNmOC00YjJjLTgyMzUtNjAyYmE4Njg5YWMyXkEyXkFqcGc@._V1_.jpg", director: "Matt Reeves", actors: "Robert Pattinson, Zoe Kravitz", genre: "Action", rating: "7.8", release_date: "2022-03-04", description: "Batman uncovers corruption in Gotham while hunting the Riddler." },
  { m_name: "Joker", poster: "joker.jpg", director: "Todd Phillips", actors: "Joaquin Phoenix, Robert De Niro", genre: "Drama", rating: "8.4", release_date: "2019-10-04", description: "A failed comedian descends into madness in Gotham." },
  { m_name: "Spider-Man", poster: "6letmpQOO-L.jpg", director: "Sam Raimi", actors: "Tobey Maguire, Kirsten Dunst", genre: "Action", rating: "7.4", release_date: "2002-05-03", description: "Peter Parker becomes Spider-Man." },
  { m_name: "Doctor Strange", poster: "doctor.jpg", director: "Scott Derrickson", actors: "Benedict Cumberbatch, Chiwetel Ejiofor", genre: "Action", rating: "7.5", release_date: "2016-11-04", description: "A surgeon learns the mystic arts." },
  { m_name: "Avengers", poster: "avengers.jpg", director: "Joss Whedon", actors: "Robert Downey Jr., Chris Evans", genre: "Action", rating: "8.0", release_date: "2012-05-04", description: "Earth's heroes assemble to stop an alien invasion." },
  { m_name: "Black Panther", poster: "blackpanther.jpg", director: "Ryan Coogler", actors: "Chadwick Boseman, Michael B. Jordan", genre: "Action", rating: "7.3", release_date: "2018-02-16", description: "T'Challa returns home to Wakanda to take the throne." },
  { m_name: "Titanic", poster: "titanic.jpg", director: "James Cameron", actors: "Leonardo DiCaprio, Kate Winslet", genre: "Romance", rating: "7.9", release_date: "1997-12-19", description: "A love story aboard the ill-fated ocean liner." },
  { m_name: "Frozen", poster: "frozen.jpg", director: "Chris Buck, Jennifer Lee", actors: "Kristen Bell, Idina Menzel", genre: "Animation", rating: "7.4", release_date: "2013-11-27", description: "Anna sets out to find her sister Elsa." },
  { m_name: "Frozen II", poster: "p_frozen2_19644_4c4b423d.jpeg", director: "Chris Buck, Jennifer Lee", actors: "Kristen Bell, Idina Menzel", genre: "Animation", rating: "6.8", release_date: "2019-11-22", description: "Elsa and Anna travel to an enchanted forest." }
];

const SHOWTIMES = [
  ["10:00", "12:30"],
  ["14:00", "16:30"],
  ["18:00", "20:30"],
  ["21:15", "23:45"]
];

async function seedPosterMovies() {
  const [theatres] = await db.promise().query('SELECT t_id FROM "Theatre" ORDER BY t_id LIMIT 1');
  let theatreId = theatres[0]?.t_id;
  if (!theatreId) {
    const [created] = await db.promise().query(
      `INSERT INTO "Theatre" (t_name, location) VALUES ('PVR Cinemas', 'Downtown Plaza')`
    );
    theatreId = created.insertId;
  }

  for (const movie of POSTER_MOVIES) {
    const posterUrl = `/posters/${movie.poster}`;
    const [existing] = await db.promise().query('SELECT m_id FROM "Movie" WHERE m_name = ?', [movie.m_name]);
    let movieId = existing[0]?.m_id;
    if (movieId) {
      await db.promise().query(
        `UPDATE "Movie"
         SET poster_url = ?, director = ?, actors = ?, genre = ?, rating = ?, release_date = ?, description = ?, language = 'English'
         WHERE m_id = ?`,
        [posterUrl, movie.director, movie.actors, movie.genre, movie.rating, movie.release_date, movie.description, movieId]
      );
    } else {
      const [created] = await db.promise().query(
        `INSERT INTO "Movie" (m_name, release_date, director, actors, poster_url, description, language, rating, genre)
         VALUES (?, ?, ?, ?, ?, ?, 'English', ?, ?)`,
        [movie.m_name, movie.release_date, movie.director, movie.actors, posterUrl, movie.description, movie.rating, movie.genre]
      );
      movieId = created.insertId;
    }

    const [shows] = await db.promise().query('SELECT show_id FROM "Shows" WHERE m_id = ?', [movieId]);
    if (!shows.length) {
      for (const [start, end] of SHOWTIMES) {
        await db.promise().query(
          `INSERT INTO "Shows" (st_time, end_time, language, duration_weeks, m_id, t_id)
           VALUES (?, ?, 'English', 4, ?, ?)`,
          [start, end, movieId, theatreId]
        );
      }
    }
  }
}

export async function initDatabases() {
  const database = process.env.DB_NAME || "postgres";
  console.log(`Initializing Postgres schema in database "${database}"...`);

  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);

  await db.promise().query(
    `INSERT INTO "Admin" (admin_id, password, salary)
     VALUES (1, 'adminpass1', 0)
     ON CONFLICT (admin_id) DO NOTHING`
  );

  await seedPosterMovies();

  console.log("Postgres tables are ready. Open them in pgAdmin under Schemas → public.");
}

if (process.argv[1]?.endsWith("initFtDb.js")) {
  initDatabases()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Initialization failed:", err.message);
      if (!process.env.DB_PASSWORD) {
        console.error("Set DB_PASSWORD in server/.env to the postgres password from pgAdmin.");
      }
      process.exit(1);
    });
}
