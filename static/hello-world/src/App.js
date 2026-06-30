import React, { useState, useEffect, useRef } from 'react';
import { invoke, view } from '@forge/bridge';

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrap: { fontFamily: "'Segoe UI', Arial, sans-serif", padding: '16px', background: '#0F1117', minHeight: '100vh', color: '#e2e8f0' },
  header: { background: 'linear-gradient(135deg, #1a1f2e 0%, #16213e 100%)', border: '1px solid #2d3748', borderRadius: '10px', padding: '18px 24px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: '22px', fontWeight: '700', color: '#e2e8f0', margin: 0 },
  headerSub: { fontSize: '13px', color: '#718096', margin: '4px 0 0' },
  badge: { background: '#553c9a', color: '#e9d8fd', fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #2d3748', paddingBottom: '0' },
  tab: { padding: '10px 20px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: '2px solid transparent', color: '#718096', marginBottom: '-1px' },
  tabActive: { padding: '10px 20px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none', background: 'transparent', borderBottom: '2px solid #805ad5', color: '#e2e8f0', marginBottom: '-1px' },
  sectionHeader: { fontSize: '11px', fontWeight: '600', color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '.08em', padding: '0 0 8px', borderBottom: '1px solid #2d3748', marginBottom: '16px' },
  card: { background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px', padding: '14px 18px', marginBottom: '8px' },
  formRow: { display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '12px', flexWrap: 'wrap' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '12px', color: '#a0aec0', fontWeight: '500' },
  input: { background: '#2d3748', border: '1px solid #4a5568', borderRadius: '6px', color: '#e2e8f0', padding: '8px 12px', fontSize: '13px', outline: 'none', width: '100%' },
  select: { background: '#2d3748', border: '1px solid #4a5568', borderRadius: '6px', color: '#e2e8f0', padding: '8px 12px', fontSize: '13px', outline: 'none' },
  btnPrimary: { background: '#553c9a', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnDanger: { background: 'transparent', color: '#fc8181', border: '1px solid #742a2a', borderRadius: '6px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' },
  btnSecondary: { background: 'transparent', color: '#a0aec0', border: '1px solid #4a5568', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer' },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' },
  metricCard: { background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '10px', padding: '18px', textAlign: 'center' },
  metricValue: { fontSize: '28px', fontWeight: '700', margin: '0 0 4px' },
  metricLabel: { fontSize: '11px', color: '#718096', textTransform: 'uppercase', letterSpacing: '.06em' },
  memberName: { fontSize: '14px', fontWeight: '600', color: '#e2e8f0' },
  memberRole: { fontSize: '12px', color: '#718096' },
  memberStat: { fontSize: '12px', color: '#a0aec0' },
  pill: { display: 'inline-block', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' },
  barBg: { background: '#2d3748', borderRadius: '6px', height: '8px', width: '100%', overflow: 'hidden', margin: '8px 0 4px' },
  infoBox: { background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px', padding: '14px 18px', color: '#718096', fontSize: '13px', textAlign: 'center' },
  sideBySide: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  summaryBar: { background: '#1a1f2e', border: '1px solid #2d3748', borderRadius: '8px', padding: '12px 20px', marginBottom: '16px', display: 'flex', gap: '32px', flexWrap: 'wrap' },
  summaryItem: { fontSize: '13px', color: '#a0aec0' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWorkingDays(start, end) {
  const days = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      days.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function hoursToSP(hours, hPerSP) {
  return Math.round((hours / hPerSP) * 10) / 10;
}

function capacityColor(pct) {
  if (pct >= 70) return '#68d391';
  if (pct >= 40) return '#f6ad55';
  return '#fc8181';
}

function capacityPill(pct) {
  if (pct >= 70) return { bg: '#22543d', color: '#9ae6b4', label: 'Healthy' };
  if (pct >= 40) return { bg: '#744210', color: '#fbd38d', label: 'Reduced' };
  return { bg: '#742a2a', color: '#feb2b2', label: 'Critical' };
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('team');

  // Sprint config
  const [sprintName, setSprintName] = useState('Sprint 1');
  const [sprintStart, setSprintStart] = useState(today());
  const [sprintEnd, setSprintEnd] = useState(addDays(today(), 13));
  const [mode, setMode] = useState('Both');
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [hoursPerSP, setHoursPerSP] = useState(8);

  // Team
  const [members, setMembers] = useState([]);
  const [mName, setMName] = useState('');
  const [mRole, setMRole] = useState('');
  const [mHours, setMHours] = useState(6);

  // Leave
  const [leaves, setLeaves] = useState([]);
  const [lMember, setLMember] = useState('');
  const [lDate, setLDate] = useState(today());
  const [lType, setLType] = useState('Planned Leave');

  // Persistence (bufferPct & history persisted now, no UI yet)
  const [bufferPct, setBufferPct] = useState(0);
  const [history, setHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const projectIdRef = useRef(null);
  const saveTimerRef = useRef(null);

  // ── Load on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let projectId;
      try {
        const ctx = await view.getContext();
        projectId = ctx?.extension?.project?.id;
      } catch (e) {
        projectId = undefined;
      }
      projectIdRef.current = projectId;

      try {
        const data = await invoke('getData', { projectId });
        if (cancelled) return;
        if (data?.config) {
          const c = data.config;
          if (c.sprintName != null) setSprintName(c.sprintName);
          if (c.sprintStart != null) setSprintStart(c.sprintStart);
          if (c.sprintEnd != null) setSprintEnd(c.sprintEnd);
          if (c.mode != null) setMode(c.mode);
          if (c.hoursPerDay != null) setHoursPerDay(c.hoursPerDay);
          if (c.hoursPerSP != null) setHoursPerSP(c.hoursPerSP);
        }
        setMembers(Array.isArray(data?.members) ? data.members : []);
        setLeaves(Array.isArray(data?.leaves) ? data.leaves : []);
        setBufferPct(typeof data?.bufferPct === 'number' ? data.bufferPct : 0);
        setHistory(Array.isArray(data?.history) ? data.history : []);
      } catch (e) {
        // Fresh project or read error — start empty.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Debounced auto-save ──
  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaving(true);
    setSaveError(false);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await invoke('saveData', {
          projectId: projectIdRef.current,
          config: { sprintName, sprintStart, sprintEnd, mode, hoursPerDay, hoursPerSP },
          members,
          leaves,
          bufferPct,
        });
        setSaveError(false);
      } catch (e) {
        // Surface the real failure instead of pretending it saved.
        console.error('saveData failed:', e);
        setSaveError(true);
      } finally {
        setSaving(false);
      }
    }, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [loaded, sprintName, sprintStart, sprintEnd, mode, hoursPerDay, hoursPerSP, members, leaves, bufferPct]);

  // ── Add member ──
  function addMember() {
    if (!mName.trim()) return;
    if (members.find(m => m.name === mName.trim())) return;
    setMembers([...members, { name: mName.trim(), role: mRole.trim(), hours: parseFloat(mHours) }]);
    setMName(''); setMRole(''); setMHours(hoursPerDay);
  }

  function removeMember(name) {
    setMembers(members.filter(m => m.name !== name));
    setLeaves(leaves.filter(l => l.member !== name));
  }

  // ── Add leave ──
  function addLeave() {
    if (!lMember) return;
    if (leaves.find(l => l.member === lMember && l.date === lDate)) return;
    setLeaves([...leaves, { member: lMember, date: lDate, type: lType }]);
  }

  function removeLeave(idx) {
    setLeaves(leaves.filter((_, i) => i !== idx));
  }

  // ── Calculate capacity ──
  function calculateCapacity() {
    const workingDays = getWorkingDays(sprintStart, sprintEnd);
    const totalDays = workingDays.length;

    return members.map(m => {
      const leaveDays = leaves.filter(l =>
        l.member === m.name && workingDays.includes(l.date)
      ).length;
      const availDays = Math.max(0, totalDays - leaveDays);
      const rawHours = availDays * m.hours;
      // Buffer % models meetings/overhead — it shaves a flat % off available hours.
      const bufferFactor = 1 - (Math.min(100, Math.max(0, bufferPct)) / 100);
      const availHours = Math.round(rawHours * bufferFactor * 10) / 10;
      const totalHours = totalDays * m.hours;
      const pct = totalHours > 0 ? Math.round((availHours / totalHours) * 100) : 0;
      return {
        name: m.name,
        role: m.role,
        totalDays,
        leaveDays,
        availDays,
        rawHours,
        availHours,
        availSP: hoursToSP(availHours, hoursPerSP),
        pct,
      };
    });
  }

  const results = members.length > 0 ? calculateCapacity() : [];
  const totalHours = results.reduce((s, r) => s + r.availHours, 0);
  const totalRawHours = results.reduce((s, r) => s + r.rawHours, 0);
  const totalSP = results.reduce((s, r) => s + r.availSP, 0);
  const avgPct = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.pct, 0) / results.length) : 0;
  const sprintDays = getWorkingDays(sprintStart, sprintEnd).length;

  // ── Render ──
  return (
    <div style={styles.wrap}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.headerTitle}>⚡ Sprint Capacity Planner</p>
          <p style={styles.headerSub}>Plan smarter. Commit confidently. Deliver consistently.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: saveError ? '#fc8181' : '#718096' }}>
            {!loaded ? 'Loading…' : saving ? 'Saving…' : saveError ? '⚠ Save failed' : 'Saved'}
          </span>
          <span style={styles.badge}>v2.0</span>
        </div>
      </div>

      {/* Sprint Config Bar */}
      <div style={styles.card}>
        <p style={styles.sectionHeader}>⚙️ Sprint Configuration</p>
        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Sprint Name</label>
            <input style={{ ...styles.input, width: '140px' }} value={sprintName} onChange={e => setSprintName(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Start Date</label>
            <input type="date" style={{ ...styles.input, width: '140px' }} value={sprintStart} onChange={e => setSprintStart(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>End Date</label>
            <input type="date" style={{ ...styles.input, width: '140px' }} value={sprintEnd} onChange={e => setSprintEnd(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Capacity Unit</label>
            <select style={styles.select} value={mode} onChange={e => setMode(e.target.value)}>
              <option>Hours</option>
              <option>Story Points</option>
              <option>Both</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Hrs/Day (default)</label>
            <input type="number" style={{ ...styles.input, width: '80px' }} min="1" max="8" value={hoursPerDay} onChange={e => setHoursPerDay(parseFloat(e.target.value))} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Hrs per SP</label>
            <input type="number" style={{ ...styles.input, width: '80px' }} min="1" max="16" value={hoursPerSP} onChange={e => setHoursPerSP(parseFloat(e.target.value))} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Buffer % (meetings/overhead)</label>
            <input type="number" style={{ ...styles.input, width: '80px' }} min="0" max="100" step="5" value={bufferPct} onChange={e => setBufferPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['team', 'leave', 'report'].map(t => (
          <button
            key={t}
            style={activeTab === t ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(t)}
          >
            {t === 'team' ? '👥 Team Setup' : t === 'leave' ? '🏖️ Leave Planner' : '📊 Capacity Report'}
          </button>
        ))}
      </div>

      {/* ── Tab: Team Setup ── */}
      {activeTab === 'team' && (
        <div>
          <p style={styles.sectionHeader}>Add team members</p>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name</label>
              <input style={{ ...styles.input, width: '160px' }} placeholder="e.g. Priya Sharma" value={mName} onChange={e => setMName(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Role</label>
              <input style={{ ...styles.input, width: '140px' }} placeholder="e.g. Backend Dev" value={mRole} onChange={e => setMRole(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Hours/day</label>
              <input type="number" style={{ ...styles.input, width: '80px' }} min="1" max="8" step="0.5" value={mHours} onChange={e => setMHours(e.target.value)} />
            </div>
            <button style={styles.btnPrimary} onClick={addMember}>+ Add Member</button>
          </div>

          {members.length === 0
            ? <div style={styles.infoBox}>No team members yet — add your first member above.</div>
            : (
              <div>
                <p style={styles.sectionHeader}>Team — {members.length} member{members.length !== 1 ? 's' : ''}</p>
                {members.map((m, i) => (
                  <div key={i} style={{ ...styles.card, ...styles.sideBySide }}>
                    <div>
                      <span style={styles.memberName}>{m.name}</span>
                      <span style={styles.memberRole}> · {m.role}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span style={styles.memberStat}><b style={{ color: '#e2e8f0' }}>{m.hours}h</b>/day</span>
                      <button style={styles.btnDanger} onClick={() => removeMember(m.name)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── Tab: Leave Planner ── */}
      {activeTab === 'leave' && (
        <div>
          {members.length === 0
            ? <div style={styles.infoBox}>Add team members first in the Team Setup tab.</div>
            : (
              <div>
                <p style={styles.sectionHeader}>Log leave & absences</p>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Team Member</label>
                    <select style={styles.select} value={lMember} onChange={e => setLMember(e.target.value)}>
                      <option value="">Select member</option>
                      {members.map((m, i) => <option key={i} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Date</label>
                    <input type="date" style={{ ...styles.input, width: '140px' }} value={lDate} onChange={e => setLDate(e.target.value)} />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Type</label>
                    <select style={styles.select} value={lType} onChange={e => setLType(e.target.value)}>
                      <option>Planned Leave</option>
                      <option>Public Holiday</option>
                      <option>Sick Leave</option>
                      <option>WFH (Reduced)</option>
                    </select>
                  </div>
                  <button style={styles.btnPrimary} onClick={addLeave}>+ Log Leave</button>
                </div>

                {leaves.length === 0
                  ? <div style={styles.infoBox}>No leave logged yet.</div>
                  : (
                    <div>
                      <p style={styles.sectionHeader}>Logged absences — {leaves.length} entr{leaves.length !== 1 ? 'ies' : 'y'}</p>
                      {[...leaves].sort((a, b) => a.date.localeCompare(b.date)).map((l, i) => {
                        const pillColor = l.type === 'Sick Leave'
                          ? { bg: '#742a2a', color: '#feb2b2' }
                          : l.type === 'Public Holiday'
                            ? { bg: '#22543d', color: '#9ae6b4' }
                            : { bg: '#744210', color: '#fbd38d' };
                        return (
                          <div key={i} style={{ ...styles.card, ...styles.sideBySide }}>
                            <div>
                              <span style={styles.memberName}>{l.member}</span>
                              <span style={styles.memberRole}> · {l.date}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ ...styles.pill, background: pillColor.bg, color: pillColor.color }}>{l.type}</span>
                              <button style={styles.btnDanger} onClick={() => removeLeave(i)}>✕</button>
                            </div>
                          </div>
                        );
                      })}
                      <button style={styles.btnSecondary} onClick={() => setLeaves([])}>🗑️ Clear all leave</button>
                    </div>
                  )
                }
              </div>
            )
          }
        </div>
      )}

      {/* ── Tab: Capacity Report ── */}
      {activeTab === 'report' && (
        <div>
          {members.length === 0
            ? <div style={styles.infoBox}>Add team members in the Team Setup tab to generate a report.</div>
            : sprintStart >= sprintEnd
              ? <div style={{ ...styles.infoBox, color: '#fc8181' }}>Sprint end date must be after start date.</div>
              : (
                <div>
                  <p style={styles.sectionHeader}>
                    📊 {sprintName} · {sprintStart} → {sprintEnd}
                  </p>

                  {/* Metrics */}
                  <div style={styles.metricGrid}>
                    <div style={styles.metricCard}>
                      <p style={{ ...styles.metricValue, color: '#63b3ed' }}>{sprintDays}</p>
                      <p style={styles.metricLabel}>Working Days</p>
                    </div>
                    <div style={styles.metricCard}>
                      <p style={{ ...styles.metricValue, color: '#63b3ed' }}>{members.length}</p>
                      <p style={styles.metricLabel}>Team Members</p>
                    </div>
                    <div style={styles.metricCard}>
                      <p style={{ ...styles.metricValue, color: capacityColor(avgPct) }}>
                        {mode === 'Story Points' ? `${totalSP} SP` : `${totalHours}h`}
                      </p>
                      <p style={styles.metricLabel}>Available {mode === 'Story Points' ? 'Story Points' : 'Hours'}</p>
                    </div>
                    <div style={styles.metricCard}>
                      <p style={{ ...styles.metricValue, color: capacityColor(avgPct) }}>{avgPct}%</p>
                      <p style={styles.metricLabel}>Avg Capacity</p>
                    </div>
                  </div>

                  {/* Summary bar for Both mode */}
                  {mode === 'Both' && (
                    <div style={styles.summaryBar}>
                      <span style={styles.summaryItem}>Total available: <b style={{ color: '#68d391' }}>{totalHours}h</b></span>
                      <span style={styles.summaryItem}>Equivalent: <b style={{ color: '#63b3ed' }}>{totalSP} story points</b></span>
                      <span style={styles.summaryItem}>Conversion: <b style={{ color: '#e2e8f0' }}>{hoursPerSP}h per SP</b></span>
                    </div>
                  )}

                  {/* Buffer applied note */}
                  {bufferPct > 0 && (
                    <div style={{ ...styles.summaryBar, borderLeft: '4px solid #805ad5' }}>
                      <span style={styles.summaryItem}>
                        Buffer applied: <b style={{ color: '#b794f4' }}>{bufferPct}%</b> for meetings/overhead
                      </span>
                      <span style={styles.summaryItem}>
                        Before buffer: <b style={{ color: '#a0aec0' }}>{Math.round(totalRawHours * 10) / 10}h</b> → after: <b style={{ color: '#68d391' }}>{Math.round(totalHours * 10) / 10}h</b>
                      </span>
                    </div>
                  )}

                  {/* Per-member breakdown */}
                  <p style={styles.sectionHeader}>Per-member breakdown</p>
                  {[...results].sort((a, b) => a.pct - b.pct).map((r, i) => {
                    const pill = capacityPill(r.pct);
                    const color = capacityColor(r.pct);
                    const valStr = mode === 'Hours'
                      ? `${r.availHours}h available`
                      : mode === 'Story Points'
                        ? `${r.availSP} SP available`
                        : `${r.availHours}h · ${r.availSP} SP`;
                    return (
                      <div key={i} style={styles.card}>
                        <div style={styles.sideBySide}>
                          <div>
                            <span style={styles.memberName}>{r.name}</span>
                            <span style={styles.memberRole}> · {r.role}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={styles.memberStat}>{valStr} · <b style={{ color: '#e2e8f0' }}>{r.leaveDays}d leave</b></span>
                            <span style={{ ...styles.pill, background: pill.bg, color: pill.color }}>{pill.label}</span>
                          </div>
                        </div>
                        <div style={styles.barBg}>
                          <div style={{ height: '8px', borderRadius: '6px', width: `${r.pct}%`, background: color }} />
                        </div>
                        <span style={{ fontSize: '11px', color: '#718096' }}>
                          {r.pct}% capacity · {r.availDays} of {r.totalDays} working days
                        </span>
                      </div>
                    );
                  })}

                  {/* Risk callout */}
                  {results.some(r => r.pct < 50) && (
                    <div style={{ background: '#2d1b1b', border: '1px solid #742a2a', borderLeft: '4px solid #fc8181', borderRadius: '8px', padding: '14px 18px', marginTop: '12px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#fc8181', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '.06em' }}>⚠️ Capacity Risk</p>
                      <p style={{ fontSize: '13px', color: '#fed7d7', margin: 0 }}>
                        {results.filter(r => r.pct < 50).map(r => r.name).join(', ')} {results.filter(r => r.pct < 50).length === 1 ? 'is' : 'are'} below 50% capacity this sprint. Review story assignments before sprint planning.
                      </p>
                    </div>
                  )}
                </div>
              )
          }
        </div>
      )}
    </div>
  );
}
