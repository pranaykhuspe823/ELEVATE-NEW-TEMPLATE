import { api } from "./api.js";

function esc(s) { return (s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

const input = document.getElementById("certId");
const btn = document.getElementById("go");
const result = document.getElementById("result");

async function run() {
  const id = input.value.trim();
  if (!id) return;
  btn.disabled = true; btn.textContent = "Checking…";
  result.innerHTML = "";
  try {
    const data = await api.verifyCertificate(id);
    if (!data.valid) {
      result.innerHTML = `<div class="check"><p class="qtext">Not found</p><div class="explain">No certificate matches "${esc(id)}". Check the ID and try again.</div></div>`;
    } else {
      const date = new Date(data.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
      result.innerHTML = `<div class="check">
        <p class="qtext">Valid certificate</p>
        <div class="explain">
          <b>${esc(data.name)}</b>${data.institution ? " · " + esc(data.institution) : ""}<br>
          ${esc(data.course)} · scored ${data.score}/10<br>
          Issued ${date} by ${esc(data.issuer)}<br>
          Certificate ID: ${esc(data.id)}
        </div>
      </div>`;
    }
  } catch (err) {
    result.innerHTML = `<div class="explain">${esc(err.message)}</div>`;
  }
  btn.disabled = false; btn.textContent = "Verify";
}

btn.onclick = run;
input.addEventListener("keydown", (e) => { if (e.key === "Enter") run(); });

const qsId = new URLSearchParams(location.search).get("id");
if (qsId) { input.value = qsId; run(); }
