# Vercel-Deploy — Strava-Proxy

> Ziel: Den `STRAVA_CLIENT_SECRET` aus dem Browser-Code entfernen und stattdessen über zwei serverseitige Endpoints (`/api/strava-token`, `/api/strava-refresh`) auf Vercel laufen lassen.

Geschätzte Zeit: **5–10 Min**, davon ca. 2 Min Account-Setup.

---

## Schritt 0 — Voraussetzungen

- [x] Vercel-Account vorhanden? Falls nein: https://vercel.com/signup → **„Continue with GitHub"** → `mroewert`-Account auswählen → bestätigen
- [x] Neuer Strava `client_secret` rotiert? (Strava-Dashboard → „Neue Clientschlüssel generieren")
- [x] Code-Stand: alle Änderungen sind in `my-training-main/` lokal, aber noch **nicht** gepusht

---

## Schritt 1 — Push der Code-Änderungen

Wir pushen den umgebauten Code zuerst, damit Vercel ihn importieren kann. **Wichtig:** der Push enthält keine Secrets — die hardcoded-Werte sind raus.

In PowerShell im Repo:

```powershell
cd "g:\Meine Ablage\Michael\KI\Trainingsplaner\my-training-main"
git status
git add .gitignore api/ js/strava.js js/intervals.js
git commit -m "security: move Strava client_secret to Vercel proxy, remove hardcoded intervals API key"
git push origin main
```

Bestätige kurz, dass `git status` keine `secrets.local.md` oder ähnliches anzeigt.

---

## Schritt 2 — Vercel-Projekt anlegen

1. Login auf https://vercel.com/dashboard
2. Klick **„Add New…"** → **„Project"**
3. Wähle das GitHub-Repo `mroewert/my-training` aus der Liste (ggf. „Configure GitHub App" → Zugriff erlauben)
4. **„Import"** klicken
5. Im Konfig-Screen:
   - **Project Name:** `my-training-strava-proxy` (oder dein Wunschname — merke dir die finale URL)
   - **Framework Preset:** *Other* (Vercel erkennt /api/ automatisch)
   - **Root Directory:** *unverändert lassen* (= Repo-Root)
   - **Build Command:** *leer lassen*
   - **Output Directory:** *leer lassen*
6. **Environment Variables** aufklappen und zwei Einträge hinzufügen:

   | Name | Value |
   |---|---|
   | `STRAVA_CLIENT_ID` | `193172` |
   | `STRAVA_CLIENT_SECRET` | (dein neuer rotierter Wert) |

   Beide bei **Environments** auf alle drei Häkchen lassen (Production, Preview, Development).

7. **„Deploy"** klicken
8. Warten (~30 Sek). Erfolg = grüner „Visit"-Button mit URL wie `https://my-training-strava-proxy.vercel.app`

---

## Schritt 3 — Test der Endpoints

Im Browser oder PowerShell prüfen, dass die Functions live sind:

```powershell
curl -X POST https://my-training-strava-proxy.vercel.app/api/strava-refresh `
  -H "Content-Type: application/json" `
  -d '{\"refresh_token\":\"test\"}'
```

Erwartete Antwort: HTTP 400 von Strava (Token ist Müll) — **das ist gut**, heißt der Proxy lebt und ruft Strava korrekt auf. Etwas wie:

```json
{"message":"Bad Request","errors":[{"resource":"RefreshToken","field":"","code":"invalid"}]}
```

Wenn stattdessen `Server misconfigured` kommt: ENV-Vars fehlen → Vercel-Dashboard → Project → Settings → Environment Variables → prüfen → Redeploy.

---

## Schritt 4 — Echte URL in den App-Code eintragen

Sag mir die Vercel-URL (z.B. `https://my-training-strava-proxy.vercel.app`). Ich update die Konstante `STRAVA_PROXY_BASE` in `js/strava.js` (Zeile 8) und committe das.

Falls du die URL selbst eintragen willst:
- [js/strava.js:8](js/strava.js#L8) → `STRAVA_PROXY_BASE` durch deine Vercel-URL ersetzen
- Cache-Bust hochzählen in [index.html](index.html) (alle `?v=N` für `strava.js`)
- `git commit` + `git push`

---

## Schritt 5 — End-to-End-Test

1. https://mroewert.github.io/my-training/ öffnen, Hard-Reload (Ctrl+Shift+R)
2. Mehr-Tab → **„Strava trennen"** (alte Tokens platt machen)
3. **„Mit Strava verbinden"** → Strava-OAuth-Flow → zurück zur App
4. Erwartet: Alert „Strava erfolgreich verbunden!"
5. DevTools → Network-Tab → bei Reconnect sollte ein POST an `*.vercel.app/api/strava-token` zu sehen sein, nicht direkt an `strava.com/oauth/token`
6. intervals.icu: Mehr-Tab → API-Key (neu rotiert) + Athlete-ID `i408428` eintragen → Verbinden
7. „Alles synchronisieren" testen

---

## Schritt 6 — Aufräumen (optional, niedrige Prio)

Die alten Secrets stehen noch in der **Git-History** (39 Commits). Nach dem Rotieren sind sie wertlos, aber falls du sie auch da entfernen willst:

```powershell
# Vorher Backup!
git clone --mirror https://github.com/mroewert/my-training my-training-backup.git

# Mit git-filter-repo
pip install git-filter-repo
git filter-repo --replace-text replacements.txt
# replacements.txt enthält:
#   10ab0ddd492c66638cea82a80777e95db020c401==>***REMOVED***
#   ml7h9q0345twveucvc8apodj==>***REMOVED***

git push --force origin main
```

**Konsequenz:** Force-Push, alle Klone werden inkonsistent. Bei einem Solo-Repo nicht weiter schlimm. Forks bleiben unbeeinflusst (die müssten eigene Cleanups machen — kannst du nicht steuern).

Wie gesagt: niedrige Prio, weil rotiert = tot.

---

## Troubleshooting

| Symptom | Wahrscheinlich | Fix |
|---|---|---|
| `CORS error` im Browser | Origin nicht in Allow-List | `api/strava-*.js` → `ALLOWED_ORIGINS` ergänzen |
| `500 Server misconfigured` | ENV-Var fehlt | Vercel → Settings → Env Vars → prüfen, Redeploy |
| `Bad Request` von Strava | refresh_token kompromittiert/abgelaufen | Strava trennen + neu verbinden |
| OAuth-Redirect bricht ab | `redirect_uri` mismatch | Strava-Dashboard → App-Settings → `https://mroewert.github.io/my-training/` als Authorization Callback Domain eintragen |
| Vercel-Function timeout | sehr selten | Hobby-Plan: 10 s Limit reicht — Strava-API ist deutlich schneller |
