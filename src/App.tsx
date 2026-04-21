import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Coins,
  Play,
  Plus,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ViewState = 'LOBBY' | 'POLL' | 'TEAMS' | 'TOSS' | 'SCORING' | 'SUMMARY';
type RuleMode = 'Street' | 'Tapeball' | 'OneWicket' | 'Custom';

interface Player {
  id: string;
  name: string;
  isGuest?: boolean;
}

interface RuleSettings {
  wideRuns: number;
  noBallRuns: number;
  boundary4: number;
  boundary6: number;
  allowByes: boolean;
  allowLegByes: boolean;
}

interface Innings {
  team: 'A' | 'B';
  score: number;
  wickets: number;
  overs: number;
  balls: number;
  fow: { wicket: number; score: number; over: string }[];
  battingStats: Record<string, { runs: number; balls: number; fours: number; sixes: number }>;
  bowlingStats: Record<string, { overs: number; balls: number; runs: number; wickets: number; maidens: number }>;
}

interface MatchSession {
  matchName: string;
  groundName: string;
  groundFee: number;
  duration: number;
  waterCost: number;
  mode: RuleMode;
  ruleSettings: RuleSettings;
  teamAName: string;
  teamBName: string;
  players: Player[];
  teamA: Player[];
  teamB: Player[];
  commonPlayers: Player[];
  battingTeam: 'A' | 'B' | null;
  tossWinner: 'A' | 'B' | null;
  tossChoice: 'BAT' | 'BOWL' | null;
  currentInnings: number;
  innings: Innings[];
  currentBatter1: string;
  currentBatter2: string;
  currentBowler: string;
  currentOver: string[];
  lastBall: string;
  maxOvers: number;
  maxBowlerOvers: number;
}

const rulePresets: Record<RuleMode, RuleSettings> = {
  Street: {
    wideRuns: 1,
    noBallRuns: 1,
    boundary4: 4,
    boundary6: 6,
    allowByes: true,
    allowLegByes: true,
  },
  Tapeball: {
    wideRuns: 2,
    noBallRuns: 2,
    boundary4: 4,
    boundary6: 6,
    allowByes: true,
    allowLegByes: false,
  },
  OneWicket: {
    wideRuns: 1,
    noBallRuns: 1,
    boundary4: 4,
    boundary6: 6,
    allowByes: false,
    allowLegByes: false,
  },
  Custom: {
    wideRuns: 1,
    noBallRuns: 1,
    boundary4: 4,
    boundary6: 6,
    allowByes: true,
    allowLegByes: true,
  },
};

const defaultSession: MatchSession = {
  matchName: 'Street Smash',
  groundName: 'Cricket Den, Boduppal',
  groundFee: 1600,
  duration: 2,
  waterCost: 150,
  mode: 'Street',
  ruleSettings: rulePresets.Street,
  teamAName: 'Team A',
  teamBName: 'Team B',
  players: [],
  teamA: [],
  teamB: [],
  commonPlayers: [],
  battingTeam: null,
  tossWinner: null,
  tossChoice: null,
  currentInnings: 0,
  innings: [
    { team: 'A', score: 0, wickets: 0, overs: 0, balls: 0, fow: [], battingStats: {}, bowlingStats: {} },
    { team: 'B', score: 0, wickets: 0, overs: 0, balls: 0, fow: [], battingStats: {}, bowlingStats: {} },
  ],
  currentBatter1: '',
  currentBatter2: '',
  currentBowler: '',
  currentOver: [],
  lastBall: '',
  maxOvers: 5,
  maxBowlerOvers: 1,
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LOBBY');
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('cric_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [session, setSession] = useState<MatchSession>(defaultSession);
  const [tossResult, setTossResult] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  // Load saved players on mount
  useEffect(() => {
    const savedPlayers = localStorage.getItem('cric_players');
    if (savedPlayers) {
      setSession(prev => ({ ...prev, players: JSON.parse(savedPlayers) }));
    }
  }, []);

  const resetMatch = () => {
    setSession(defaultSession);
    setTossResult(null);
    setView('LOBBY');
    setIsSpinning(false);
  };

  const saveToHistory = (finalSession: MatchSession) => {
    const newHistory = [{ ...finalSession, date: new Date().toLocaleDateString() }, ...history];
    setHistory(newHistory);
    localStorage.setItem('cric_history', JSON.stringify(newHistory));
  };

  const startPoll = () => setView('POLL');

  const addPlayer = (name: string, isGuest = false) => {
    if (!name.trim()) return;
    const newPlayer: Player = { id: Math.random().toString(36).substr(2, 9), name: name.trim(), isGuest };
    setSession(prev => {
      const updatedPlayers = [...prev.players, newPlayer];
      localStorage.setItem('cric_players', JSON.stringify(updatedPlayers));
      return { ...prev, players: updatedPlayers };
    });
  };

  const removePlayer = (id: string) => {
    setSession(prev => {
      const updatedPlayers = prev.players.filter(p => p.id !== id);
      localStorage.setItem('cric_players', JSON.stringify(updatedPlayers));
      return { ...prev, players: updatedPlayers };
    });
  };

  const handleToss = () => {
    setIsSpinning(true);
    setTimeout(() => {
      const winner = Math.random() > 0.5 ? 'Team A' : 'Team B';
      setTossResult(winner);
      setSession(prev => ({ ...prev, tossWinner: winner === 'Team A' ? 'A' : 'B' }));
      setIsSpinning(false);
    }, 1200);
  };

  const recordBall = (type: string) => {
    setSession(prev => {
      const curIdx = prev.currentInnings;
      const innings = [...prev.innings];
      const curInnings = { ...innings[curIdx] };
      const battingStats = { ...curInnings.battingStats };
      const bowlingStats = { ...curInnings.bowlingStats };
      let striker = prev.currentBatter1;
      let nonStriker = prev.currentBatter2;
      const currentBowler = prev.currentBowler;
      const rules = prev.ruleSettings;

      if (!striker || !nonStriker || !currentBowler) return prev;
      if (!battingStats[striker]) battingStats[striker] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
      if (!bowlingStats[currentBowler]) bowlingStats[currentBowler] = { overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0 };

      const currentOver = [...prev.currentOver, type];
      let lastBall = type;
      let legalDelivery = false;
      let swapStrikes = false;

      if (type === 'W') {
        curInnings.wickets += 1;
        curInnings.fow.push({ wicket: curInnings.wickets, score: curInnings.score, over: `${curInnings.overs}.${curInnings.balls + 1}` });
        bowlingStats[currentBowler].wickets += 1;
        battingStats[striker].balls += 1;
        legalDelivery = true;
        striker = ''; // New batsman needed
      } else if (type === 'Wd' || type === 'Nb') {
        const award = type === 'Wd' ? rules.wideRuns : rules.noBallRuns;
        curInnings.score += award;
        bowlingStats[currentBowler].runs += award;
        lastBall = `${type} +${award}`;
      } else {
        const runs = type === 'Bye' || type === 'Lb' ? 1 : parseInt(type, 10);
        curInnings.score += runs;
        if (type !== 'Bye' && type !== 'Lb') {
          battingStats[striker].runs += runs;
          battingStats[striker].balls += 1;
          if (runs === 4) battingStats[striker].fours += 1;
          if (runs === 6) battingStats[striker].sixes += 1;
        } else {
          battingStats[striker].balls += 1;
        }
        bowlingStats[currentBowler].runs += runs;
        legalDelivery = true;
        if (runs % 2 === 1) swapStrikes = true;
      }

      if (legalDelivery) {
        curInnings.balls += 1;
        bowlingStats[currentBowler].balls += 1;
      }

      if (swapStrikes) {
        [striker, nonStriker] = [nonStriker, striker];
      }

      if (curInnings.balls === 6) {
        curInnings.balls = 0;
        curInnings.overs += 1;
        bowlingStats[currentBowler].overs += 1;
        bowlingStats[currentBowler].balls = 0;
      }

      curInnings.battingStats = battingStats;
      curInnings.bowlingStats = bowlingStats;
      innings[curIdx] = curInnings;

      // Check for innings end: 10 wickets or overs completed
      const inningsEnded = curInnings.wickets >= 10 || curInnings.overs >= prev.maxOvers;
      if (inningsEnded) {
        if (curIdx === 0) {
          setSession(prev => ({ ...prev, currentInnings: 1, currentBatter1: '', currentBatter2: '', currentBowler: '', currentOver: [], battingTeam: prev.battingTeam === 'A' ? 'B' : 'A' }));
        } else {
          saveToHistory({ ...prev, innings });
          setTimeout(() => setView('SUMMARY'), 400);
        }
      }

      const target = curIdx === 1 ? innings[0].score + 1 : null;
      if (curIdx === 1 && target !== null && curInnings.score >= target) {
        saveToHistory({ ...prev, innings });
        setTimeout(() => setView('SUMMARY'), 400);
      }

      return {
        ...prev,
        innings,
        currentOver: curInnings.balls === 0 ? [] : currentOver,
        currentBatter1: striker,
        currentBatter2: nonStriker,
        lastBall,
      };
    });
  };

  const LobbyView = () => (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Street Cricket Companion</p>
          <h1>Gully<span className="accent-text">Play</span></h1>
          <p className="hero-note">Fast match setup, local rules, and a premium match companion for your street league.</p>
        </div>
      </header>

      <div className="glass-card">
        <h3>Match Setup</h3>
        <div className="field-grid">
          <div>
            <label>Match Name</label>
            <input value={session.matchName} onChange={e => setSession(prev => ({ ...prev, matchName: e.target.value }))} />
          </div>
          <div>
            <label>Mode</label>
            <select value={session.mode} onChange={e => setSession(prev => ({ ...prev, mode: e.target.value as RuleMode, ruleSettings: rulePresets[e.target.value as RuleMode] }))}>
              {(['Street', 'Tapeball', 'OneWicket', 'Custom'] as RuleMode[]).map(mode => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </div>
        </div>

        <div className="field-grid">
          <div>
            <label>Overs</label>
            <select value={session.maxOvers} onChange={e => setSession(prev => ({ ...prev, maxOvers: parseInt(e.target.value, 10) }))}>
              {[5, 6, 7, 8, 10, 12].map(count => <option key={count} value={count}>{count} Overs</option>)}
            </select>
          </div>
          <div>
            <label>Max / Bowler</label>
            <select value={session.maxBowlerOvers} onChange={e => setSession(prev => ({ ...prev, maxBowlerOvers: parseInt(e.target.value, 10) }))}>
              {[1, 2, 3, 4].map(count => <option key={count} value={count}>{count} Overs</option>)}
            </select>
          </div>
        </div>

        <div className="field-grid">
          <div>
            <label>Ground</label>
            <input value={session.groundName} onChange={e => setSession(prev => ({ ...prev, groundName: e.target.value }))} />
          </div>
          <div>
            <label>Ground Fee</label>
            <input type="number" value={session.groundFee} onChange={e => setSession(prev => ({ ...prev, groundFee: parseInt(e.target.value, 10) || 0 }))} />
          </div>
        </div>
      </div>

      <div className="glass-card split-card">
        <div>
          <h3>Rule preview</h3>
          <p className="score-overs">Wide: +{session.ruleSettings.wideRuns}, No-ball: +{session.ruleSettings.noBallRuns}</p>
          <p className="score-overs">4 = {session.ruleSettings.boundary4}, 6 = {session.ruleSettings.boundary6}</p>
          <p className="score-overs">Byes: {session.ruleSettings.allowByes ? 'Yes' : 'No'}, Leg byes: {session.ruleSettings.allowLegByes ? 'Yes' : 'No'}</p>
        </div>
        <div className="summary-card small-card">
          <p className="score-overs">Match cost</p>
          <h2>₹{session.groundFee + session.waterCost}</h2>
          <p className="score-overs">One-time ground + extras</p>
        </div>
      </div>

      <button className="btn-primary" onClick={startPoll}>
        <Play fill="black" /> Create New Match
      </button>

      {history.length > 0 && (
        <div className="glass-card history-card">
          <div className="history-header">
            <h3>Match History</h3>
            <span>{history.length} saved</span>
          </div>
          {history.map((m, idx) => (
            <div key={idx} className="history-item">
              <div>
                <p className="history-title">{m.matchName || 'Street Cricket Match'}</p>
                <p className="score-overs">{m.date}</p>
              </div>
              <p className="history-cost">₹{Math.ceil((m.groundFee + m.waterCost) / (m.players.length || 1))}/head</p>
            </div>
          ))}
          <button className="btn-secondary" onClick={() => { localStorage.removeItem('cric_history'); setHistory([]); }}>Clear History</button>
        </div>
      )}
    </div>
  );

  const PollView = () => {
    const [name, setName] = useState('');

    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <div className="nav-row">
          <RotateCcw size={20} onClick={() => setView('LOBBY')} />
          <h2>Player Roster</h2>
        </div>

        <div className="glass-card">
          <div className="inline-row">
            <input
              type="text"
              placeholder="Add player name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && (addPlayer(name), setName(''))}
            />
            <button className="btn-primary compact" onClick={() => { addPlayer(name); setName(''); }}>
              <Plus />
            </button>
          </div>
        </div>

        <div className="player-stack">
          {session.players.map(player => (
            <motion.div key={player.id} className="player-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <span>{player.name}</span>
              <button className="text-button" onClick={() => removePlayer(player.id)}>Remove</button>
            </motion.div>
          ))}
        </div>

        <button className="btn-primary" disabled={session.players.length < 2} onClick={() => setView('TEAMS')}>
          Form Teams <ChevronRight />
        </button>
      </div>
    );
  };

  const TeamsView = () => {
    const handleSplit = () => {
      const shuffled = [...session.players].sort(() => 0.5 - Math.random());
      const mid = Math.ceil(shuffled.length / 2);
      setSession(prev => ({ ...prev, teamA: shuffled.slice(0, mid), teamB: shuffled.slice(mid), commonPlayers: [] }));
    };

    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <div className="nav-row">
          <RotateCcw size={20} onClick={() => setView('POLL')} />
          <h2>Team Builder</h2>
        </div>

        <div className="glass-card">
          <div className="field-grid">
            <div>
              <label>Team A Name</label>
              <input value={session.teamAName} onChange={e => setSession(prev => ({ ...prev, teamAName: e.target.value }))} />
            </div>
            <div>
              <label>Team B Name</label>
              <input value={session.teamBName} onChange={e => setSession(prev => ({ ...prev, teamBName: e.target.value }))} />
            </div>
          </div>
        </div>

        <button className="btn-secondary" style={{ width: '100%', marginBottom: '1rem' }} onClick={handleSplit}>
          Auto shuffle players
        </button>

        <div className="grid-columns">
          <div>
            <h3>{session.teamAName}</h3>
            {session.teamA.map(player => (
              <div key={player.id} className="team-row">
                <span>{player.name}</span>
                <div className="team-actions">
                  <button className="mini-btn" onClick={() => setSession(prev => ({ ...prev, teamA: prev.teamA.filter(x => x.id !== player.id), commonPlayers: [...prev.commonPlayers, player] }))}>C</button>
                  <button className="mini-btn transparent" onClick={() => setSession(prev => ({ ...prev, teamA: prev.teamA.filter(x => x.id !== player.id), teamB: [...prev.teamB, player] }))}>→</button>
                </div>
              </div>
            ))}
          </div>
          <div>
            <h3>{session.teamBName}</h3>
            {session.teamB.map(player => (
              <div key={player.id} className="team-row">
                <div className="team-actions">
                  <button className="mini-btn transparent" onClick={() => setSession(prev => ({ ...prev, teamB: prev.teamB.filter(x => x.id !== player.id), teamA: [...prev.teamA, player] }))}>←</button>
                  <button className="mini-btn" onClick={() => setSession(prev => ({ ...prev, teamB: prev.teamB.filter(x => x.id !== player.id), commonPlayers: [...prev.commonPlayers, player] }))}>C</button>
                </div>
                <span>{player.name}</span>
              </div>
            ))}
          </div>
        </div>

        {session.commonPlayers.length > 0 && (
          <div className="glass-card common-card">
            <h3>Common Players</h3>
            <div className="common-grid">
              {session.commonPlayers.map(player => (
                <div key={player.id} className="common-chip">
                  <span>{player.name}</span>
                  <div className="common-actions">
                    <button className="text-button" onClick={() => setSession(prev => ({ ...prev, commonPlayers: prev.commonPlayers.filter(x => x.id !== player.id), teamA: [...prev.teamA, player] }))}>A</button>
                    <button className="text-button" onClick={() => setSession(prev => ({ ...prev, commonPlayers: prev.commonPlayers.filter(x => x.id !== player.id), teamB: [...prev.teamB, player] }))}>B</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn-primary" onClick={() => setView('TOSS')} disabled={session.teamA.length === 0 || session.teamB.length === 0}>
          Ready for toss
        </button>
      </div>
    );
  };

  const TossView = () => (
    <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}>
      <AnimatePresence>
        {!tossResult ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="glass-card toss-card">
            <div className="section-title">Digital Toss</div>
            <motion.button
              className="btn-primary toss-button"
              animate={isSpinning ? { rotateY: 720 } : {}}
              transition={{ duration: 1.3 }}
              onClick={handleToss}
            >
              <Coins size={48} />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card toss-card">
            <Trophy className="accent-text" style={{ marginBottom: '1rem' }} size={48} />
            <h2>{tossResult} won the toss</h2>
            <div className="button-group">
              <button className="btn-secondary" onClick={() => {
                const battingTeam = tossResult === 'Team A' ? 'A' : 'B';
                setSession(prev => ({ ...prev, battingTeam, currentInnings: 0, currentBatter1: '', currentBatter2: '', currentBowler: '', currentOver: [], lastBall: '' }));
                setView('SCORING');
              }}>Bat First</button>
              <button className="btn-secondary" onClick={() => {
                const battingTeam = tossResult === 'Team A' ? 'B' : 'A';
                setSession(prev => ({ ...prev, battingTeam, currentInnings: 0, currentBatter1: '', currentBatter2: '', currentBowler: '', currentOver: [], lastBall: '' }));
                setView('SCORING');
              }}>Bowl First</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const ScoringView = () => {
    const curIdx = session.currentInnings;
    const curInnings = session.innings[curIdx];
    const battingTeamPlayers = session.battingTeam === 'A' ? [...session.teamA, ...session.commonPlayers] : [...session.teamB, ...session.commonPlayers];
    const bowlingTeamPlayers = session.battingTeam === 'A' ? [...session.teamB, ...session.commonPlayers] : [...session.teamA, ...session.commonPlayers];
    const target = curIdx === 1 ? session.innings[0].score + 1 : null;

    const endInnings = () => {
      if (curIdx === 0) {
        setSession(prev => ({ ...prev, currentInnings: 1, currentBatter1: '', currentBatter2: '', currentBowler: '', currentOver: [], battingTeam: prev.battingTeam === 'A' ? 'B' : 'A' }));
      } else {
        saveToHistory(session);
        setView('SUMMARY');
      }
    };

    return (
      <div className="scoring-page">
        <div className="header">
          <button className="btn-secondary" onClick={endInnings}>{curIdx === 0 ? 'End Innings' : 'End Match'}</button>
          <span className="badge">Innings {curIdx + 1}</span>
        </div>

        <section className="score-display">
          <div className="score-main">{curInnings.score}/{curInnings.wickets}</div>
          <p className="score-overs">Overs: {curInnings.overs}.{curInnings.balls} / {session.maxOvers}</p>
          {target && <p className="accent-text">Target: {target}</p>}
          <p className="score-mini">{session.groundName} • {session.mode} mode</p>
        </section>

        <div className="container">
          <div className="glass-card selection-card">
            <div className="inline-row">
              <div>
                <label>Striker</label>
                <select value={session.currentBatter1} onChange={e => setSession(prev => ({ ...prev, currentBatter1: e.target.value }))}>
                  <option value="">Select striker</option>
                  {battingTeamPlayers.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
                </select>
              </div>
              <div>
                <label>Non-striker</label>
                <select value={session.currentBatter2} onChange={e => setSession(prev => ({ ...prev, currentBatter2: e.target.value }))}>
                  <option value="">Select non-striker</option>
                  {battingTeamPlayers.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <label>Bowler</label>
              <select value={session.currentBowler} onChange={e => setSession(prev => ({ ...prev, currentBowler: e.target.value }))}>
                <option value="">Select bowler</option>
                {bowlingTeamPlayers.map(player => <option key={player.id} value={player.id}>{player.name}</option>)}
              </select>
            </div>
          </div>

          <div className="glass-card status-card">
            <div>
              <p className="score-overs">Last ball</p>
              <div className="status-text">{session.lastBall || 'Ready for the first delivery'}</div>
            </div>
            <div>
              <p className="score-overs">Current over</p>
              <div className="status-text">{session.currentOver.length ? session.currentOver.join(' · ') : 'No deliveries yet'}</div>
            </div>
          </div>

          <div className="glass-card stats-panel">
            <h3>Batting Scorecard</h3>
            <table>
              <thead>
                <tr><th>Player</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr>
              </thead>
              <tbody>
                {Object.entries(curInnings.battingStats).map(([id, stat]) => (
                  <tr key={id}>
                    <td>{session.players.find(x => x.id === id)?.name || 'Unknown'}</td>
                    <td>{stat.runs}</td>
                    <td>{stat.balls}</td>
                    <td>{stat.fours}</td>
                    <td>{stat.sixes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="scoring-grid">
          {[0, 1, 2, 3, 4, 6].map(value => (
            <button key={value} disabled={!session.currentBowler || !session.currentBatter1 || !session.currentBatter2} className="score-btn boundary" onClick={() => recordBall(value.toString())}>{value}</button>
          ))}
          <button disabled={!session.currentBowler || !session.currentBatter1 || !session.currentBatter2} className="score-btn" onClick={() => recordBall('Wd')}>Wd</button>
          <button disabled={!session.currentBowler || !session.currentBatter1 || !session.currentBatter2} className="score-btn" onClick={() => recordBall('Nb')}>Nb</button>
          <button disabled={!session.currentBowler || !session.currentBatter1 || !session.currentBatter2} className="score-btn" onClick={() => recordBall('Bye')}>Bye</button>
          <button disabled={!session.currentBowler || !session.currentBatter1 || !session.currentBatter2} className="score-btn" onClick={() => recordBall('Lb')}>Lb</button>
          <button disabled={!session.currentBowler || !session.currentBatter1 || !session.currentBatter2} className="score-btn wicket" onClick={() => recordBall('W')}>W</button>
        </div>
      </div>
    );
  };

  const SummaryView = () => {
    const totalCost = session.groundFee + session.waterCost;
    const totalPlayers = session.teamA.length + session.teamB.length + session.commonPlayers.length || 1;
    const perHead = Math.ceil(totalCost / totalPlayers);
    const inn1 = session.innings[0];
    const inn2 = session.innings[1];
    const result = inn2.score > inn1.score ? `${session.teamBName} Won!` : `${session.teamAName} Won!`;
    const allBatting = { ...inn1.battingStats, ...inn2.battingStats };
    const allBowling = { ...inn1.bowlingStats, ...inn2.bowlingStats };
    const topBatter = Object.entries(allBatting).sort(([, a], [, b]) => b.runs - a.runs)[0];
    const topBowler = Object.entries(allBowling).sort(([, a], [, b]) => b.wickets - a.wickets)[0];

    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <div className="summary-header">
          <Trophy className="accent-text" size={48} />
          <div>
            <h2>{result}</h2>
            <p className="score-overs">{session.matchName} • {session.groundName}</p>
          </div>
        </div>

        <div className="glass-card result-grid">
          <div>
            <p>{session.teamAName}</p>
            <h3>{inn1.score}/{inn1.wickets}</h3>
          </div>
          <div>
            <p>{session.teamBName}</p>
            <h3>{inn2.score}/{inn2.wickets}</h3>
          </div>
        </div>

        <div className="glass-card performance-card">
          <h3>Key players</h3>
          <p><strong>Top batter:</strong> {topBatter ? session.players.find(x => x.id === topBatter[0])?.name : 'N/A'} ({topBatter ? topBatter[1].runs : 0} runs)</p>
          <p><strong>Top bowler:</strong> {topBowler ? session.players.find(x => x.id === topBowler[0])?.name : 'N/A'} ({topBowler ? topBowler[1].wickets : 0} wickets)</p>
        </div>

        <div className="glass-card performance-card">
          <h3>Expense split</h3>
          <p>₹{perHead}/head</p>
          <p>Ground + extras: ₹{totalCost}</p>
        </div>

        <button className="btn-primary" onClick={resetMatch}>New Match</button>
      </div>
    );
  };

  const stepLabels: ViewState[] = ['LOBBY', 'POLL', 'TEAMS', 'TOSS', 'SCORING', 'SUMMARY'];

  return (
    <div className="app-shell">
      <div className="progress-bar">
        {stepLabels.map((step, index) => (
          <div key={step} className={stepLabels.indexOf(view) >= index ? 'progress-segment active' : 'progress-segment'} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          {view === 'LOBBY' && <LobbyView />}
          {view === 'POLL' && <PollView />}
          {view === 'TEAMS' && <TeamsView />}
          {view === 'TOSS' && <TossView />}
          {view === 'SCORING' && <ScoringView />}
          {view === 'SUMMARY' && <SummaryView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default App;
