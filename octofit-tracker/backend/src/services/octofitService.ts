import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400 });
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) {
    throw badRequest('Activity details are required');
  }

  const { userId, teamId, type, minutes } = input;
  if (
    typeof userId !== 'string'
    || !/^[\da-f]{24}$/i.test(userId)
    || typeof teamId !== 'string'
    || !/^[\da-f]{24}$/i.test(teamId)
    || typeof type !== 'string'
    || type.trim().length === 0
    || typeof minutes !== 'number'
    || !Number.isFinite(minutes)
    || minutes <= 0
  ) {
    throw badRequest('Activity requires valid userId, teamId, type, and positive minutes');
  }

  const [user, team] = await Promise.all([
    User.findById(userId).select('_id'),
    Team.findById(teamId).select('_id'),
  ]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: user._id,
    team: team._id,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) {
    throw badRequest('Team details are required');
  }

  const { name, mascot } = input;
  const members = input.members ?? [];
  if (
    typeof name !== 'string'
    || name.trim().length === 0
    || typeof mascot !== 'string'
    || mascot.trim().length === 0
    || !Array.isArray(members)
    || !members.every((member): member is string => typeof member === 'string' && /^[\da-f]{24}$/i.test(member))
  ) {
    throw badRequest('Team requires a name, mascot, and valid member IDs');
  }

  const memberIds = [...new Set(members)];
  const existingMembers = await User.find({ _id: { $in: memberIds } }).select('_id');
  if (existingMembers.length !== memberIds.length) {
    throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: memberIds });
}

export async function getLeaderboard() {
  const [teams, pointTotals] = await Promise.all([
    Team.find().select('name').lean(),
    Activity.aggregate<{ _id: unknown; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const totalsByTeam = new Map(pointTotals.map(({ _id, totalPoints }) => [String(_id), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: totalsByTeam.get(String(team._id)) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [workouts, recentActivity] = await Promise.all([
    Workout.find().lean(),
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).select('type').lean(),
  ]);
  const goal = user.fitnessGoal.toLowerCase();
  const activityType = recentActivity?.type.toLowerCase();
  const goalMatches = workouts.some((workout) => workout.focus.toLowerCase() === goal);
  const preferredFocus = goalMatches ? goal : activityType;

  return workouts
    .map((workout) => {
      const matchesGoal = workout.focus.toLowerCase() === goal;
      const matchesActivity = activityType !== undefined && workout.focus.toLowerCase() === activityType;
      const reason = matchesGoal
        ? `Matches your ${user.fitnessGoal} fitness goal.`
        : matchesActivity
          ? `Matches your recent ${activityType} activity.`
          : `Consider this ${workout.focus} workout alongside your ${user.fitnessGoal} goal.`;
      return { ...workout, reason };
    })
    .sort((left, right) => {
      const leftMatches = left.focus.toLowerCase() === preferredFocus;
      const rightMatches = right.focus.toLowerCase() === preferredFocus;
      return Number(rightMatches) - Number(leftMatches) || left.title.localeCompare(right.title);
    });
}

export { User };
