import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type LeaderboardEntry = {
  teamName: string;
  totalPoints: number;
  rank: number;
};

type LeaderboardState =
  | { status: 'loading' }
  | { status: 'loaded'; leaderboard: LeaderboardEntry[] }
  | { status: 'error' };

export default function Leaderboard() {
  const [state, setState] = useState<LeaderboardState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard')
      .then(({ leaderboard }) => {
        if (active) setState({ status: 'loaded', leaderboard });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Leaderboard</h2>
        <p>Compare team point totals.</p>
        {state.status === 'loading' && <p role="status">Loading leaderboard...</p>}
        {state.status === 'error' && <p role="alert">Unable to load leaderboard. Please try again.</p>}
        {state.status === 'loaded' && state.leaderboard.length === 0 && <p>No leaderboard scores yet.</p>}
        {state.status === 'loaded' && state.leaderboard.length > 0 && (
          <ol>
            {state.leaderboard.map((entry) => (
              <li key={entry.teamName}>{entry.teamName}: {entry.totalPoints} points</li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
