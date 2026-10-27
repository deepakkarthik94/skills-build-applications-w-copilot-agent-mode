import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = {
  name: string;
  mascot?: string;
  members: string[];
};

type TeamState =
  | { status: 'loading' }
  | { status: 'loaded'; teams: Team[] }
  | { status: 'error' };

export default function Teams() {
  const [state, setState] = useState<TeamState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getJson<{ teams: Team[] }>('/api/teams')
      .then(({ teams }) => {
        if (active) setState({ status: 'loaded', teams });
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
        <h2 className="h4">Teams</h2>
        <p>Manage teams and members.</p>
        {state.status === 'loading' && <p role="status">Loading teams...</p>}
        {state.status === 'error' && <p role="alert">Unable to load teams. Please try again.</p>}
        {state.status === 'loaded' && state.teams.length === 0 && <p>No teams yet.</p>}
        {state.status === 'loaded' && state.teams.length > 0 && (
          <ul>
            {state.teams.map((team) => (
              <li key={team.name}>
                {team.name}{team.mascot ? ` (${team.mascot})` : ''}
                {team.members.length > 0 && <span> — Members: {team.members.join(', ')}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
