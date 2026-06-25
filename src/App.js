import { useEffect, useMemo, useState } from "react";

function App() {
  const [teams, setTeams] = useState([]);
  const [screen, setScreen] = useState("intro");
  const [fade, setFade] = useState(false);

  const [left, setLeft] = useState(0);
  const [right, setRight] = useState(1);

  const [leftStatsMode, setLeftStatsMode] = useState("worldcup");
  const [rightStatsMode, setRightStatsMode] = useState("worldcup");
  const [leftOverMode, setLeftOverMode] = useState("worldcup");
  const [rightOverMode, setRightOverMode] = useState("worldcup");

  const [leftOverType, setLeftOverType] = useState("match");
  const [rightOverType, setRightOverType] = useState("match");

  const [leftTableVenue, setLeftTableVenue] = useState("total");
  const [rightTableVenue, setRightTableVenue] = useState("total");

  const [performanceMode, setPerformanceMode] = useState("worldcup");
  const [performancePeriod, setPerformancePeriod] = useState("full");

  const [leftAll, setLeftAll] = useState([]);
  const [rightAll, setRightAll] = useState([]);
  const [leftWorldCup, setLeftWorldCup] = useState([]);
  const [rightWorldCup, setRightWorldCup] = useState([]);

  useEffect(() => {
    fetch("https://worldcup-4lox.onrender.com/teams")
      .then((r) => r.json())
      .then((data) => {
        const clean = Array.isArray(data)
          ? data.map((t) => ({
              id: t.id,
              name: t.shortName || t.name,
              logo: t.crest,
            }))
          : [];

        setTeams(clean);
      })
      .catch(() => setTeams([]));
  }, []);

  const L = teams[left];
  const R = teams[right];

  const loadData = async () => {
    if (!L || !R) return;

    const [la, ra, lw, rw] = await Promise.all([
      fetch(`https://worldcup-4lox.onrender.com/team/${L.id}`).then((r) => r.json()),
      fetch(`https://worldcup-4lox.onrender.com/team/${R.id}`).then((r) => r.json()),
      fetch(`https://worldcup-4lox.onrender.com/worldcup/${L.id}`).then((r) => r.json()),
      fetch(`https://worldcup-4lox.onrender.com/worldcup/${R.id}`).then((r) => r.json()),
    ]);

    setLeftAll(Array.isArray(la) ? la : []);
    setRightAll(Array.isArray(ra) ? ra : []);
    setLeftWorldCup(Array.isArray(lw) ? lw : []);
    setRightWorldCup(Array.isArray(rw) ? rw : []);
    setScreen("analysis");
  };

  const cleanMatches = (matches) =>
    matches
      .filter((m) => m.status === "FINISHED")
      .filter((m) => m.score.fullTime.home !== null && m.score.fullTime.away !== null)
      .sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));

  const chooseBase = (all, worldcup, mode) => {
    if (mode === "worldcup") return cleanMatches(worldcup);
    if (mode === "last5") return cleanMatches(worldcup).slice(0, 5);
    return cleanMatches(all);
  };

  const getVenueMatchesForMode = (all, worldcup, mode, teamId, venue) => {
    const base = chooseBase(all, worldcup, mode);
    const venueFiltered = base.filter((m) => {
      if (venue === "local") return m.homeTeam.id === teamId;
      if (venue === "visita") return m.awayTeam.id === teamId;
      return m.homeTeam.id === teamId || m.awayTeam.id === teamId;
    });
    return mode === "last5" ? venueFiltered.slice(0, 5) : venueFiltered;
  };

  const splitByVenue = (matches, id, mode) => {
    const general = matches;
    const local = matches.filter((m) => m.homeTeam.id === id);
    const visita = matches.filter((m) => m.awayTeam.id === id);

    if (mode === "last5") {
      return {
        general: general.slice(0, 5),
        local: local.slice(0, 5),
        visita: visita.slice(0, 5),
      };
    }

    return { general, local, visita };
  };

  const getResult = (m, teamId) => {
    const home = m.homeTeam.id === teamId;
    const gf = home ? m.score.fullTime.home : m.score.fullTime.away;
    const ga = home ? m.score.fullTime.away : m.score.fullTime.home;

    if (gf > ga) return "V";
    if (gf === ga) return "E";
    return "D";
  };

  const getResultColor = (m, teamId) => {
    const result = getResult(m, teamId);
    if (result === "V") return "#15803d";
    if (result === "D") return "#dc2626";
    return "#b45309";
  };

  const calc = (matches, teamId) => {
    let total = 0;
    let wins = 0;
    let gf = 0;
    let ga = 0;
    let btts = 0;
    let clean = 0;
    let firstHalf = 0;

    matches.forEach((m) => {
      const home = m.homeTeam.id === teamId;
      const f = home ? m.score.fullTime.home : m.score.fullTime.away;
      const c = home ? m.score.fullTime.away : m.score.fullTime.home;
      const ht = home ? m.score.halfTime.home : m.score.halfTime.away;

      total++;
      if (f > c) wins++;
      if (f > 0 && c > 0) btts++;
      if (c === 0) clean++;

      gf += f;
      ga += c;
      firstHalf += ht || 0;
    });

    const pct = (n) => (total ? ((n / total) * 100).toFixed(1) + "%" : "0.0%");
    const avg = (n) => (total ? (n / total).toFixed(2) : "0.00");

    return {
      win: pct(wins),
      gf: avg(gf),
      ga: avg(ga),
      totalGoals: avg(gf + ga),
      btts: pct(btts),
      clean: pct(clean),
      firstHalf: avg(firstHalf),
    };
  };

  const calcOvers = (matches, teamId, type) => {
    let total = 0;
    let over05 = 0;
    let over15 = 0;
    let over25 = 0;
    let over35 = 0;

    matches.forEach((m) => {
      const home = m.homeTeam.id === teamId;
      const teamGoals = home ? m.score.fullTime.home : m.score.fullTime.away;
      const matchGoals = m.score.fullTime.home + m.score.fullTime.away;
      const goals = type === "team" ? teamGoals : matchGoals;

      total++;
      if (goals > 0.5) over05++;
      if (goals > 1.5) over15++;
      if (goals > 2.5) over25++;
      if (goals > 3.5) over35++;
    });

    const pct = (n) => (total ? ((n / total) * 100).toFixed(1) + "%" : "0.0%");

    return {
      over05: pct(over05),
      over15: pct(over15),
      over25: pct(over25),
      over35: pct(over35),
    };
  };

  const getStatStyle = (label, value) => {
    const n = parseFloat(value);

    if (Number.isNaN(n)) {
      return { ...styles.cell, background: "#f5f1f7", color: "#6d536f" };
    }

    let background = "#f5f1f7";
    let color = "#5f4965";

    const green = () => {
      background = "#d9fbe8";
      color = "#047857";
    };

    const red = () => {
      background = "#ffe1e1";
      color = "#b91c1c";
    };

    if (label === "% Ganar") {
      if (n >= 60) green();
      else if (n <= 30) red();
    }

    if (label === "Goles a favor") {
      if (n >= 2) green();
      else if (n <= 1) red();
    }

    if (label === "Goles en contra") {
      if (n >= 2) red();
      else if (n <= 1) green();
    }

    if (label === "Goles totales") {
      if (n >= 3) green();
      else if (n <= 2) red();
    }

    if (label === "BTTS") {
      if (n >= 60) green();
      else if (n <= 30) red();
    }

    if (label === "Portería a 0") {
      if (n >= 50) green();
      else if (n <= 20) red();
    }

    if (label === "Goles 1er tiempo") {
      if (n >= 1) green();
      else if (n <= 0.3) red();
    }

    return { ...styles.cell, background, color };
  };

  const Row = ({ label, a, b, c }) => (
    <tr>
      <td style={styles.label}>{label}</td>
      <td style={getStatStyle(label, a)} className="number">
        {a}
      </td>
      <td style={getStatStyle(label, b)} className="number">
        {b}
      </td>
      <td style={getStatStyle(label, c)} className="number">
        {c}
      </td>
    </tr>
  );

  const Badge = ({ value }) => {
    const bg = value === "V" ? "#10b981" : value === "E" ? "#f4b400" : "#e4572e";
    const color = value === "E" ? "#111827" : "white";

    return (
      <span style={{ ...styles.badge, background: bg, color }} className="form-letter">
        {value}
      </span>
    );
  };

  const FormRow = ({ label, values }) => (
    <div style={styles.formRow}>
      <strong className="light-text">{label}</strong>
      <div>
        {values.slice(0, 5).map((v, i) => (
          <Badge key={i} value={v} />
        ))}
      </div>
    </div>
  );

  const WorldCupLogo = ({ size = 28 }) => (
    <span
      style={{
        ...styles.lionOnly,
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
      }}
    >
      <img
  src="/worldcup2026.png"
  alt="World Cup 2026"
  style={{
    width: size * 2.4,
    height: size * 2.4,
    objectFit: "contain"
  }}
/>
    </span>
  );

  const SideProgress = ({ side, index }) => {
    const total = teams.length;
    const pct = total <= 1 ? 0 : (index / (total - 1)) * 100;
    const remaining = total - index - 1;

    return (
      <div style={side === "left" ? styles.sideProgressLeft : styles.sideProgressRight}>
        <div style={styles.progressDots}>
          {teams.map((_, i) => (
            <span key={i} style={i === index ? styles.progressDotActive : styles.progressDot}></span>
          ))}
          <span style={{ ...styles.progressThumb, top: `${pct}%` }}></span>
        </div>

        <div style={styles.progressText}>
          <span style={styles.progressMain}>
            {index + 1}/{total}
          </span>
          <span style={styles.progressSub}>{remaining} más</span>
        </div>
      </div>
    );
  };

  const ModeTabs = ({ value, setValue }) => (
    <div style={styles.tabs}>
      <button style={value === "all" ? styles.activeTab : styles.tab} onClick={() => setValue("all")}>
        HISTÓRICO
      </button>
      <button
        style={value === "worldcup" ? styles.activeTab : styles.tab}
        onClick={() => setValue("worldcup")}
      >
        WORLD CUP
      </button>
      <button
        style={value === "last5" ? styles.activeTab : styles.tab}
        onClick={() => setValue("last5")}
      >
        ÚLT. 5
      </button>
    </div>
  );

  const getTableMatches = (matches, teamId, venue) => {
    let data = matches;

    if (venue === "local") data = data.filter((m) => m.homeTeam.id === teamId);
    if (venue === "visita") data = data.filter((m) => m.awayTeam.id === teamId);

    return data.slice(0, 10);
  };

  const getPeriodGoals = (m, teamId, period) => {
    const home = m.homeTeam.id === teamId;
    const ftFor = home ? m.score.fullTime.home : m.score.fullTime.away;
    const htFor = home ? m.score.halfTime.home : m.score.halfTime.away;
    const secondFor = ftFor - (htFor || 0);

    if (period === "first") return htFor || 0;
    if (period === "second") return secondFor;
    return ftFor;
  };

  const calcGoalLines = (matches, teamId, period) => {
    let total = 0;
    let over05 = 0;
    let over15 = 0;
    let over25 = 0;
    let over35 = 0;
    let noGoal = 0;
    let goals = 0;

    matches.forEach((m) => {
      const g = getPeriodGoals(m, teamId, period);

      total++;
      goals += g;

      if (g > 0.5) over05++;
      if (g > 1.5) over15++;
      if (g > 2.5) over25++;
      if (g > 3.5) over35++;
      if (g === 0) noGoal++;
    });

    const pct = (n) => (total ? ((n / total) * 100).toFixed(1) + "%" : "0.0%");
    const avg = total ? (goals / total).toFixed(2) : "0.00";

    return {
      avg,
      over05: pct(over05),
      over15: pct(over15),
      over25: pct(over25),
      over35: pct(over35),
      noGoal: pct(noGoal),
    };
  };

  const percentNumber = (v) => parseFloat(String(v).replace("%", "")) || 0;

  const lineCellStyle = (value) => {
    const n = percentNumber(value);

    if (n >= 70) return { ...styles.lineCell, background: "#d9fbe8", color: "#047857" };
    if (n <= 30) return { ...styles.lineCell, background: "#ffe1e1", color: "#b91c1c" };

    return { ...styles.lineCell, background: "#f5f1f7", color: "#5f4965" };
  };

  const MatchTable = ({ matches, teamId, venue, setVenue }) => {
    const tableMatches = getTableMatches(matches, teamId, venue);

    return (
      <div style={styles.matchesBox}>
        <div style={styles.matchHeader}>
          <h3 style={styles.sectionSmall} className="section-heading">
            ÚLTIMOS 10 PARTIDOS
          </h3>

          <div>
            <button style={venue === "total" ? styles.activeMini : styles.mini} onClick={() => setVenue("total")}>
              TOTAL
            </button>
            <button style={venue === "local" ? styles.activeMini : styles.mini} onClick={() => setVenue("local")}>
              LOCAL
            </button>
            <button style={venue === "visita" ? styles.activeMini : styles.mini} onClick={() => setVenue("visita")}>
              VISITA
            </button>
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thLeft}>FECHA</th>
              <th style={styles.thLeft}>PARTIDO</th>
              <th>FINAL</th>
              <th>1T</th>
              <th>2T</th>
            </tr>
          </thead>

          <tbody>
            {tableMatches.map((m) => {
              const date = new Date(m.utcDate).toLocaleDateString("es-PE");

              const htH = m.score.halfTime.home ?? 0;
              const htA = m.score.halfTime.away ?? 0;
              const ftH = m.score.fullTime.home;
              const ftA = m.score.fullTime.away;
              const stH = ftH - htH;
              const stA = ftA - htA;

              const resultColor = getResultColor(m, teamId);

              return (
                <tr key={m.id}>
                  <td style={styles.matchCell} className="number">
                    {date}
                  </td>

                  <td style={styles.matchCell}>
                    <span style={styles.teamLine}>
                      <img src={m.homeTeam.crest} alt="" style={styles.miniLogo} />
                      {m.homeTeam.shortName || m.homeTeam.name}
                      <span style={styles.vsText}>VS</span>
                      <img src={m.awayTeam.crest} alt="" style={styles.miniLogo} />
                      {m.awayTeam.shortName || m.awayTeam.name}
                    </span>
                  </td>

                  <td style={{ ...styles.scoreCell, color: resultColor }} className="number">
                    {ftH} - {ftA}
                  </td>
                  <td style={{ ...styles.scoreCell, color: resultColor }} className="number">
                    {htH} - {htA}
                  </td>
                  <td style={{ ...styles.scoreCell, color: resultColor }} className="number">
                    {stH} - {stA}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const WorldCupTeamsBox = () => (
    <div style={styles.leagueBox}>
      <div style={styles.leagueHeader}>
        <h3 style={styles.leagueTitle}>SELECCIONES</h3>
        <span style={styles.leagueSub}>WORLD CUP</span>
      </div>

      <table style={styles.leagueTable}>
        <thead>
          <tr>
            <th style={styles.leaguePosHead}>#</th>
            <th style={{ textAlign: "left" }}>EQUIPO</th>
          </tr>
        </thead>

        <tbody>
          {teams.slice(0, 32).map((t, i) => {
            const selected = t.id === L.id || t.id === R.id;
            const posStyle = selected ? styles.leaguePosSelected : styles.leaguePosNormal;

            return (
              <tr key={t.id} style={selected ? styles.leagueSelectedRow : styles.leagueRow}>
                <td style={styles.leaguePositionCell}>
                  <span style={posStyle} className="number">
                    {i + 1}
                  </span>
                </td>

                <td style={styles.leagueTeam}>
                  <img src={t.logo} alt="" style={styles.leagueLogo} />
                  <span style={styles.leagueName}>{t.name}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const PerformanceTable = () => {
    const leftVenue = getVenueMatchesForMode(leftAll, leftWorldCup, performanceMode, L.id, "local");
    const rightVenue = getVenueMatchesForMode(rightAll, rightWorldCup, performanceMode, R.id, "visita");

    const leftStats = calcGoalLines(leftVenue, L.id, performancePeriod);
    const rightStats = calcGoalLines(rightVenue, R.id, performancePeriod);

    const lAvg = parseFloat(leftStats.avg);
    const rAvg = parseFloat(rightStats.avg);
    const maxAvg = Math.max(lAvg, rAvg, 0.01);

    const leader = lAvg >= rAvg ? L.name : R.name;
    const weaker = lAvg >= rAvg ? R.name : L.name;
    const baseValue = Math.max(lAvg >= rAvg ? rAvg : lAvg, 0.01);
    const betterPct = lAvg === rAvg ? "0" : Math.abs(((lAvg - rAvg) / baseValue) * 100).toFixed(0);

    return (
      <div style={styles.performanceBox}>
        <div style={styles.performanceHeader}>
          <h3 style={styles.performanceTitle}>
            <span style={styles.starIcon}></span> GOLES MARCADOS
          </h3>

          <div style={styles.performanceMiniTabs}>
            <button
              style={performanceMode === "all" ? styles.activeHeaderMini : styles.headerMini}
              onClick={() => setPerformanceMode("all")}
            >
              HISTÓRICO
            </button>

            <button
              style={performanceMode === "worldcup" ? styles.activeHeaderMini : styles.headerMini}
              onClick={() => setPerformanceMode("worldcup")}
            >
              WORLD CUP
            </button>

            <button
              style={performanceMode === "last5" ? styles.activeHeaderMini : styles.headerMini}
              onClick={() => setPerformanceMode("last5")}
            >
              ÚLT. 5
            </button>
          </div>
        </div>

        <p style={styles.performanceText}>
          <strong>{leader}</strong> es un <strong>{betterPct}%</strong> mejor en goles marcados que {weaker} según la
          localía del partido.
        </p>

        <div style={styles.barArea}>
          <div style={styles.barTeam}>
            <img src={L.logo} alt="" style={styles.miniLogo} />
            <div style={styles.barWrap}>
              <div style={{ ...styles.greenBar, width: `${(lAvg / maxAvg) * 100}%` }}>
                {leftStats.avg} goles por partido
              </div>
              <span style={styles.barLabel}>{L.name} en casa</span>
            </div>
          </div>

          <div style={styles.barTeam}>
            <img src={R.logo} alt="" style={styles.miniLogo} />
            <div style={styles.barWrap}>
              <div style={{ ...styles.orangeBar, width: `${(rAvg / maxAvg) * 100}%` }}>
                {rightStats.avg} goles por partido
              </div>
              <span style={styles.barLabel}>{R.name} fuera de casa</span>
            </div>
          </div>
        </div>

        <div style={styles.periodTabs}>
          <button
            style={performancePeriod === "full" ? styles.activePeriod : styles.period}
            onClick={() => setPerformancePeriod("full")}
          >
            PARTIDO COMPLETO
          </button>

          <button
            style={performancePeriod === "first" ? styles.activePeriod : styles.period}
            onClick={() => setPerformancePeriod("first")}
          >
            PRIMERA PARTE
          </button>

          <button
            style={performancePeriod === "second" ? styles.activePeriod : styles.period}
            onClick={() => setPerformancePeriod("second")}
          >
            SEGUNDA PARTE
          </button>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.thLeft}>Puntuación por partido</th>
              <th>{L.name.toUpperCase()}</th>
              <th>{R.name.toUpperCase()}</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style={styles.label}>Más de 0.5</td>
              <td style={lineCellStyle(leftStats.over05)} className="number">
                {leftStats.over05}
              </td>
              <td style={lineCellStyle(rightStats.over05)} className="number">
                {rightStats.over05}
              </td>
            </tr>

            <tr>
              <td style={styles.label}>Más de 1.5</td>
              <td style={lineCellStyle(leftStats.over15)} className="number">
                {leftStats.over15}
              </td>
              <td style={lineCellStyle(rightStats.over15)} className="number">
                {rightStats.over15}
              </td>
            </tr>

            <tr>
              <td style={styles.label}>Más de 2.5</td>
              <td style={lineCellStyle(leftStats.over25)} className="number">
                {leftStats.over25}
              </td>
              <td style={lineCellStyle(rightStats.over25)} className="number">
                {rightStats.over25}
              </td>
            </tr>

            <tr>
              <td style={styles.label}>Más de 3.5</td>
              <td style={lineCellStyle(leftStats.over35)} className="number">
                {leftStats.over35}
              </td>
              <td style={lineCellStyle(rightStats.over35)} className="number">
                {rightStats.over35}
              </td>
            </tr>

            <tr>
              <td style={styles.label}>No logró anotar</td>
              <td style={lineCellStyle(leftStats.noGoal)} className="number">
                {leftStats.noGoal}
              </td>
              <td style={lineCellStyle(rightStats.noGoal)} className="number">
                {rightStats.noGoal}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const SignalBox = () => {
    const leftBase = getVenueMatchesForMode(leftAll, leftWorldCup, performanceMode, L.id, "local");
    const rightBase = getVenueMatchesForMode(rightAll, rightWorldCup, performanceMode, R.id, "visita");

    const leftGoals = calcGoalLines(leftBase, L.id, "full");
    const rightGoals = calcGoalLines(rightBase, R.id, "full");

    const leftStats = calc(leftBase, L.id);
    const rightStats = calc(rightBase, R.id);

    const avgBTTS = (percentNumber(leftStats.btts) + percentNumber(rightStats.btts)) / 2;
    const avgOver15 = (percentNumber(leftGoals.over15) + percentNumber(rightGoals.over15)) / 2;
    const avgNoGoal = (percentNumber(leftGoals.noGoal) + percentNumber(rightGoals.noGoal)) / 2;

    const signals = [];

    if (avgBTTS >= 60) {
      signals.push({
        type: "SEÑAL FUERTE",
        title: "BTTS (Sí, ambos anotan)",
        text: `${L.name} en casa tiene BTTS ${leftStats.btts} y ${R.name} fuera tiene BTTS ${rightStats.btts}.`,
      });
    }

    if (avgOver15 >= 55) {
      signals.push({
        type: "SEÑAL MEDIA",
        title: "Over 1.5 goles individuales",
        text: `${L.name} supera +1.5 en ${leftGoals.over15} y ${R.name} supera +1.5 en ${rightGoals.over15}.`,
      });
    }

    if (avgNoGoal >= 40) {
      signals.push({
        type: "ALERTA",
        title: "Riesgo de equipo sin anotar",
        text: `El promedio combinado de no anotar es ${avgNoGoal.toFixed(1)}%.`,
      });
    }

    if (signals.length === 0) {
      signals.push({
        type: "NEUTRAL",
        title: "No hay señal dominante",
        text: "Los datos no muestran una ventaja clara. Revisa localía, últimos 5 y goles por tiempo.",
      });
    }

    return (
      <div style={styles.marketBox}>
        <div style={styles.marketHeader}>
          <h3 style={styles.marketTitle}>LECTURA ESTADÍSTICA</h3>
          <span style={styles.marketSub}>NO ES GARANTÍA</span>
        </div>

        <div style={styles.signalGrid}>
          {signals.map((s, i) => (
            <div key={i} style={styles.signalCard}>
              <span style={s.type === "SEÑAL FUERTE" ? styles.safeBadge : styles.recommendedBadge}>{s.type}</span>
              <h4 style={styles.signalTitle}>{s.title}</h4>
              <p style={styles.signalText}>{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const Panel = ({
    team,
    all,
    worldcup,
    side,
    statsMode,
    setStatsMode,
    overMode,
    setOverMode,
    overType,
    setOverType,
    tableVenue,
    setTableVenue,
  }) => {
    const statsBase = useMemo(() => chooseBase(all, worldcup, statsMode), [all, worldcup, statsMode]);
    const overBase = useMemo(() => chooseBase(all, worldcup, overMode), [all, worldcup, overMode]);

    const data = useMemo(() => {
      const statsSplit = splitByVenue(statsBase, team.id, statsMode);
      const overSplit = splitByVenue(overBase, team.id, overMode);

      return {
        statsSplit,
        s: {
          general: calc(statsSplit.general, team.id),
          local: calc(statsSplit.local, team.id),
          visita: calc(statsSplit.visita, team.id),
        },
        o: {
          general: calcOvers(overSplit.general, team.id, overType),
          local: calcOvers(overSplit.local, team.id, overType),
          visita: calcOvers(overSplit.visita, team.id, overType),
        },
      };
    }, [statsBase, overBase, team.id, statsMode, overMode, overType]);

    const formGeneral = data.statsSplit.general.map((m) => getResult(m, team.id)).reverse();
    const formLocal = data.statsSplit.local.map((m) => getResult(m, team.id)).reverse();
    const formVisita = data.statsSplit.visita.map((m) => getResult(m, team.id)).reverse();

    return (
      <div style={styles.panel}>
        <div style={styles.panelHead}>
          <img src={team.logo} alt="" style={styles.smallLogo} />
          <div>
            <h2 style={{ margin: 0 }}>{team.name}</h2>
            <p style={{ margin: 0 }} className="light-text">
              Copa del Mundo · {side}
            </p>
          </div>
        </div>

        <div style={styles.formBox}>
          <h3 style={styles.sectionSmall} className="section-heading">
            RESULTADOS RECIENTES
          </h3>
          <FormRow label="General" values={formGeneral} />
          <FormRow label="Local" values={formLocal} />
          <FormRow label="Visita" values={formVisita} />
        </div>

        <ModeTabs value={statsMode} setValue={setStatsMode} />

        <h3 style={styles.section} className="section-heading">
          ESTADÍSTICAS
        </h3>

        <table style={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>GENERAL</th>
              <th>LOCAL</th>
              <th>VISITA</th>
            </tr>
          </thead>

          <tbody>
            <Row label="% Ganar" a={data.s.general.win} b={data.s.local.win} c={data.s.visita.win} />
            <Row label="Goles a favor" a={data.s.general.gf} b={data.s.local.gf} c={data.s.visita.gf} />
            <Row label="Goles en contra" a={data.s.general.ga} b={data.s.local.ga} c={data.s.visita.ga} />
            <Row label="Goles totales" a={data.s.general.totalGoals} b={data.s.local.totalGoals} c={data.s.visita.totalGoals} />
            <Row label="BTTS" a={data.s.general.btts} b={data.s.local.btts} c={data.s.visita.btts} />
            <Row label="Portería a 0" a={data.s.general.clean} b={data.s.local.clean} c={data.s.visita.clean} />
            <Row label="Goles 1er tiempo" a={data.s.general.firstHalf} b={data.s.local.firstHalf} c={data.s.visita.firstHalf} />
          </tbody>
        </table>

        <h3 style={styles.section} className="section-heading">
          % PARTIDOS CON OVER GOLES
        </h3>

        <ModeTabs value={overMode} setValue={setOverMode} />

        <div style={styles.miniTabs}>
          <button style={overType === "match" ? styles.activeMini : styles.mini} onClick={() => setOverType("match")}>
            PARTIDO TOTAL
          </button>

          <button style={overType === "team" ? styles.activeMini : styles.mini} onClick={() => setOverType("team")}>
            SOLO {team.name.toUpperCase()}
          </button>
        </div>

        <table style={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>GENERAL</th>
              <th>LOCAL</th>
              <th>VISITA</th>
            </tr>
          </thead>

          <tbody>
            <Row label="Más de 0.5" a={data.o.general.over05} b={data.o.local.over05} c={data.o.visita.over05} />
            <Row label="Más de 1.5" a={data.o.general.over15} b={data.o.local.over15} c={data.o.visita.over15} />
            <Row label="Más de 2.5" a={data.o.general.over25} b={data.o.local.over25} c={data.o.visita.over25} />
            <Row label="Más de 3.5" a={data.o.general.over35} b={data.o.local.over35} c={data.o.visita.over35} />
          </tbody>
        </table>

        <MatchTable matches={statsBase} teamId={team.id} venue={tableVenue} setVenue={setTableVenue} />
      </div>
    );
  };

  const GlobalStyle = () => (
    <style>{`
      @keyframes logoFloat {
        0% { transform: translateY(0); }
        50% { transform: translateY(-18px); }
        100% { transform: translateY(0); }
      }

      @keyframes pulseButton {
        0% { transform: scale(1); box-shadow: 0 10px 25px rgba(59,0,61,.35); }
        50% { transform: scale(1.045); box-shadow: 0 14px 34px rgba(59,0,61,.48); }
        100% { transform: scale(1); box-shadow: 0 10px 25px rgba(59,0,61,.35); }
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes softGlow {
        0% { filter: drop-shadow(0 4px 8px rgba(39,0,45,.12)); }
        50% { filter: drop-shadow(0 7px 12px rgba(39,0,45,.18)); }
        100% { filter: drop-shadow(0 4px 8px rgba(39,0,45,.12)); }
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
      }

      button {
        font-family: inherit;
      }

      .number {
        font-weight: 850 !important;
        font-variant-numeric: tabular-nums;
        letter-spacing: .25px;
      }

      .section-heading,
      .table-heading {
        font-weight: 850;
      }

      .light-text {
        font-weight: 650;
      }

      .form-letter {
        font-weight: 850;
      }

      table th {
        font-weight: 850;
        color: #8b5a92;
        letter-spacing: 1.3px;
      }
    `}</style>
  );

  if (!teams.length) {
    return (
      <>
        <GlobalStyle />
        <div style={styles.intro}>
          <div style={{ fontSize: "70px", animation: "logoFloat 2.2s ease-in-out infinite" }}>🏆</div>
          <p style={styles.clickText}>CARGANDO WORLD CUP...</p>
        </div>
      </>
    );
  }

  if (screen === "intro") {
    return (
      <>
        <GlobalStyle />
        <div style={{ ...styles.intro, opacity: fade ? 0 : 1 }}>
  <img
    src="/worldcup2026.png"
    alt="World Cup 2026"
    style={styles.introTrophy}
    onClick={() => {
      setFade(true);
      setTimeout(() => setScreen("select"), 600);
    }}
  />

  <div style={styles.logoShadow}></div>
  <p style={styles.clickText}>CLICK PARA INICIAR</p>
</div>
      </>
    );
  }

  if (screen === "analysis") {
    return (
      <>
        <GlobalStyle />
        <div style={styles.page}>
          <button style={styles.back} onClick={() => setScreen("select")}>
            CAMBIAR EQUIPOS
          </button>

          <div style={styles.titleWrap}>
            <WorldCupLogo size={22} />
            <h1 style={styles.title}>ANÁLISIS DE PARTIDO</h1>
          </div>

          <div style={styles.dashboard}>
            <Panel
              team={L}
              all={leftAll}
              worldcup={leftWorldCup}
              side="Local"
              statsMode={leftStatsMode}
              setStatsMode={setLeftStatsMode}
              overMode={leftOverMode}
              setOverMode={setLeftOverMode}
              overType={leftOverType}
              setOverType={setLeftOverType}
              tableVenue={leftTableVenue}
              setTableVenue={setLeftTableVenue}
            />

            <Panel
              team={R}
              all={rightAll}
              worldcup={rightWorldCup}
              side="Visita"
              statsMode={rightStatsMode}
              setStatsMode={setRightStatsMode}
              overMode={rightOverMode}
              setOverMode={setRightOverMode}
              overType={rightOverType}
              setOverType={setRightOverType}
              tableVenue={rightTableVenue}
              setTableVenue={setRightTableVenue}
            />

            <WorldCupTeamsBox />
          </div>

          <div style={styles.bottomGrid}>
            <PerformanceTable />
            <SignalBox />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <div style={styles.page}>
        <div style={styles.titleWrap}>
          <WorldCupLogo size={24} />
          <h1 style={styles.title}>SELECCIÓN DE SELECCIONES</h1>
        </div>

        <SideProgress side="left" index={left} />
        <SideProgress side="right" index={right} />

        <div style={styles.selector}>
          <div style={styles.teamBox}>
            <div style={styles.venueTag}>LOCAL</div>

            <button style={styles.arrowTop} onClick={() => setLeft((left - 1 + teams.length) % teams.length)}>
              ▲
            </button>

            <img src={L.logo} alt="" style={styles.bigLogo} />
            <div style={styles.teamShadow}></div>
            <h2 style={styles.teamName}>{L.name}</h2>

            <button style={styles.arrowBottom} onClick={() => setLeft((left + 1) % teams.length)}>
              ▼
            </button>
          </div>

          <div style={styles.center}>
            <div style={styles.vs}>VS</div>
            <button style={styles.analyze} onClick={loadData}>
              ANALIZAR PARTIDO
            </button>
          </div>

          <div style={styles.teamBox}>
            <div style={styles.venueTag}>VISITA</div>

            <button style={styles.arrowTop} onClick={() => setRight((right - 1 + teams.length) % teams.length)}>
              ▲
            </button>

            <img src={R.logo} alt="" style={styles.bigLogo} />
            <div style={styles.teamShadow}></div>
            <h2 style={styles.teamName}>{R.name}</h2>

            <button style={styles.arrowBottom} onClick={() => setRight((right + 1) % teams.length)}>
              ▼
            </button>
          </div>
        </div>

        <div style={styles.credits}>@ikerstg_</div>
      </div>
    </>
  );
}

const styles = {
  intro: {
    height: "100vh",
    background: "radial-gradient(circle at top,#fbf7ff 0%,#eef3f8 42%,#e9edf6 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    transition: "opacity .6s ease",
    position: "relative",
  },

  introTrophy: {
  width: "230px",
  height: "230px",
  objectFit: "contain",
  cursor: "pointer",
  animation: "logoFloat 2.2s ease-in-out infinite",
  filter: "drop-shadow(0 18px 24px rgba(0,0,0,.18))",
},

  logoShadow: {
    width: "100px",
    height: "18px",
    borderRadius: "50%",
    background: "rgba(0,0,0,.15)",
    filter: "blur(6px)",
    marginTop: "18px",
  },

  clickText: {
    position: "absolute",
    bottom: "40px",
    letterSpacing: "4px",
    fontSize: "12px",
    color: "#9ca3af",
    fontWeight: 800,
  },

  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top,#fbf7ff 0%,#eef3f8 42%,#e9edf6 100%)",
    color: "#25002b",
    fontFamily: "Inter, Poppins, Arial, sans-serif",
    padding: "18px",
    position: "relative",
  },

  titleWrap: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "14px",
    marginBottom: "30px",
  },

  lionOnly: {
    display: "inline-block",
    overflow: "hidden",
    position: "relative",
    filter: "drop-shadow(0 6px 12px rgba(39,0,45,.18))",
    flex: "0 0 auto",
  },

  title: {
    textAlign: "center",
    letterSpacing: "8px",
    fontSize: "16px",
    margin: 0,
    fontWeight: 900,
  },

  back: {
    position: "absolute",
    top: 18,
    right: 25,
    padding: "10px 24px",
    borderRadius: "24px",
    border: "1px solid #d7c8df",
    background: "white",
    letterSpacing: "3px",
    color: "#25002b",
    cursor: "pointer",
    fontWeight: 900,
    boxShadow: "0 8px 20px rgba(31,12,38,.08)",
  },

  selector: {
    display: "grid",
    gridTemplateColumns: "1fr 260px 1fr",
    alignItems: "center",
    height: "72vh",
    position: "relative",
    paddingTop: "34px",
  },

  teamBox: {
    textAlign: "center",
    position: "relative",
    paddingTop: "0",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  venueTag: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 16px",
    borderRadius: "999px",
    background: "rgba(255,255,255,.88)",
    border: "1px solid #e6d9ec",
    color: "#5b0863",
    fontSize: "11px",
    fontWeight: 950,
    letterSpacing: "4px",
    boxShadow: "0 8px 18px rgba(31,12,38,.08)",
    margin: "0 auto 6px",
    position: "relative",
    zIndex: 20,
  },

  bigLogo: {
    width: "260px",
    height: "260px",
    objectFit: "contain",
    filter: "drop-shadow(0 20px 35px rgba(0,0,0,.18))",
    animation: "logoFloat 2.4s ease-in-out infinite",
    marginTop: "0",
  },

  teamShadow: {
    width: "120px",
    height: "20px",
    borderRadius: "50%",
    background: "rgba(0,0,0,.14)",
    filter: "blur(7px)",
    margin: "-8px auto 10px",
  },

  teamName: {
    margin: "2px 0 0",
    fontSize: "26px",
    fontWeight: 900,
  },

  arrowTop: {
    display: "block",
    margin: "0 auto 26px",
    border: "none",
    background: "rgba(255,255,255,.92)",
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    fontSize: "24px",
    cursor: "pointer",
    color: "#25002b",
    boxShadow: "0 18px 34px rgba(31,12,38,.22)",
    animation: "pulseButton 1.8s ease-in-out infinite",
    position: "relative",
    zIndex: 15,
  },

  arrowBottom: {
    display: "block",
    margin: "12px auto 0",
    border: "none",
    background: "rgba(255,255,255,.88)",
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    fontSize: "24px",
    cursor: "pointer",
    color: "#25002b",
    boxShadow: "0 14px 28px rgba(31,12,38,.18)",
    animation: "pulseButton 1.8s ease-in-out infinite",
    position: "relative",
    zIndex: 10,
  },

  center: {
    textAlign: "center",
  },

  vs: {
    width: "115px",
    height: "115px",
    borderRadius: "50%",
    background: "linear-gradient(135deg,#27002d,#5b0863)",
    color: "white",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "36px",
    fontWeight: 900,
    margin: "0 auto 30px",
    boxShadow: "0 15px 35px rgba(59,0,61,.35)",
  },

  analyze: {
    background: "linear-gradient(135deg,#27002d,#5b0863)",
    color: "white",
    border: "none",
    padding: "16px 42px",
    borderRadius: "16px",
    letterSpacing: "4px",
    fontWeight: 900,
    cursor: "pointer",
    animation: "pulseButton 1.7s ease-in-out infinite",
  },

  credits: {
    position: "fixed",
    bottom: "18px",
    left: "50%",
    transform: "translateX(-50%)",
    color: "#8b5a92",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "3px",
    opacity: 0.85,
  },

  sideProgressLeft: {
    position: "fixed",
    left: "22px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    zIndex: 5,
  },

  sideProgressRight: {
    position: "fixed",
    right: "22px",
    top: "50%",
    transform: "translateY(-50%)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    zIndex: 5,
  },

  progressDots: {
    position: "relative",
    height: "205px",
    width: "18px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressDot: {
    width: "4px",
    height: "4px",
    borderRadius: "50%",
    background: "#c9c3cf",
    display: "block",
    opacity: 0.75,
  },

  progressDotActive: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#3b003d",
    display: "block",
    boxShadow: "0 0 0 4px rgba(59,0,61,.09)",
  },

  progressThumb: {
    position: "absolute",
    left: "50%",
    transform: "translate(-50%,-50%)",
    width: "5px",
    height: "38px",
    borderRadius: "999px",
    background: "linear-gradient(180deg,#27002d,#711578)",
    boxShadow: "0 8px 18px rgba(39,0,45,.25)",
    transition: "top .25s ease",
  },

  progressText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    color: "#3b003d",
    fontWeight: 900,
    letterSpacing: "1px",
  },

  progressMain: {
    fontSize: "12px",
  },

  progressSub: {
    fontSize: "10px",
    color: "#8b5a92",
    textTransform: "uppercase",
  },

  dashboard: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 430px",
    gap: "18px",
    animation: "fadeIn .35s ease",
    alignItems: "start",
  },

  panel: {
    background: "white",
    borderRadius: "18px",
    overflow: "hidden",
    boxShadow: "0 18px 45px rgba(31,12,38,.13)",
  },

  panelHead: {
    background: "linear-gradient(135deg,#27002d 0%,#4b0754 48%,#711578 100%)",
    color: "white",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },

  smallLogo: {
    width: "58px",
    height: "58px",
    objectFit: "contain",
  },

  formBox: {
    padding: "10px 16px",
    borderBottom: "1px solid #f0e8f3",
  },

  formRow: {
    display: "grid",
    gridTemplateColumns: "90px 1fr",
    alignItems: "center",
    padding: "6px 0",
    borderBottom: "1px solid #f3edf6",
    fontSize: "13.5px",
  },

  badge: {
    padding: "4px 7px",
    borderRadius: "5px",
    fontSize: "11.5px",
    marginRight: "4px",
  },

  sectionSmall: {
    color: "#8b5a92",
    letterSpacing: "4px",
    fontSize: "11.5px",
    margin: "5px 0 8px",
  },

  section: {
    color: "#8b5a92",
    letterSpacing: "4px",
    fontSize: "12px",
    padding: "0 16px",
  },

  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
    padding: "12px 16px",
  },

  tab: {
    padding: "9px",
    borderRadius: "10px",
    border: "1px solid #e5dbea",
    background: "white",
    color: "#25002b",
    fontWeight: 850,
    cursor: "pointer",
  },

  activeTab: {
    padding: "9px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg,#27002d,#5b0863)",
    color: "white",
    fontWeight: 850,
    cursor: "pointer",
  },

  miniTabs: {
    display: "flex",
    gap: "8px",
    padding: "0 16px 12px",
    flexWrap: "wrap",
  },

  mini: {
    padding: "8px 12px",
    borderRadius: "10px",
    border: "1px solid #e5dbea",
    background: "white",
    color: "#25002b",
    fontWeight: 850,
    cursor: "pointer",
    marginLeft: "5px",
  },

  activeMini: {
    padding: "8px 12px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg,#27002d,#5b0863)",
    color: "white",
    fontWeight: 850,
    cursor: "pointer",
    marginLeft: "5px",
  },

  table: {
    width: "calc(100% - 32px)",
    margin: "0 16px 18px",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: "13.5px",
    overflow: "hidden",
    borderRadius: "12px",
    boxShadow: "0 10px 24px rgba(31,12,38,.07)",
  },

  thLeft: {
    textAlign: "left",
    padding: "9px",
    borderBottom: "1px solid #f0e8f3",
    color: "#8b5a92",
  },

  label: {
    textAlign: "left",
    padding: "9px",
    borderBottom: "1px solid #f0e8f3",
    fontWeight: 850,
  },

  cell: {
    textAlign: "right",
    padding: "9px",
    borderBottom: "1px solid #f0e8f3",
    fontWeight: 900,
    letterSpacing: ".2px",
    color: "#3b2540",
  },

  scoreCell: {
    textAlign: "right",
    padding: "9px",
    borderBottom: "1px solid #f0e8f3",
    fontWeight: 850,
    fontSize: "14.5px",
    letterSpacing: ".3px",
  },

  lineCell: {
    textAlign: "right",
    padding: "9px",
    borderBottom: "1px solid #f0e8f3",
    fontWeight: 900,
    color: "#3b2540",
  },

  matchCell: {
    textAlign: "left",
    padding: "9px",
    borderBottom: "1px solid #f0e8f3",
  },

  matchesBox: {
    paddingBottom: "10px",
  },

  matchHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 16px",
    gap: "10px",
  },

  teamLine: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexWrap: "wrap",
  },

  miniLogo: {
    width: "18px",
    height: "18px",
    objectFit: "contain",
    animation: "softGlow 3.2s ease-in-out infinite",
  },

  vsText: {
    opacity: 0.9,
    margin: "0 6px",
    fontWeight: 850,
    color: "#25002b",
  },

  leagueBox: {
    background: "white",
    borderRadius: "18px",
    padding: "0 0 12px",
    boxShadow: "0 18px 45px rgba(31,12,38,.13)",
    position: "sticky",
    top: "18px",
    overflow: "hidden",
  },

  leagueHeader: {
    background: "linear-gradient(135deg,#27002d 0%,#4b0754 48%,#711578 100%)",
    color: "white",
    padding: "18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  leagueTitle: {
    margin: 0,
    fontSize: "14.5px",
    letterSpacing: "2px",
  },

  leagueSub: {
    fontSize: "11.5px",
    opacity: 0.75,
  },

  leagueTable: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 4px",
    fontSize: "13px",
    padding: "8px 10px 4px",
  },

  leagueRow: {
    background: "transparent",
  },

  leagueSelectedRow: {
    background: "#fbf0ff",
    boxShadow: "inset 0 0 0 1px #e9c7f2",
  },

  leaguePosHead: {
    width: "48px",
  },

  leaguePositionCell: {
    width: "48px",
    textAlign: "center",
    padding: "7px 6px",
  },

  leaguePosNormal: {
    display: "inline-flex",
    width: "28px",
    height: "28px",
    borderRadius: "9px",
    alignItems: "center",
    justifyContent: "center",
    background: "#f2edf5",
    color: "#4b3a50",
  },

  leaguePosSelected: {
    display: "inline-flex",
    width: "28px",
    height: "28px",
    borderRadius: "9px",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg,#27002d,#711578)",
    color: "white",
    boxShadow: "0 6px 12px rgba(39,0,45,.22)",
  },

  leagueTeam: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    textAlign: "left",
    padding: "8px 12px",
    whiteSpace: "nowrap",
    minWidth: "185px",
  },

  leagueLogo: {
    width: "23px",
    height: "23px",
    objectFit: "contain",
  },

  leagueName: {
    fontWeight: 850,
    color: "#2e1733",
  },

  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "18px",
    marginTop: "18px",
  },

  performanceBox: {
    background: "white",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(31,12,38,.13)",
    overflow: "hidden",
  },

  performanceHeader: {
    background: "linear-gradient(135deg,#27002d 0%,#4b0754 48%,#711578 100%)",
    color: "white",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },

  performanceTitle: {
    margin: 0,
    letterSpacing: "2px",
    fontSize: "13.5px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  starIcon: {
    width: "17px",
    height: "17px",
    display: "inline-block",
    background: "linear-gradient(135deg,#ffffff,#d9b7e2)",
    clipPath:
      "polygon(50% 0%,61% 35%,98% 35%,68% 56%,79% 91%,50% 70%,21% 91%,32% 56%,2% 35%,39% 35%)",
  },

  performanceMiniTabs: {
    display: "flex",
    gap: "7px",
    flexWrap: "wrap",
  },

  headerMini: {
    padding: "7px 12px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,.25)",
    background: "rgba(255,255,255,.06)",
    color: "white",
    fontWeight: 850,
    cursor: "pointer",
    fontSize: "11px",
    letterSpacing: "1px",
  },

  activeHeaderMini: {
    padding: "7px 12px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,.4)",
    background: "white",
    color: "#3b003d",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: "11px",
    letterSpacing: "1px",
  },

  performanceText: {
    padding: "14px 18px",
    margin: 0,
  },

  barArea: {
    padding: "0 18px 18px",
    borderBottom: "1px solid #f0e8f3",
  },

  barTeam: {
    display: "grid",
    gridTemplateColumns: "28px 1fr",
    gap: "10px",
    alignItems: "center",
    marginBottom: "12px",
  },

  barWrap: {
    background: "#f5f2f6",
    borderRadius: "10px",
    overflow: "hidden",
    boxShadow: "inset 0 0 0 1px rgba(59,0,61,.05)",
  },

  greenBar: {
    background: "linear-gradient(90deg,#10b981,#16a34a)",
    color: "white",
    padding: "7px 11px",
    borderRadius: "10px",
    fontWeight: 850,
    fontSize: "13.5px",
    minWidth: "105px",
    transition: "width .25s ease",
  },

  orangeBar: {
    background: "linear-gradient(90deg,#f97316,#ef4444)",
    color: "white",
    padding: "7px 11px",
    borderRadius: "10px",
    fontWeight: 850,
    fontSize: "13.5px",
    minWidth: "105px",
    transition: "width .25s ease",
  },

  barLabel: {
    display: "block",
    fontSize: "11.5px",
    color: "#8b5a92",
    marginTop: "4px",
  },

  periodTabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    padding: "12px 18px 8px",
    gap: "8px",
  },

  period: {
    padding: "10px",
    border: "none",
    borderBottom: "2px solid transparent",
    background: "white",
    color: "#8b5a92",
    fontWeight: 850,
    cursor: "pointer",
  },

  activePeriod: {
    padding: "10px",
    border: "none",
    borderBottom: "2px solid #3b003d",
    background: "white",
    color: "#25002b",
    fontWeight: 900,
    cursor: "pointer",
  },

  marketBox: {
    background: "white",
    borderRadius: "18px",
    boxShadow: "0 18px 45px rgba(31,12,38,.13)",
    overflow: "hidden",
  },

  marketHeader: {
    background: "linear-gradient(135deg,#27002d 0%,#4b0754 48%,#711578 100%)",
    color: "white",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
  },

  marketTitle: {
    margin: 0,
    letterSpacing: "3px",
    fontSize: "13.5px",
  },

  marketSub: {
    fontSize: "11.5px",
    opacity: 0.75,
  },

  signalGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "12px",
    padding: "16px",
  },

  signalCard: {
    border: "1px solid #f0e8f3",
    borderRadius: "18px",
    padding: "14px",
    background: "linear-gradient(180deg,#ffffff 0%,#fbf7ff 100%)",
    boxShadow: "0 6px 16px rgba(15,23,42,.06)",
  },

  safeBadge: {
    background: "#d9fbe8",
    color: "#15803d",
    padding: "5px 10px",
    borderRadius: "8px",
    fontSize: "11.5px",
    fontWeight: 900,
  },

  recommendedBadge: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "5px 10px",
    borderRadius: "8px",
    fontSize: "11.5px",
    fontWeight: 900,
  },

  signalTitle: {
    margin: "12px 0 6px",
    fontSize: "14.5px",
  },

  signalText: {
    margin: 0,
    fontSize: "13.5px",
    lineHeight: 1.45,
  },
};

export default App;