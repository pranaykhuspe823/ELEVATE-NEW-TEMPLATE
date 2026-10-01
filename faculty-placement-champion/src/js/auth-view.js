import { api, setToken } from "./api.js";

// Renders a one-step "start the course" form into `stageEl`: name, email,
// institution — no password. The name entered is what prints on the
// certificate later. A returning email resumes that person's progress.
// Resolves with {token, user} once they submit.
export function renderAuth(stageEl) {
  return new Promise((resolve) => {
    stageEl.innerHTML = `
    <article class="lesson auth-card">
      <h2>Start the course</h2>
      <div class="meta">Tell us who you are, then jump straight in. The name you enter here is what appears on your certificate.</div>
      <form id="authForm" class="cert-form" onsubmit="return false">
        <label>Full name<input id="fName" placeholder="Dr. Priya Kulkarni" autocomplete="name"></label>
        <label>Email<input id="fEmail" type="email" placeholder="you@institute.edu" autocomplete="email"></label>
        <label>Institution / college<input id="fInst" placeholder="Your college or university" autocomplete="organization"></label>
      </form>
      <div class="explain" id="authMsg" role="alert"></div>
      <div class="actions">
        <button class="btn" id="authSubmit">Start the course</button>
        <span class="hint">Already started? Enter the same email to pick up where you left off.</span>
      </div>
    </article>`;

    const submitBtn = document.getElementById("authSubmit");
    const msg = document.getElementById("authMsg");
    const submit = async () => {
      const name = document.getElementById("fName").value.trim();
      const email = document.getElementById("fEmail").value.trim();
      const institution = document.getElementById("fInst").value.trim();
      msg.textContent = "";
      submitBtn.disabled = true;
      submitBtn.textContent = "Starting…";
      try {
        const result = await api.start({ name, email, institution });
        setToken(result.token);
        resolve(result);
      } catch (err) {
        msg.textContent = err.message;
        submitBtn.disabled = false;
        submitBtn.textContent = "Start the course";
      }
    };
    submitBtn.onclick = submit;
    stageEl.querySelectorAll("#authForm input").forEach((el) => el.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); }));
    document.getElementById("fName").focus();
  });
}
