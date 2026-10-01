import { COURSE, PASS } from "./course-data.js";
import { api, getToken, setToken } from "./api.js";
import { renderAuth } from "./auth-view.js";

const nav = document.getElementById("nav"), stage = document.getElementById("stage");
const account = document.getElementById("account");
const EXAM_IDX = COURSE.length, CERT_IDX = COURSE.length + 1, ADMIN_IDX = COURSE.length + 2;

let state = {
  done: [], checks: {}, tools: {}, current: 0,
  user: null,
  examPassed: false, lastAttempt: null, certificate: null,
};

/* ---------- persistence: debounced sync to the backend ---------- */
let saveTimer = null;
function save(immediate = false) {
  const payload = { done: state.done, checks: state.checks, tools: state.tools, current: state.current };
  clearTimeout(saveTimer);
  const flush = () => api.putProgress(payload).catch((e) => console.error("progress sync failed:", e.message));
  if (immediate) flush();
  else saveTimer = setTimeout(flush, 400);
}

function passed() { return state.examPassed; }

function unlocked(i) {
  if (i === 0) return true;
  if (i <= COURSE.length) return state.done.includes(i - 1);
  return passed();
}

function renderAccount() {
  if (!account) return;
  account.innerHTML = `<span class="who">${esc(state.user.name)}${state.user.institution ? " · " + esc(state.user.institution) : ""}</span><button class="btn secondary" id="logout">Not you?</button>`;
  document.getElementById("logout").onclick = () => {
    setToken(null);
    location.reload();
  };
}

function renderNav() {
  let html = '<div class="navhead">Modules</div>';
  COURSE.forEach((m, i) => {
    const d = state.done.includes(i);
    html += `<button class="mod ${i === state.current ? 'active' : ''} ${d ? 'done' : ''}" ${unlocked(i) ? '' : 'disabled'} data-i="${i}"><span class="n">${d ? '✓' : i + 1}</span><span class="t">${m.title}<span class="s">${m.mins}</span></span></button>`;
  });
  html += '<div class="navhead">Certification</div>';
  html += `<button class="mod ${state.current === EXAM_IDX ? 'active' : ''} ${passed() ? 'done' : ''}" ${unlocked(EXAM_IDX) ? '' : 'disabled'} data-i="${EXAM_IDX}"><span class="n">${passed() ? '✓' : 'E'}</span><span class="t">Final exam<span class="s">10 questions, pass at ${PASS}</span></span></button>`;
  html += `<button class="mod ${state.current === CERT_IDX ? 'active' : ''}" ${unlocked(CERT_IDX) ? '' : 'disabled'} data-i="${CERT_IDX}"><span class="n">★</span><span class="t">Your certificate<span class="s">Issued by Core5</span></span></button>`;
  if (state.user.role === "admin") {
    html += '<div class="navhead">Admin</div>';
    html += `<button class="mod ${state.current === ADMIN_IDX ? 'active' : ''}" data-i="${ADMIN_IDX}"><span class="n">A</span><span class="t">Faculty progress<span class="s">All accounts</span></span></button>`;
  }
  nav.innerHTML = html;
  nav.querySelectorAll(".mod").forEach(b => b.onclick = () => go(+b.dataset.i));
  const n = state.done.length;
  document.getElementById("overallLabel").textContent = `${n} of ${COURSE.length} modules complete`;
  document.getElementById("overallBar").style.width = (n / COURSE.length * 100) + "%";
}
function go(i) {
  stopVideo(); state.current = i; save(); render();
  window.scrollTo({ top: Math.max(0, stage.getBoundingClientRect().top + window.scrollY - 20), behavior: "smooth" });
}
function render() {
  renderNav();
  if (state.current < COURSE.length) renderModule(state.current);
  else if (state.current === EXAM_IDX) renderExam();
  else if (state.current === CERT_IDX) renderCert();
  else renderAdmin();
}

/* ---------- video ---------- */
let vid = { scene: 0, playing: false, timer: null, tick: null, muted: false, start: 0, dur: 0, reached: 0 };
const synth = window.speechSynthesis || null;
function stopVideo() { vid.playing = false; clearTimeout(vid.timer); clearInterval(vid.tick); if (synth) { try { synth.cancel(); } catch (e) {} } }

function renderModule(i) {
  const m = COURSE[i];
  const isDone = state.done.includes(i);
  let watched = isDone, checked = isDone || state.checks[i] === true;
  vid = { scene: 0, playing: false, timer: null, tick: null, muted: vid.muted, start: 0, dur: 0, reached: isDone ? m.scenes.length : 0 };
  const tools = state.tools[i] || [];
  stage.innerHTML = `
  <div class="player" aria-label="Lesson video">
    <div class="screen" id="screen"></div>
    <div class="caption" id="caption" aria-live="polite"></div>
    <div class="controls">
      <button id="prev" aria-label="Previous scene">◀</button>
      <button class="play" id="play">Play lesson</button>
      <button id="next" aria-label="Next scene">▶</button>
      <div class="timeline" id="tl">${m.scenes.map(() => '<span><i></i></span>').join("")}</div>
      <span class="count" id="count"></span>
      <button id="mute">${vid.muted ? 'Voice off' : 'Voice on'}</button>
    </div>
  </div>
  <article class="lesson">
    <h2>Module ${i + 1}: ${m.title}</h2>
    <div class="meta">${m.sub} · ${m.mins} video · ${m.scenes.length} scenes</div>
    <p>${m.intro}</p>
    <h3 class="sub">Key takeaways</h3>
    <ul class="takeaways">${m.takeaways.map(t => `<li>${t}</li>`).join("")}</ul>
    <div class="toolkit"><h3>Your action checklist</h3>
      ${m.toolkit.map((t, k) => `<label><input type="checkbox" data-k="${k}" ${tools.includes(k) ? 'checked' : ''}><span>${t}</span></label>`).join("")}
    </div>
    <div class="check" id="check">
      <h3>Quick checkpoint</h3>
      <p class="qtext">${m.check.q}</p>
      ${m.check.o.map((o, oi) => `<label class="opt" data-o="${oi}"><input type="radio" name="cp" value="${oi}" ${checked && oi === m.check.a ? 'checked' : ''}><span>${o}</span></label>`).join("")}
      <div class="explain" id="cpmsg">${checked ? 'Correct.' : ''}</div>
    </div>
    <div class="actions">
      <button class="btn" id="complete">${i < COURSE.length - 1 ? 'Complete and continue' : 'Complete and go to exam'}</button>
      <span class="hint" id="hint"></span>
    </div>
  </article>`;

  stage.querySelectorAll('.toolkit input').forEach(cb => cb.onchange = () => {
    const arr = new Set(state.tools[i] || []); cb.checked ? arr.add(+cb.dataset.k) : arr.delete(+cb.dataset.k);
    state.tools[i] = [...arr]; save();
  });
  if (checked) stage.querySelector(`.opt[data-o="${m.check.a}"]`).classList.add("right");
  stage.querySelectorAll('input[name=cp]').forEach(r => r.onchange = () => {
    const v = +r.value;
    stage.querySelectorAll('#check .opt').forEach(l => l.classList.remove("right", "wrong"));
    const lab = stage.querySelector(`#check .opt[data-o="${v}"]`);
    if (v === m.check.a) { lab.classList.add("right"); checked = true; state.checks[i] = true; save(); document.getElementById("cpmsg").textContent = "Correct."; }
    else { lab.classList.add("wrong"); document.getElementById("cpmsg").textContent = "Not quite — rewatch the relevant scene and try again."; }
    updateGate();
  });
  function updateGate() {
    const c = document.getElementById("complete"), h = document.getElementById("hint");
    c.disabled = !(watched && checked);
    h.textContent = isDone ? "Module completed." : (!watched && !checked ? "Watch the lesson and answer the checkpoint to continue." : !watched ? "Watch every scene to continue." : !checked ? "Answer the checkpoint to continue." : "Ready to continue.");
  }
  updateGate();
  document.getElementById("complete").onclick = () => { if (!state.done.includes(i)) state.done.push(i); save(true); go(i + 1); };
  document.getElementById("play").onclick = () => vid.playing ? pause() : play();
  document.getElementById("prev").onclick = () => jump(Math.max(0, vid.scene - 1));
  document.getElementById("next").onclick = () => { if (vid.scene < m.scenes.length - 1) jump(vid.scene + 1); };
  document.getElementById("mute").onclick = e => { vid.muted = !vid.muted; e.target.textContent = vid.muted ? 'Voice off' : 'Voice on'; if (vid.playing) { pause(); play(); } };
  showScene(0, false);

  function showScene(s, animate = true) {
    vid.scene = s; const sc = m.scenes[s], screen = document.getElementById("screen");
    screen.innerHTML = `<div class="chalk"></div><div class="scene-tag">${sc.tag}</div><div class="scene-title">${sc.title}</div>
      <ul class="scene-points">${sc.points.map(p => `<li>${p}</li>`).join("")}</ul><div class="big-glyph" aria-hidden="true">${sc.glyph}</div>`;
    document.getElementById("caption").textContent = sc.say;
    document.getElementById("count").textContent = `${s + 1} / ${m.scenes.length}`;
    screen.querySelectorAll(".scene-points li").forEach((li, k) => setTimeout(() => li.classList.add("in"), animate ? 350 + k * 450 : 0));
    document.querySelectorAll("#tl i").forEach((b, k) => b.style.width = (k < s || k < vid.reached) ? "100%" : "0%");
  }
  function jump(s) { const was = vid.playing; stopVideo(); showScene(s); if (was) play(); else setLabel(); }
  function setLabel() { document.getElementById("play").textContent = vid.playing ? "Pause" : (vid.scene === 0 && vid.reached === 0 ? "Play lesson" : "Resume"); }
  function pause() { stopVideo(); setLabel(); }
  function play() {
    vid.playing = true; setLabel();
    const sc = m.scenes[vid.scene];
    vid.dur = Math.max(5000, sc.say.split(/\s+/).length * 380); vid.start = Date.now();
    const bar = document.querySelectorAll("#tl i")[vid.scene];
    vid.tick = setInterval(() => { bar.style.width = Math.min(100, (Date.now() - vid.start) / vid.dur * 100) + "%"; }, 120);
    let fin = false;
    const done = () => { if (fin || !vid.playing) return; fin = true; clearInterval(vid.tick); bar.style.width = "100%"; advance(); };
    if (synth && !vid.muted) {
      try {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(sc.say);
        const vs = synth.getVoices(); const v = vs.find(v => /en-IN/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang));
        if (v) u.voice = v;
        u.onend = done; u.onerror = () => { vid.timer = setTimeout(done, Math.max(0, vid.dur - (Date.now() - vid.start))); };
        synth.speak(u); vid.timer = setTimeout(done, vid.dur + 8000);
      } catch (e) { vid.timer = setTimeout(done, vid.dur); }
    } else vid.timer = setTimeout(done, vid.dur);
  }
  function advance() {
    vid.reached = Math.max(vid.reached, vid.scene + 1);
    if (vid.scene < m.scenes.length - 1) { showScene(vid.scene + 1); play(); }
    else { stopVideo(); vid.scene = 0; document.getElementById("play").textContent = "Replay"; watched = true; updateGate(); }
  }
}

/* ---------- exam (server-graded: the answer key never reaches the client) ---------- */
async function renderExam() {
  stage.innerHTML = `<article class="lesson"><h2>Final certification exam</h2><div class="meta">Loading your exam…</div></article>`;
  let session;
  try {
    session = await api.examStart();
  } catch (err) {
    stage.innerHTML = `<article class="lesson"><h2>Final certification exam</h2><div class="explain">${esc(err.message)}</div></article>`;
    return;
  }
  const examId = session.examId;
  const set = session.questions; // [{qi, q, o}] — no answer key

  stage.innerHTML = `<article class="lesson">
    <h2>Final certification exam</h2>
    <div class="meta">10 questions drawn from a 20-question bank · pass mark ${PASS}/10 · a fresh set on every attempt · graded on the server</div>
    <form id="exam" onsubmit="return false">
      ${set.map((q) => `<div class="q"><h3><span>${q.qi + 1}.</span>${esc(q.q)}</h3>
        ${q.o.map((o, oi) => `<label class="opt" data-q="${q.qi}" data-o="${oi}"><input type="radio" name="q${q.qi}" value="${oi}"><span>${esc(o)}</span></label>`).join("")}
        <div class="explain hidden" id="ex${q.qi}"></div></div>`).join("")}
    </form>
    <div id="result"></div>
    <div class="actions"><button class="btn" id="submit">Submit answers</button><span class="hint" id="ehint"></span></div>
  </article>`;
  const form = document.getElementById("exam"), btn = document.getElementById("submit");
  const count = () => { const n = set.filter((q) => form.querySelector(`input[name=q${q.qi}]:checked`)).length; btn.disabled = n < set.length; document.getElementById("ehint").textContent = n < set.length ? `${n} of ${set.length} answered.` : "All answered."; };
  form.addEventListener("change", count); count();
  btn.onclick = async () => {
    const answers = {};
    set.forEach((q) => { answers[q.qi] = +form.querySelector(`input[name=q${q.qi}]:checked`).value; });
    btn.disabled = true; btn.textContent = "Grading…";
    let result;
    try {
      result = await api.examSubmit({ examId, answers });
    } catch (err) {
      document.getElementById("ehint").textContent = err.message;
      btn.disabled = false; btn.textContent = "Submit answers";
      return;
    }
    result.perQuestion.forEach((r) => {
      form.querySelectorAll(`.opt[data-q="${r.qi}"]`).forEach(l => { const o = +l.dataset.o; l.classList.toggle("right", o === r.correctAnswer); l.classList.toggle("wrong", o === r.yourAnswer && r.yourAnswer !== r.correctAnswer); });
      const ex = document.getElementById("ex" + r.qi); ex.textContent = r.explanation; ex.classList.remove("hidden");
      form.querySelectorAll(`input[name=q${r.qi}]`).forEach(x => x.disabled = true);
    });
    state.examPassed = state.examPassed || result.passed;
    state.lastAttempt = { score: result.score, passed: result.passed };
    if (result.certificate) state.certificate = result.certificate;
    renderNav();
    document.getElementById("result").innerHTML = `<div class="q"><div class="score">${result.score}/10</div><p>${result.passed ? "You passed. Your Core5 certificate is ready." : `You need ${PASS} to pass. Review the explanations above, revisit the modules, and try a fresh set.`}</p></div>`;
    btn.textContent = result.passed ? "Get my certificate" : "Retake with new questions";
    btn.disabled = false;
    btn.onclick = () => result.passed ? go(CERT_IDX) : renderExam();
    document.getElementById("ehint").textContent = "";
    document.getElementById("result").scrollIntoView({ behavior: "smooth", block: "center" });
  };
}

/* ---------- certificate ---------- */
async function renderCert() {
  stage.innerHTML = `<article class="lesson"><h2>Your certificate</h2><div class="meta">Loading…</div></article>`;
  let cert;
  try {
    cert = (await api.getCertificate()).certificate;
  } catch (err) {
    stage.innerHTML = `<article class="lesson"><h2>Your certificate</h2><div class="explain">${esc(err.message)}</div></article>`;
    return;
  }
  state.certificate = cert;
  const d = new Date(cert.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const comps = ["Placement policy & planning", "Student readiness training", "Drive-day operations", "Multi-company slot management", "Conduct & fairness", "Student motivation & wellbeing", "Recruitment fraud awareness", "Placement analytics"];
  stage.innerHTML = `<article class="lesson">
    <h2>Your certificate</h2>
    <div class="meta">Enter your details exactly as they should appear.</div>
    <div class="cert-form">
      <label>Full name<input id="nm" value="${esc(cert.name_on_cert)}" placeholder="Dr. Priya Kulkarni"></label>
      <label>Institution<input id="in" value="${esc(cert.institution_on_cert)}" placeholder="Your college or university"></label>
    </div>
    <div class="cert" id="certificate">
      <div class="seal">CERTIFIED<br>PLACEMENT<br>CHAMPION</div>
      <div class="issuer"><div class="mark">C5</div>Core5 Systems and Services</div>
      <div class="kicker">This certifies that</div>
      <div class="name" id="cName">${esc(cert.name_on_cert) || "Your Name"}</div>
      <div class="body">of <b id="cInst">${esc(cert.institution_on_cert) || "Your Institution"}</b> has successfully completed the nine-module course and certification exam</div>
      <div class="course">Faculty Placement Champion</div>
      <div class="body">scoring ${cert.score}/10, and has demonstrated competence in:</div>
      <div class="comp">${comps.map(c => `<span>${c}</span>`).join("")}</div>
      <div class="foot">
        <div class="sig"><b>Core5 Academy</b>Core5 Systems and Services, Mumbai</div>
        <div><b>${d}</b>Date of issue</div>
        <div><b>${cert.id}</b>Certificate ID · verify at /verify.html?id=${encodeURIComponent(cert.id)}</div>
      </div>
    </div>
    <div class="actions"><button class="btn" id="print">Print or save as PDF</button><span class="hint" id="certHint">Choose "Save as PDF" in the print dialog.</span></div>
  </article>`;
  const nm = document.getElementById("nm"), inn = document.getElementById("in");
  let certSaveTimer = null;
  function saveCert() {
    clearTimeout(certSaveTimer);
    certSaveTimer = setTimeout(() => {
      api.putCertificate({ name: nm.value, institution: inn.value }).catch(e => {
        document.getElementById("certHint").textContent = e.message;
      });
    }, 400);
  }
  nm.oninput = () => { document.getElementById("cName").textContent = nm.value || "Your Name"; saveCert(); };
  inn.oninput = () => { document.getElementById("cInst").textContent = inn.value || "Your Institution"; saveCert(); };
  document.getElementById("print").onclick = () => window.print();
}
function esc(s) { return (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

/* ---------- admin: institute-wide faculty progress ---------- */
async function renderAdmin() {
  stage.innerHTML = `<article class="lesson"><h2>Faculty progress</h2><div class="meta">Loading…</div></article>`;
  let faculty;
  try {
    faculty = (await api.adminFaculty()).faculty;
  } catch (err) {
    stage.innerHTML = `<article class="lesson"><h2>Faculty progress</h2><div class="explain">${esc(err.message)}</div></article>`;
    return;
  }
  const rows = faculty.map(f => `<tr>
    <td>${esc(f.name)}<span class="s2">${esc(f.email)}</span></td>
    <td>${esc(f.institution) || "—"}</td>
    <td>${f.modulesDone} / ${f.moduleCount}</td>
    <td>${f.examAttempts ? `${f.bestScore}/10 (${f.examAttempts} attempt${f.examAttempts === 1 ? "" : "s"})` : "—"}</td>
    <td>${f.certificate ? `<span class="pill ok">${esc(f.certificate.id)}</span>` : "<span class=\"pill\">Not yet</span>"}</td>
  </tr>`).join("");
  stage.innerHTML = `<article class="lesson">
    <h2>Faculty progress</h2>
    <div class="meta">${faculty.length} faculty account${faculty.length === 1 ? "" : "s"} · admin view</div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Faculty</th><th>Institution</th><th>Modules</th><th>Best exam score</th><th>Certificate</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">No faculty accounts yet.</td></tr>'}</tbody>
      </table>
    </div>
  </article>`;
}

/* ---------- bootstrap ---------- */
async function loadAccountState() {
  const [progressRes, examRes] = await Promise.all([api.getProgress(), api.examStatus()]);
  state.user = progressRes.user;
  Object.assign(state, progressRes.progress);
  state.examPassed = !!(examRes.certificate || (examRes.lastAttempt && examRes.lastAttempt.passed));
  state.lastAttempt = examRes.lastAttempt;
  state.certificate = examRes.certificate;
}

async function boot() {
  if (!getToken()) {
    document.body.classList.add("pre-auth");
    const { user } = await renderAuth(stage);
    state.user = user;
  }
  try {
    await loadAccountState();
  } catch (err) {
    // token was invalid/expired — send back to the login screen
    setToken(null);
    return boot();
  }
  document.body.classList.remove("pre-auth");
  document.body.classList.add("started");
  renderAccount();
  if (synth && synth.onvoiceschanged !== undefined) synth.onvoiceschanged = () => {};
  if (!unlocked(state.current)) state.current = 0;
  render();
}

boot();
