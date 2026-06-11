import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../../services/user/userAuthService";
import type { RegisterPayload, LoginPayload } from "../../services/user/userAuthService";

type Mode = "login" | "register";
interface FieldError { [key: string]: string }

function validateEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
function validatePhone(p: string): boolean {
  return /^\+?[\d\s\-(). ]{7,15}$/.test(p);
}

interface FieldProps {
  label: string; type: string; icon: string; value: string;
  error?: string; onChange: (v: string) => void; flex?: boolean;
}

function Field({ label, type, icon, value, error, onChange, flex }: FieldProps) {
  return (
    <div style={flex ? { flex: 1 } : {}}>
      <label style={S.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type} value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          style={{ ...S.input, ...(error ? S.inputErr : {}) }}
        />
        <i className={`ti ${icon}`} style={S.inpIcon} aria-hidden="true" />
      </div>
      {error && <p style={S.errText}>{error}</p>}
    </div>
  );
}

interface PwFieldProps {
  label: string; value: string; error?: string;
  onChange: (v: string) => void; flex?: boolean;
}

function PwField({ label, value, error, onChange, flex }: PwFieldProps) {
  const [show, setShow] = useState<boolean>(false);
  return (
    <div style={flex ? { flex: 1 } : {}}>
      <label style={S.label}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"} value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          style={{ ...S.input, ...(error ? S.inputErr : {}) }}
        />
        <button style={S.eyeBtn} onClick={() => setShow((p) => !p)} aria-label="Toggle password" type="button">
          <i className={show ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 16 }} />
        </button>
      </div>
      {error && <p style={S.errText}>{error}</p>}
    </div>
  );
}

export default function SignIn() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [lUser, setLUser] = useState<string>("");
  const [lPw, setLPw] = useState<string>("");
  const [fn, setFn] = useState<string>("");
  const [ln, setLn] = useState<string>("");
  const [rEmail, setREmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [rPw, setRPw] = useState<string>("");
  const [cpw, setCpw] = useState<string>("");
  const [errors, setErrors] = useState<FieldError>({});
  const [done, setDone] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string>("");

  function switchMode(): void {
    setMode((m) => (m === "login" ? "register" : "login"));
    setErrors({});
    setDone(false);
    setApiError("");
  }

  async function submitLogin(): Promise<void> {
    const e: FieldError = {};
    if (!lUser.trim()) e.lUser = "Username is required.";
    if (!lPw) e.lPw = "Password is required.";
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      setLoading(true);
      setApiError("");
      const payload: LoginPayload = { username: lUser, password: lPw };
      await authService.login(payload);
      setDone(true);
      // Navigate to dashboard after login
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (err: any) {
      setApiError(err?.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(): Promise<void> {
    const e: FieldError = {};
    if (!fn.trim()) e.fn = "Required.";
    if (!ln.trim()) e.ln = "Required.";
    if (!rEmail) e.rEmail = "Required.";
    else if (!validateEmail(rEmail)) e.rEmail = "Invalid email.";
    if (!phone) e.phone = "Required.";
    else if (!validatePhone(phone)) e.phone = "Invalid number.";
    if (!rPw) e.rPw = "Required.";
    else if (rPw.length < 8) e.rPw = "Min. 8 characters.";
    if (!cpw) e.cpw = "Required.";
    else if (rPw !== cpw) e.cpw = "Passwords do not match.";
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      setLoading(true);
      setApiError("");
      const payload: RegisterPayload = {
        firstName: fn,
        lastName: ln,
        email: rEmail,
        phone,
        password: rPw,
      };
      await authService.register(payload);
      setDone(true);
    } catch (err: any) {
      setApiError(err?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div style={S.wrap}>
      <div style={S.card}>

        {/* Blue panel */}
        <div style={S.panelBlue}>
          <div style={S.blueCircle1} />
          <div style={S.blueCircle2} />
          <p style={S.blueTitle}>{isLogin ? "Hello, Welcome!" : "Welcome Back!"}</p>
          <p style={S.blueSub}>{isLogin ? "Don't have an account?" : "Already have an account?"}</p>
          <button style={S.blueBtn} onClick={switchMode} type="button">
            {isLogin ? "Register" : "Login"}
          </button>
        </div>

        {/* Form panel */}
        <div style={S.panelForm}>
          {done ? (
            <div style={S.success}>
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#5b7cfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p style={S.succTitle}>{isLogin ? "Welcome back!" : "Account created!"}</p>
              <p style={S.succSub}>{isLogin ? "Redirecting to dashboard..." : "Your account has been registered."}</p>
              <button style={S.succBtn} type="button" onClick={() => { setDone(false); setErrors({}); setApiError(""); }}>Back</button>
            </div>
          ) : isLogin ? (
            <>
              <p style={S.formTitle}>Login</p>
              <div style={S.form}>
                <Field label="Username" type="text" icon="ti-user" value={lUser} error={errors.lUser} onChange={setLUser} />
                <PwField label="Password" value={lPw} error={errors.lPw} onChange={setLPw} />
                {apiError && <p style={S.apiErr}>{apiError}</p>}
                <button style={S.forgot} type="button" onClick={() => navigate("/forgot-password")}>Forgot password?</button>
                <button style={{ ...S.submit, opacity: loading ? 0.7 : 1 }} type="button" onClick={submitLogin} disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </button>
                <div style={S.divider}>
                  <div style={S.divLine} />
                  <span style={S.divText}>or login with social platforms</span>
                  <div style={S.divLine} />
                </div>
                <div style={S.socials}>
                  {["G", "f", "⊕", "in"].map((s) => (
                    <button key={s} style={S.socBtn} type="button">{s}</button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <p style={S.formTitle}>Registration</p>
              <div style={S.form}>
                <div style={S.row}>
                  <Field label="First Name" type="text" icon="ti-user" value={fn} error={errors.fn} onChange={setFn} flex />
                  <Field label="Last Name" type="text" icon="ti-user" value={ln} error={errors.ln} onChange={setLn} flex />
                </div>
                <div style={S.row}>
                  <Field label="Email" type="email" icon="ti-mail" value={rEmail} error={errors.rEmail} onChange={setREmail} flex />
                  <Field label="Phone" type="tel" icon="ti-phone" value={phone} error={errors.phone} onChange={setPhone} flex />
                </div>
                <div style={S.row}>
                  <PwField label="Password" value={rPw} error={errors.rPw} onChange={setRPw} flex />
                  <PwField label="Confirm Password" value={cpw} error={errors.cpw} onChange={setCpw} flex />
                </div>
                {apiError && <p style={S.apiErr}>{apiError}</p>}
                <button style={{ ...S.submit, opacity: loading ? 0.7 : 1 }} type="button" onClick={submitRegister} disabled={loading}>
                  {loading ? "Registering..." : "Register"}
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

const BLUE = "#5b7cfa";

const S: Record<string, React.CSSProperties> = {
  wrap: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#eef2ff", padding: "32px 16px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" },
  card: { display: "flex", width: "100%", maxWidth: 720, minHeight: 460, borderRadius: 24, overflow: "hidden", boxShadow: "0 12px 48px rgba(80,100,220,.18)" },
  panelBlue: { background: BLUE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", width: "42%", textAlign: "center", flexShrink: 0, position: "relative", overflow: "hidden" },
  blueCircle1: { position: "absolute", top: -60, right: -60, width: 180, height: 180, background: "rgba(255,255,255,.10)", borderRadius: "50%" },
  blueCircle2: { position: "absolute", bottom: -50, left: -50, width: 160, height: 160, background: "rgba(255,255,255,.08)", borderRadius: "50%" },
  blueTitle: { fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, position: "relative", zIndex: 1 },
  blueSub: { fontSize: 13, color: "rgba(255,255,255,.8)", marginBottom: 24, position: "relative", zIndex: 1 },
  blueBtn: { border: "2px solid #fff", background: "transparent", color: "#fff", padding: "9px 28px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", position: "relative", zIndex: 1 },
  panelForm: { background: "#fff", flex: 1, padding: "36px 32px", display: "flex", flexDirection: "column", justifyContent: "center" },
  formTitle: { fontSize: 22, fontWeight: 800, color: "#1a1a2e", marginBottom: 20, textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  row: { display: "flex", gap: 10 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5 },
  input: { width: "100%", padding: "9px 36px 9px 12px", border: "1.5px solid #e0e4ef", borderRadius: 10, fontSize: 13, color: "#1a1a2e", outline: "none", background: "#f7f9ff", fontFamily: "inherit", boxSizing: "border-box" as const },
  inputErr: { borderColor: "#ef4444", background: "#fff5f5" },
  inpIcon: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#aab0cc", fontSize: 16, pointerEvents: "none" as const },
  eyeBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aab0cc", padding: 0, display: "flex", alignItems: "center" },
  errText: { fontSize: 11, color: "#ef4444", marginTop: 3 },
  apiErr: { fontSize: 12, color: "#ef4444", textAlign: "center", background: "#fff5f5", padding: "8px 12px", borderRadius: 8, border: "1px solid #fecaca" },
  forgot: { background: "none", border: "none", cursor: "pointer", fontSize: 12, color: BLUE, fontWeight: 500, padding: 0, fontFamily: "inherit", alignSelf: "flex-end", marginTop: -6 },
  submit: { width: "100%", padding: 11, background: BLUE, color: "#fff", border: "none", borderRadius: 20, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 2 },
  divider: { display: "flex", alignItems: "center", gap: 10, margin: "4px 0" },
  divLine: { flex: 1, height: 1, background: "#e0e4ef" },
  divText: { fontSize: 11, color: "#aab0cc", whiteSpace: "nowrap" as const },
  socials: { display: "flex", justifyContent: "center", gap: 10 },
  socBtn: { width: 36, height: 36, border: "1.5px solid #e0e4ef", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", cursor: "pointer", fontSize: 13, color: "#555", fontWeight: 700, fontFamily: "inherit" },
  success: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "10px 0", textAlign: "center" },
  succTitle: { fontSize: 18, fontWeight: 800, color: "#1a1a2e" },
  succSub: { fontSize: 13, color: "#888" },
  succBtn: { marginTop: 8, padding: "9px 26px", background: BLUE, color: "#fff", border: "none", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
};