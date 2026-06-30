import React, { useState, useEffect, useRef } from 'react';
import { invoke, view } from '@forge/bridge';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri (0 = Sun … 6 = Sat)
const WEEKDAYS = [
  { d: 1, label: 'Mon' }, { d: 2, label: 'Tue' }, { d: 3, label: 'Wed' },
  { d: 4, label: 'Thu' }, { d: 5, label: 'Fri' }, { d: 6, label: 'Sat' }, { d: 0, label: 'Sun' },
];

// Working days = days within [start,end] whose weekday is in workDays and which
// are not org holidays.
function getWorkingDays(start, end, workDays, holidays) {
  const wd = (workDays && workDays.length) ? workDays : DEFAULT_WORK_DAYS;
  const hol = new Set(holidays || []);
  const days = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    const iso = current.toISOString().split('T')[0];
    if (wd.includes(current.getDay()) && !hol.has(iso)) {
      days.push(iso);
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

  // Work week & org holidays
  const [workDays, setWorkDays] = useState(DEFAULT_WORK_DAYS);
  const [holidays, setHolidays] = useState([]); // ['YYYY-MM-DD', ...]
  const [hDate, setHDate] = useState(today());

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

  // Persistence (history persisted now, no UI yet)
  const [bufferPct, setBufferPct] = useState(0);
  const [bufferInput, setBufferInput] = useState('0'); // string mirror for clean display
  const [history, setHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const projectIdRef = useRef(null);
  const projectKeyRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Jira integration state
  const [jiraSprints, setJiraSprints] = useState([]);
  const [jiraUsers, setJiraUsers] = useState([]);
  const [committed, setCommitted] = useState(null); // { totalSP, issueCount, sprintName }
  const [jiraBusy, setJiraBusy] = useState(''); // '', 'sprints', 'users', 'committed'
  const [jiraError, setJiraError] = useState('');
  const [selectedSprint, setSelectedSprint] = useState(null); // { id, name }

  // ── Load on mount ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let projectId;
      try {
        const ctx = await view.getContext();
        projectId = ctx?.extension?.project?.id;
        projectKeyRef.current = ctx?.extension?.project?.key ?? null;
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
          if (Array.isArray(c.workDays) && c.workDays.length) setWorkDays(c.workDays);
          if (Array.isArray(c.holidays)) setHolidays(c.holidays);
          if (c.selectedSprint?.id) setSelectedSprint(c.selectedSprint);
        }
        setMembers(Array.isArray(data?.members) ? data.members : []);
        setLeaves(Array.isArray(data?.leaves) ? data.leaves : []);
        const loadedBuffer = typeof data?.bufferPct === 'number' ? data.bufferPct : 0;
        setBufferPct(loadedBuffer);
        setBufferInput(String(loadedBuffer));
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
          config: { sprintName, sprintStart, sprintEnd, mode, hoursPerDay, hoursPerSP, workDays, holidays, selectedSprint },
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
  }, [loaded, sprintName, sprintStart, sprintEnd, mode, hoursPerDay, hoursPerSP, members, leaves, bufferPct, workDays, holidays, selectedSprint]);

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

  // ── Work week & holidays ──
  function toggleWorkDay(d) {
    setWorkDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function addHoliday() {
    if (!hDate) return;
    if (holidays.includes(hDate)) return;
    setHolidays([...holidays, hDate].sort());
  }

  function removeHoliday(date) {
    setHolidays(holidays.filter((d) => d !== date));
  }

  // ── Calculate capacity ──
  function calculateCapacity() {
    const workingDays = getWorkingDays(sprintStart, sprintEnd, workDays, holidays);
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
        accountId: m.accountId,
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
  const sprintDays = getWorkingDays(sprintStart, sprintEnd, workDays, holidays).length;

  // ── Sprint history ──
  async function saveSnapshotNow() {
    if (members.length === 0) return;
    setSavingSnapshot(true);
    const snapshot = {
      config: { sprintName, sprintStart, sprintEnd, mode, hoursPerDay, hoursPerSP, workDays, holidays, selectedSprint },
      members,
      leaves,
      bufferPct,
      summary: {
        sprintName,
        sprintStart,
        sprintEnd,
        mode,
        bufferPct,
        memberCount: members.length,
        sprintDays,
        totalHours: Math.round(totalHours * 10) / 10,
        totalSP: Math.round(totalSP * 10) / 10,
        avgPct,
      },
    };
    try {
      const res = await invoke('saveSnapshot', { projectId: projectIdRef.current, snapshot });
      if (Array.isArray(res?.history)) setHistory(res.history);
    } catch (e) {
      console.error('saveSnapshot failed:', e);
    } finally {
      setSavingSnapshot(false);
    }
  }

  function restoreSnapshot(snap) {
    const c = snap?.config;
    if (c) {
      if (c.sprintName != null) setSprintName(c.sprintName);
      if (c.sprintStart != null) setSprintStart(c.sprintStart);
      if (c.sprintEnd != null) setSprintEnd(c.sprintEnd);
      if (c.mode != null) setMode(c.mode);
      if (c.hoursPerDay != null) setHoursPerDay(c.hoursPerDay);
      if (c.hoursPerSP != null) setHoursPerSP(c.hoursPerSP);
      if (Array.isArray(c.workDays) && c.workDays.length) setWorkDays(c.workDays);
      if (Array.isArray(c.holidays)) setHolidays(c.holidays);
      setSelectedSprint(c.selectedSprint?.id ? c.selectedSprint : null);
    }
    setMembers(Array.isArray(snap?.members) ? snap.members : []);
    setLeaves(Array.isArray(snap?.leaves) ? snap.leaves : []);
    const b = typeof snap?.bufferPct === 'number' ? snap.bufferPct : 0;
    setBufferPct(b);
    setBufferInput(String(b));
    setActiveTab('report');
  }

  async function removeSnapshot(id) {
    try {
      const res = await invoke('deleteSnapshot', { projectId: projectIdRef.current, id });
      if (Array.isArray(res?.history)) setHistory(res.history);
    } catch (e) {
      console.error('deleteSnapshot failed:', e);
    }
  }

  // ── PDF export ──
  function exportPDF() {
    if (members.length === 0) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 40;
    let y = 48;

    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Sprint Capacity Report', marginX, y);

    y += 22;
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    doc.text(`${sprintName}   |   ${sprintStart}  ->  ${sprintEnd}`, marginX, y);
    y += 16;
    doc.setFontSize(9);
    doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y);

    // Summary line
    y += 22;
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const summaryLine =
      `Working days: ${sprintDays}    Members: ${members.length}    ` +
      `Available: ${Math.round(totalHours * 10) / 10}h / ${Math.round(totalSP * 10) / 10} SP    ` +
      `Avg capacity: ${avgPct}%` +
      (bufferPct > 0 ? `    Buffer: ${bufferPct}%` : '');
    doc.text(summaryLine, marginX, y);

    // Per-member table
    autoTable(doc, {
      startY: y + 14,
      head: [['Name', 'Role', 'Working days', 'Leave', 'Hours', 'SP', 'Capacity']],
      body: [...results]
        .sort((a, b) => a.pct - b.pct)
        .map((r) => [
          r.name,
          r.role || '-',
          `${r.availDays}/${r.totalDays}`,
          `${r.leaveDays}d`,
          `${r.availHours}h`,
          `${r.availSP}`,
          `${r.pct}%`,
        ]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [85, 60, 154], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 243, 250] },
      margin: { left: marginX, right: marginX },
    });

    // Risk note
    const atRisk = results.filter((r) => r.pct < 50);
    if (atRisk.length > 0) {
      const afterTable = (doc.lastAutoTable?.finalY ?? y) + 24;
      doc.setFontSize(10);
      doc.setTextColor(180, 40, 40);
      doc.text(
        `Capacity risk: ${atRisk.map((r) => r.name).join(', ')} ${atRisk.length === 1 ? 'is' : 'are'} below 50% capacity.`,
        marginX,
        afterTable,
      );
    }

    // Capacity chart (bars drawn natively — jsPDF can't capture HTML)
    const showCommitted = committed && committed.hasSP;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const col = { green: [104, 211, 145], blue: [66, 153, 225], red: [252, 129, 129], track: [226, 232, 240] };
    const chartRows = [...results]
      .map((r) => { const cm = committedForMember(r); return { r, comm: cm ? cm.sp : 0 }; })
      .sort((a, b) => b.r.availSP - a.r.availSP);
    const chartMax = Math.max(1, ...chartRows.map((x) => x.r.availSP), ...chartRows.map((x) => x.comm));
    const barX = marginX + 110;
    const barW = pageW - marginX - barX - 64;
    const barH = 7;

    let cy = (doc.lastAutoTable?.finalY ?? y) + (atRisk.length > 0 ? 46 : 30);
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text(showCommitted ? 'Capacity vs Commitment by member (SP)' : 'Capacity by member (SP)', marginX, cy);
    cy += 16;

    for (const { r, comm } of chartRows) {
      if (cy > pageH - 70) { doc.addPage(); cy = 48; }
      const over = comm > r.availSP;
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      doc.text(r.name.length > 18 ? `${r.name.slice(0, 17)}…` : r.name, marginX, cy + barH);
      // Available bar
      doc.setFillColor(col.track[0], col.track[1], col.track[2]);
      doc.rect(barX, cy, barW, barH, 'F');
      doc.setFillColor(col.green[0], col.green[1], col.green[2]);
      doc.rect(barX, cy, barW * (r.availSP / chartMax), barH, 'F');
      // Committed bar
      if (showCommitted) {
        const c = over ? col.red : col.blue;
        doc.setFillColor(col.track[0], col.track[1], col.track[2]);
        doc.rect(barX, cy + barH + 2, barW, barH, 'F');
        doc.setFillColor(c[0], c[1], c[2]);
        doc.rect(barX, cy + barH + 2, barW * Math.min(1, comm / chartMax), barH, 'F');
      }
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      doc.text(showCommitted ? `${r.availSP} / ${comm} SP` : `${r.availSP} SP`, barX + barW + 6, cy + barH + (showCommitted ? 4 : 0));
      cy += showCommitted ? barH * 2 + 12 : barH + 12;
    }

    // Legend
    doc.setFontSize(8);
    let lx = marginX;
    const legendY = cy + 4;
    const swatch = (x, c, label) => {
      doc.setFillColor(c[0], c[1], c[2]);
      doc.rect(x, legendY - 6, 8, 8, 'F');
      doc.setTextColor(90, 90, 90);
      doc.text(label, x + 11, legendY);
      return x + 11 + doc.getTextWidth(label) + 14;
    };
    lx = swatch(lx, col.green, 'Available');
    if (showCommitted) { lx = swatch(lx, col.blue, 'Committed'); lx = swatch(lx, col.red, 'Over-committed'); }

    const safeName = (sprintName || 'sprint').replace(/[^a-z0-9\-_]+/gi, '-');
    // Timestamp keeps each export unique so a re-export can't collide with an
    // already-open PDF of the same name.
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    doc.save(`${safeName}-capacity-report-${stamp}.pdf`);
  }

  // ── Jira integration (via resolver, asApp) ──
  function projectRef() {
    return projectKeyRef.current || projectIdRef.current;
  }

  async function importSprints() {
    setJiraBusy('sprints'); setJiraError('');
    try {
      const res = await invoke('jiraSprints', { projectIdOrKey: projectRef() });
      const sprints = res?.sprints ?? [];
      setJiraSprints(sprints);
      if (sprints.length === 0) {
        const msgByReason = {
          'no-board': 'No board found for this project.',
          'no-scrum-board': 'This project has no Scrum board, so there are no sprints to import. (Kanban boards do not have sprints.)',
          'no-sprints': 'No active or future sprints on this project’s Scrum board.',
        };
        setJiraError(msgByReason[res?.reason] || 'No sprints available to import.');
      }
    } catch (e) {
      console.error(e); setJiraError(e.message || 'Failed to load sprints.');
    } finally {
      setJiraBusy('');
    }
  }

  function applySprint(sprint) {
    if (sprint.name) setSprintName(sprint.name);
    if (sprint.startDate) setSprintStart(sprint.startDate.split('T')[0]);
    if (sprint.endDate) setSprintEnd(sprint.endDate.split('T')[0]);
    setSelectedSprint({ id: sprint.id, name: sprint.name });
    setCommitted(null);
    setJiraSprints([]);
  }

  async function importUsers() {
    if (!selectedSprint) {
      setJiraError('Link a Jira sprint first (Sprint Configuration → Import sprint from Jira) to import its assignees.');
      return;
    }
    setJiraBusy('users'); setJiraError('');
    try {
      const res = await invoke('jiraUsers', { sprintId: selectedSprint.id });
      const users = res?.users ?? [];
      setJiraUsers(users);
      if (users.length === 0) {
        setJiraError(res?.reason === 'no-sprint'
          ? 'Link a Jira sprint first to import its assignees.'
          : 'No assignees found on this sprint’s issues yet.');
      }
    } catch (e) {
      console.error(e); setJiraError(e.message || 'Failed to load assignees.');
    } finally {
      setJiraBusy('');
    }
  }

  function addJiraUser(u) {
    const name = u.displayName?.trim();
    if (!name || members.find((m) => m.name === name)) return;
    setMembers([...members, { name, role: '', hours: hoursPerDay, accountId: u.accountId }]);
  }

  // Sum committed story points for the selected sprint.
  async function loadCommitted() {
    if (!selectedSprint) return;
    setJiraBusy('committed'); setJiraError('');
    try {
      const res = await invoke('jiraCommitted', { sprintId: selectedSprint.id });
      if (res?.committed) {
        setCommitted({ ...res.committed, sprintName: selectedSprint.name });
      }
    } catch (e) {
      console.error(e); setJiraError(e.message || 'Failed to load sprint issues.');
    } finally {
      setJiraBusy('');
    }
  }

  // Match a team member to their committed record (by Jira accountId, else name).
  function committedForMember(member) {
    const list = committed?.byAssignee;
    if (!list) return null;
    if (member.accountId) {
      const byId = list.find((x) => x.accountId && x.accountId === member.accountId);
      if (byId) return byId;
    }
    const lc = member.name.toLowerCase();
    const first = lc.split(/\s+/)[0];
    return list.find((x) => {
      const dn = (x.displayName || '').toLowerCase();
      return dn === lc || lc.includes(dn) || (first.length >= 3 && dn.includes(first));
    }) || null;
  }

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
            <input
              type="number"
              style={{ ...styles.input, width: '80px' }}
              min="0"
              max="100"
              step="5"
              value={bufferInput}
              onChange={e => {
                const clamped = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                setBufferPct(clamped);
                // Show the canonical number (drops leading zeros), but keep '' while clearing.
                setBufferInput(e.target.value === '' ? '' : String(clamped));
              }}
              onBlur={() => setBufferInput(String(bufferPct))}
            />
          </div>
        </div>

        {/* Jira sprint import */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
          <button style={styles.btnSecondary} onClick={importSprints} disabled={jiraBusy === 'sprints'}>
            {jiraBusy === 'sprints' ? 'Loading…' : '⟳ Import sprint from Jira'}
          </button>
          {selectedSprint && (
            <span style={{ fontSize: '12px', color: '#9ae6b4' }}>Linked to Jira sprint: <b>{selectedSprint.name}</b></span>
          )}
          {jiraSprints.length > 0 && (
            <select
              style={styles.select}
              defaultValue=""
              onChange={(e) => {
                const s = jiraSprints.find((x) => String(x.id) === e.target.value);
                if (s) applySprint(s);
              }}
            >
              <option value="" disabled>Select a sprint…</option>
              {jiraSprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.state ? ` (${s.state})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Work Week & Holidays */}
      <div style={styles.card}>
        <p style={styles.sectionHeader}>📆 Work Week & Holidays</p>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <label style={{ ...styles.label, display: 'block', marginBottom: '8px' }}>Working days</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {WEEKDAYS.map(({ d, label }) => {
                const on = workDays.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleWorkDay(d)}
                    style={{
                      padding: '6px 12px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      borderRadius: '6px', border: `1px solid ${on ? '#805ad5' : '#4a5568'}`,
                      background: on ? '#553c9a' : 'transparent', color: on ? '#fff' : '#718096',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ flex: '1 1 320px', minWidth: '280px' }}>
            <label style={{ ...styles.label, display: 'block', marginBottom: '8px' }}>Company holidays (apply to everyone)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
              <input type="date" style={{ ...styles.input, width: '150px' }} value={hDate} onChange={(e) => setHDate(e.target.value)} />
              <button style={styles.btnSecondary} onClick={addHoliday}>+ Add holiday</button>
            </div>
            {holidays.length === 0
              ? <span style={{ fontSize: '12px', color: '#718096' }}>No holidays added.</span>
              : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {holidays.map((d) => (
                    <span key={d} style={{ ...styles.pill, background: '#2d3748', color: '#e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {d}
                      <span onClick={() => removeHoliday(d)} style={{ cursor: 'pointer', color: '#fc8181', fontWeight: '700' }}>✕</span>
                    </span>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </div>

      {/* Jira error banner */}
      {jiraError && (
        <div style={{ ...styles.infoBox, color: '#fc8181', borderColor: '#742a2a', marginBottom: '16px' }}>
          Jira: {jiraError}
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {['team', 'leave', 'report', 'history'].map(t => (
          <button
            key={t}
            style={activeTab === t ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(t)}
          >
            {t === 'team' ? '👥 Team Setup' : t === 'leave' ? '🏖️ Leave Planner' : t === 'report' ? '📊 Capacity Report' : `📜 History${history.length ? ` (${history.length})` : ''}`}
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
            <button style={styles.btnSecondary} onClick={importUsers} disabled={jiraBusy === 'users'}>
              {jiraBusy === 'users' ? 'Loading…' : '⟳ Import assignees from Jira'}
            </button>
          </div>

          {jiraUsers.length > 0 && (
            <div style={{ ...styles.card, marginBottom: '16px' }}>
              <div style={styles.sideBySide}>
                <p style={{ ...styles.sectionHeader, border: 'none', margin: 0, padding: 0 }}>Sprint assignees — click to add</p>
                <button style={styles.btnDanger} onClick={() => setJiraUsers([])}>✕ Close</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {jiraUsers.map((u) => {
                  const added = members.find((m) => m.name === u.displayName?.trim());
                  return (
                    <button
                      key={u.accountId}
                      style={{ ...styles.btnSecondary, opacity: added ? 0.5 : 1 }}
                      onClick={() => addJiraUser(u)}
                      disabled={!!added}
                    >
                      {added ? '✓ ' : '+ '}{u.displayName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  <div style={{ ...styles.sideBySide, marginBottom: '16px' }}>
                    <p style={{ ...styles.sectionHeader, border: 'none', margin: 0, padding: 0 }}>
                      📊 {sprintName} · {sprintStart} → {sprintEnd}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={styles.btnSecondary} onClick={saveSnapshotNow} disabled={savingSnapshot}>
                        {savingSnapshot ? 'Saving…' : '📜 Save to history'}
                      </button>
                      <button style={styles.btnPrimary} onClick={exportPDF}>⬇ Export PDF</button>
                    </div>
                  </div>

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

                  {/* Committed vs available (Jira) */}
                  {selectedSprint && (
                    <div style={{ ...styles.summaryBar, borderLeft: '4px solid #4299e1', alignItems: 'center' }}>
                      {!committed ? (
                        <>
                          <span style={styles.summaryItem}>
                            Compare against the committed work in Jira sprint <b style={{ color: '#90cdf4' }}>{selectedSprint.name}</b>
                          </span>
                          <button style={styles.btnSecondary} onClick={loadCommitted} disabled={jiraBusy === 'committed'}>
                            {jiraBusy === 'committed' ? 'Loading…' : '⟳ Load Jira commitment'}
                          </button>
                        </>
                      ) : (() => {
                        const diff = Math.round((totalSP - committed.totalSP) * 10) / 10;
                        const over = diff < 0;
                        return (
                          <>
                            <span style={styles.summaryItem}>
                              Committed in Jira: <b style={{ color: '#90cdf4' }}>{committed.hasSP ? `${committed.totalSP} SP` : 'n/a'}</b> across <b style={{ color: '#e2e8f0' }}>{committed.issueCount}</b> issues
                            </span>
                            <span style={styles.summaryItem}>
                              Available (computed): <b style={{ color: '#68d391' }}>{Math.round(totalSP * 10) / 10} SP</b>
                            </span>
                            {committed.hasSP && (
                              <span style={styles.summaryItem}>
                                {over
                                  ? <b style={{ color: '#fc8181' }}>Over-committed by {Math.abs(diff)} SP</b>
                                  : <b style={{ color: '#68d391' }}>{diff} SP headroom</b>}
                              </span>
                            )}
                            <button style={styles.btnDanger} onClick={() => setCommitted(null)}>↻ Refresh</button>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Capacity chart */}
                  <p style={styles.sectionHeader}>
                    📊 Capacity {committed && committed.hasSP ? 'vs Commitment ' : ''}by member (SP)
                  </p>
                  {(() => {
                    const rows = results.map((r) => {
                      const cm = committedForMember(r);
                      return { r, comm: cm ? cm.sp : 0 };
                    });
                    const chartMax = Math.max(1, ...rows.map((x) => x.r.availSP), ...rows.map((x) => x.comm));
                    const showCommitted = committed && committed.hasSP;
                    const sorted = [...rows].sort((a, b) => b.r.availSP - a.r.availSP);
                    return (
                      <div style={{ ...styles.card, marginBottom: '16px' }}>
                        {sorted.map(({ r, comm }, i) => {
                          const over = comm > r.availSP;
                          return (
                            <div key={r.name} style={{ marginBottom: i === sorted.length - 1 ? 0 : '14px' }}>
                              <div style={{ ...styles.sideBySide, marginBottom: '4px' }}>
                                <span style={styles.memberStat}><b style={{ color: '#e2e8f0' }}>{r.name}</b></span>
                                <span style={{ fontSize: '11px', color: '#718096' }}>
                                  {r.availSP} SP avail
                                  {showCommitted && <> · <span style={{ color: over ? '#fc8181' : '#90cdf4' }}>{comm} SP committed</span></>}
                                </span>
                              </div>
                              <div style={{ ...styles.barBg, height: '10px', margin: '0 0 3px' }}>
                                <div style={{ height: '10px', borderRadius: '6px', width: `${Math.round((r.availSP / chartMax) * 100)}%`, background: capacityColor(r.pct) }} />
                              </div>
                              {showCommitted && (
                                <div style={{ ...styles.barBg, height: '10px', margin: 0 }}>
                                  <div style={{ height: '10px', borderRadius: '6px', width: `${Math.round((comm / chartMax) * 100)}%`, background: over ? '#fc8181' : '#4299e1' }} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11px', color: '#718096', flexWrap: 'wrap' }}>
                          <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#68d391', borderRadius: '2px', marginRight: '5px' }} />Available</span>
                          {showCommitted && <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#4299e1', borderRadius: '2px', marginRight: '5px' }} />Committed</span>}
                          {showCommitted && <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#fc8181', borderRadius: '2px', marginRight: '5px' }} />Over-committed</span>}
                        </div>
                      </div>
                    );
                  })()}

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
                          {committed && committed.hasSP && (() => {
                            const cm = committedForMember(r);
                            const cSP = cm ? cm.sp : 0;
                            const d = Math.round((r.availSP - cSP) * 10) / 10;
                            return (
                              <>
                                {'  ·  '}Committed in Jira: <b style={{ color: '#90cdf4' }}>{cSP} SP</b>{' '}
                                {d < 0
                                  ? <b style={{ color: '#fc8181' }}>(over by {Math.abs(d)} SP)</b>
                                  : <b style={{ color: '#68d391' }}>({d} SP free)</b>}
                              </>
                            );
                          })()}
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

      {/* ── Tab: History ── */}
      {activeTab === 'history' && (
        <div>
          <div style={{ ...styles.sideBySide, marginBottom: '16px' }}>
            <p style={{ ...styles.sectionHeader, border: 'none', margin: 0, padding: 0 }}>
              Saved sprint snapshots
            </p>
            <button style={styles.btnPrimary} onClick={saveSnapshotNow} disabled={savingSnapshot || members.length === 0}>
              {savingSnapshot ? 'Saving…' : '📸 Snapshot current sprint'}
            </button>
          </div>

          {history.length === 0
            ? <div style={styles.infoBox}>No snapshots yet — capture the current sprint with “Snapshot current sprint”.</div>
            : history.map((snap) => {
              const s = snap.summary || {};
              const when = snap.savedAt ? new Date(snap.savedAt).toLocaleString() : '';
              const pill = capacityPill(s.avgPct ?? 0);
              return (
                <div key={snap.id} style={styles.card}>
                  <div style={styles.sideBySide}>
                    <div>
                      <span style={styles.memberName}>{s.sprintName || 'Sprint'}</span>
                      <span style={styles.memberRole}> · {s.sprintStart} → {s.sprintEnd}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#718096' }}>Saved {when}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', margin: '10px 0' }}>
                    <span style={styles.memberStat}>{s.memberCount ?? 0} members</span>
                    <span style={styles.memberStat}>{s.sprintDays ?? 0} working days</span>
                    <span style={styles.memberStat}><b style={{ color: '#68d391' }}>{s.totalHours ?? 0}h</b> · <b style={{ color: '#63b3ed' }}>{s.totalSP ?? 0} SP</b></span>
                    {s.bufferPct ? <span style={styles.memberStat}>{s.bufferPct}% buffer</span> : null}
                    <span style={{ ...styles.pill, background: pill.bg, color: pill.color }}>{s.avgPct ?? 0}% · {pill.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={styles.btnSecondary} onClick={() => restoreSnapshot(snap)}>↩ Restore</button>
                    <button style={styles.btnDanger} onClick={() => removeSnapshot(snap.id)}>✕ Delete</button>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}
    </div>
  );
}
