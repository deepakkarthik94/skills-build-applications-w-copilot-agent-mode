import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type WorkoutSuggestion = {
  title: string;
  focus?: string;
  minutes?: number;
  difficulty?: string;
  reason?: string;
};

type WorkoutState =
  | { status: 'loading' }
  | { status: 'loaded'; suggestions: WorkoutSuggestion[] }
  | { status: 'error' };

const userEmail = 'mona@example.com';

export default function Workouts() {
  const [state, setState] = useState<WorkoutState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(userEmail)}`)
      .then(({ suggestions }) => {
        if (active) setState({ status: 'loaded', suggestions });
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
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {state.status === 'loading' && <p role="status">Loading workout suggestions...</p>}
        {state.status === 'error' && <p role="alert">Unable to load workout suggestions. Please try again.</p>}
        {state.status === 'loaded' && state.suggestions.length === 0 && <p>No workout suggestions yet.</p>}
        {state.status === 'loaded' && state.suggestions.length > 0 && (
          <ul>
            {state.suggestions.map((suggestion) => (
              <li key={suggestion.title}>
                {suggestion.title}
                {suggestion.focus && ` — ${suggestion.focus}`}
                {suggestion.minutes !== undefined && `, ${suggestion.minutes} minutes`}
                {suggestion.difficulty && ` (${suggestion.difficulty})`}
                {suggestion.reason && <span>: {suggestion.reason}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
